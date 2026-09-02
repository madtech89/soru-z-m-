<?php
/**
 * HedefMatik Backend Diagnostic Tool
 * Bu dosyayi public_html/diag.php olarak yukleyin, tarayicida acin, sonra silin.
 */
header('Content-Type: application/json; charset=utf-8');

$results = [];
$results['php_version'] = PHP_VERSION;
$results['curl_loaded'] = extension_loaded('curl');
$results['curl_version'] = function_exists('curl_version') ? curl_version()['version'] : 'N/A';
$results['getallheaders_exists'] = function_exists('getallheaders');

// Backend test port 8005
$ch = curl_init('http://127.0.0.1:8005/api/exams');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
$resp = curl_exec($ch);
$err = curl_error($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
$results['backend_8005'] = ['reachable' => $resp !== false, 'http_code' => $code, 'error' => $err];

// Backend test port 8001
$ch = curl_init('http://127.0.0.1:8001/api/exams');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
$resp = curl_exec($ch);
$err = curl_error($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
$results['backend_8001'] = ['reachable' => $resp !== false, 'http_code' => $code, 'error' => $err];

$results['uvicorn_running'] = trim(shell_exec('pgrep -f uvicorn 2>/dev/null') ?? '') !== '';
$results['python_running'] = trim(shell_exec('pgrep -f "python.*server" 2>/dev/null') ?? '') !== '';

$backend_dir = '/home/u341740237/hedefmatik_backend';
$results['backend_dir_exists'] = is_dir($backend_dir);
$results['backend_venv_exists'] = file_exists($backend_dir . '/venv/bin/python3');
$results['backend_env_exists'] = file_exists($backend_dir . '/.env');
$results['backend_server_exists'] = file_exists($backend_dir . '/server.py');

$results['disk_free_gb'] = round(disk_free_space('/') / 1024 / 1024 / 1024, 2);

echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
