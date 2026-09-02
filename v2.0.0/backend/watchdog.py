#!/usr/bin/env python3
"""
HedefMatik 24/7 Watchdog Supervisor
Monitors Uvicorn on 127.0.0.1:8005.
Completely detached daemon, immune to terminal closing and SSH disconnects.
"""
import os
import sys
import time
import socket
import signal
import subprocess
import logging

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
VENV_PYTHON = os.path.join(BACKEND_DIR, "venv", "bin", "python3.11")
if not os.path.exists(VENV_PYTHON):
    VENV_PYTHON = sys.executable

PID_FILE = os.path.join(BACKEND_DIR, "watchdog.pid")
LOG_FILE = os.path.join(BACKEND_DIR, "watchdog.log")

# Ignore SIGHUP so closing SSH/terminal will never kill watchdog
try:
    signal.signal(signal.SIGHUP, signal.SIG_IGN)
except Exception:
    pass

logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


def is_port_open(host="127.0.0.1", port=8005, timeout=2):
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception:
        return False


def start_uvicorn():
    logging.info("⚡ Starting Uvicorn on 127.0.0.1:8005...")
    uvicorn_log_path = os.path.join(BACKEND_DIR, "uvicorn.log")
    
    # Truncate uvicorn log if it grows past 15MB
    if os.path.exists(uvicorn_log_path) and os.path.getsize(uvicorn_log_path) > 15 * 1024 * 1024:
        try:
            with open(uvicorn_log_path, "w") as f:
                f.write(f"--- Log rotated at {time.ctime()} ---\n")
        except Exception:
            pass

    uvicorn_log = open(uvicorn_log_path, "a")
    proc = subprocess.Popen(
        [VENV_PYTHON, "-m", "uvicorn", "server:app", "--host", "127.0.0.1", "--port", "8005"],
        cwd=BACKEND_DIR,
        stdout=uvicorn_log,
        stderr=subprocess.STDOUT,
        start_new_session=True,
    )
    logging.info(f"✅ Uvicorn started with PID {proc.pid}")
    return proc


def check_singleton():
    """Ensure only one watchdog process runs at a time."""
    if os.path.exists(PID_FILE):
        try:
            with open(PID_FILE, "r") as f:
                old_pid = int(f.read().strip())
            # Check if process is still alive
            os.kill(old_pid, 0)
            # Still running!
            print(f"Watchdog is already running with PID {old_pid}. Exiting.")
            sys.exit(0)
        except (OSError, ValueError):
            # Dead process or corrupt PID file
            pass

    # Write current PID
    with open(PID_FILE, "w") as f:
        f.write(str(os.getpid()))


def cleanup_pid():
    if os.path.exists(PID_FILE):
        try:
            os.remove(PID_FILE)
        except Exception:
            pass


def main():
    check_singleton()
    logging.info(f"🚀 HedefMatik 24/7 Watchdog Supervisor started with PID {os.getpid()}.")

    try:
        while True:
            try:
                if not is_port_open("127.0.0.1", 8005):
                    logging.warning("⚠️ Port 8005 not responding. Reviving Uvicorn...")
                    start_uvicorn()
                    time.sleep(5)  # Allow Uvicorn to bind port
            except Exception as e:
                logging.error(f"Watchdog loop error: {e}")

            time.sleep(5)
    finally:
        cleanup_pid()


if __name__ == "__main__":
    main()
