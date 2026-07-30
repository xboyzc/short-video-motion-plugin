#!/bin/zsh

set -u

SCRIPT_DIR="${0:A:h}"
PROJECT_DIR="${SCRIPT_DIR:h}"
RUNTIME_DIR="$PROJECT_DIR/.local-runtime"
PID_FILE="$RUNTIME_DIR/server.pid"
PORT_FILE="$RUNTIME_DIR/server.port"
SERVER_HOST="127.0.0.1"

SERVER_PID="$(/bin/cat "$PID_FILE" 2>/dev/null || true)"
SERVER_PORT="$(/bin/cat "$PORT_FILE" 2>/dev/null || true)"

if [[ -n "$SERVER_PORT" ]] && /usr/bin/curl -fsS --max-time 1 "http://$SERVER_HOST:$SERVER_PORT/api/health" 2>/dev/null | /usr/bin/grep -q "motion-playground-export-server"; then
  LISTENER_PID="$(/usr/sbin/lsof -nP -t -iTCP:"$SERVER_PORT" -sTCP:LISTEN 2>/dev/null | /usr/bin/head -n 1)"
  if [[ -n "$LISTENER_PID" ]]; then
    SERVER_PID="$LISTENER_PID"
  fi
fi

if [[ -n "$SERVER_PID" ]] && /bin/kill -0 "$SERVER_PID" 2>/dev/null; then
  /bin/kill "$SERVER_PID" 2>/dev/null || true
  print -r -- "本地服务已停止。"
else
  print -r -- "没有发现正在运行的本地服务。"
fi

/bin/rm -f "$PID_FILE" "$PORT_FILE"
