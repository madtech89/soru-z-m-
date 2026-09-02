<?php
/**
 * HedefMatik High-Performance API Gateway with Auto-Healing for Hostinger LiteSpeed
 * Bridges incoming /api/* and /uploads/* requests to local FastAPI backend at port 8005.
 */

// Handle CORS Preflight
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS");
    header("Access-Control-Allow-Headers: Authorization, Content-Type, Accept, X-Requested-With");
    header("Access-Control-Max-Age: 86400");
    http_response_code(200);
    exit();
}

set_time_limit(180);
$backend_host = 'http://127.0.0.1:8005';
$uri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/api/';
$target_url = $backend_host . $uri;

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';
$headers = [];

if (function_exists('getallheaders')) {
    foreach (getallheaders() as $name => $value) {
        $lower = strtolower($name);
        if ($lower !== 'host' && $lower !== 'content-length') {
            $headers[] = "$name: $value";
        }
    }
} else {
    foreach ($_SERVER as $name => $value) {
        if (substr($name, 0, 5) == 'HTTP_') {
            $header_name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
            if (strtolower($header_name) !== 'host' && strtolower($header_name) !== 'content-length') {
                $headers[] = "$header_name: $value";
            }
        }
    }
}

$body = file_get_contents('php://input');

function execute_request($url, $method, $headers, $body) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 180);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);

    if ($method !== 'GET' && $method !== 'HEAD' && !empty($body)) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }

    $response = curl_exec($ch);
    $error = curl_error($ch);
    $header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [$response, $error, $header_size, $http_code];
}

list($response, $error, $header_size, $http_code) = execute_request($target_url, $method, $headers, $body);

// Auto-Healing: If backend is down, attempt to start it if exec() is allowed by host
if ($response === false || $http_code === 0) {
    $backend_dir = '/home/u341740237/hedefmatik_backend';
    $python_exec = $backend_dir . '/venv/bin/python3.11';
    
    if (function_exists('exec') && file_exists($python_exec)) {
        $cmd = "cd $backend_dir && nohup $python_exec -m uvicorn server:app --host 127.0.0.1 --port 8005 > $backend_dir/uvicorn.log 2>&1 < /dev/null &";
        @exec($cmd);
        usleep(2500000); // Wait 2.5s for clean startup
        list($response, $error, $header_size, $http_code) = execute_request($target_url, $method, $headers, $body);
    }
}

if ($response === false || $http_code === 0) {
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS");
    header("Access-Control-Allow-Headers: Authorization, Content-Type, Accept, X-Requested-With");
    echo json_encode([
        'detail' => 'Backend servisi başlatılıyor, lütfen 3 saniye sonra tekrar deneyin.'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

$res_headers = substr($response, 0, $header_size);
$res_body = substr($response, $header_size);

// Forward status code
http_response_code($http_code);

// Forward headers
$header_lines = explode("\r\n", $res_headers);
foreach ($header_lines as $header) {
    if (empty($header)) continue;
    $lower = strtolower($header);
    if (strpos($lower, 'transfer-encoding:') === 0) continue;
    if (strpos($lower, 'connection:') === 0) continue;
    if (strpos($lower, 'http/') === 0) continue;
    header($header, false);
}

// Ensure CORS header is present
header("Access-Control-Allow-Origin: *", false);

echo $res_body;
