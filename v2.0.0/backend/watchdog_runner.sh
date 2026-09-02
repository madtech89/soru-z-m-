#!/usr/bin/env bash
# HedefMatik Watchdog Runner (Detached 24/7 background starter)
DIR="/home/u341740237/hedefmatik_backend"
cd "$DIR" || exit 1

# Check if watchdog is already alive
if [ -f "$DIR/watchdog.pid" ]; then
    PID=$(cat "$DIR/watchdog.pid")
    if kill -0 "$PID" 2>/dev/null; then
        exit 0
    fi
fi

# Not running, start watchdog detached with setsid
/usr/bin/setsid "$DIR/venv/bin/python3.11" "$DIR/watchdog.py" > /dev/null 2>&1 < /dev/null &
exit 0
