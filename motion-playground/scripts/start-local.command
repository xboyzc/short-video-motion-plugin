#!/bin/zsh

set -u

SCRIPT_DIR="${0:A:h}"
PROJECT_DIR="${SCRIPT_DIR:h}"
DIST_DIR="$PROJECT_DIR/dist"
RUNTIME_DIR="$PROJECT_DIR/.local-runtime"
PORT_FILE="$RUNTIME_DIR/server.port"
PID_FILE="$RUNTIME_DIR/server.pid"
LOG_FILE="$RUNTIME_DIR/server.log"
SERVER_HOST="127.0.0.1"
SERVER_SCRIPT="$PROJECT_DIR/scripts/local_server.py"
EXPORTS_DIR="$PROJECT_DIR/exports"

show_error() {
  local error_message="$1"
  /usr/bin/osascript -e "display dialog \"$error_message\" buttons {\"知道了\"} default button 1 with icon stop" >/dev/null 2>&1 || true
  print -r -- "$error_message"
}

is_motion_server() {
  local check_port="$1"
  /usr/bin/curl -fsS --max-time 1 "http://$SERVER_HOST:$check_port/api/health" 2>/dev/null | /usr/bin/grep -q "motion-playground-export-server"
}

if [[ ! -f "$DIST_DIR/index.html" ]]; then
  show_error "没有找到可运行的网页文件。请先在项目目录执行 pnpm build。"
  exit 1
fi

if [[ ! -f "$SERVER_SCRIPT" ]]; then
  show_error "没有找到本地导出服务脚本：$SERVER_SCRIPT"
  exit 1
fi

/bin/mkdir -p "$RUNTIME_DIR" "$EXPORTS_DIR"

if [[ -f "$PORT_FILE" ]]; then
  SAVED_PORT="$(/bin/cat "$PORT_FILE" 2>/dev/null || true)"
  if [[ -n "$SAVED_PORT" ]] && is_motion_server "$SAVED_PORT"; then
    RUNNING_PID="$(/usr/sbin/lsof -nP -t -iTCP:"$SAVED_PORT" -sTCP:LISTEN 2>/dev/null | /usr/bin/head -n 1)"
    if [[ -n "$RUNNING_PID" ]]; then
      print -r -- "$RUNNING_PID" > "$PID_FILE"
    fi
    SERVER_URL="http://$SERVER_HOST:$SAVED_PORT/"
    print -r -- "动效卡片编辑台已在运行：$SERVER_URL"
    /usr/bin/open "$SERVER_URL"
    exit 0
  fi
fi

for EXISTING_PORT in {4173..4183}; do
  if is_motion_server "$EXISTING_PORT"; then
    RUNNING_PID="$(/usr/sbin/lsof -nP -t -iTCP:"$EXISTING_PORT" -sTCP:LISTEN 2>/dev/null | /usr/bin/head -n 1)"
    [[ -n "$RUNNING_PID" ]] && print -r -- "$RUNNING_PID" > "$PID_FILE"
    print -r -- "$EXISTING_PORT" > "$PORT_FILE"
    SERVER_URL="http://$SERVER_HOST:$EXISTING_PORT/"
    print -r -- "动效卡片编辑台已在运行：$SERVER_URL"
    /usr/bin/open "$SERVER_URL"
    exit 0
  fi
done

SERVER_PORT=""
for PORT_CANDIDATE in {4173..4183}; do
  if ! /usr/sbin/lsof -nP -iTCP:"$PORT_CANDIDATE" -sTCP:LISTEN >/dev/null 2>&1; then
    SERVER_PORT="$PORT_CANDIDATE"
    break
  fi
done

if [[ -z "$SERVER_PORT" ]]; then
  show_error "4173–4183 端口均被占用，无法启动本地网页。"
  exit 1
fi

print -r -- "正在启动动效卡片编辑台……"
/usr/bin/nohup /usr/bin/python3 "$SERVER_SCRIPT" --host "$SERVER_HOST" --port "$SERVER_PORT" --directory "$DIST_DIR" --exports "$EXPORTS_DIR" > "$LOG_FILE" 2>&1 < /dev/null &
SERVER_PID=$!
print -r -- "$SERVER_PID" > "$PID_FILE"
print -r -- "$SERVER_PORT" > "$PORT_FILE"
disown "$SERVER_PID" 2>/dev/null || true

SERVER_READY=false
for START_TRY in {1..30}; do
  if is_motion_server "$SERVER_PORT"; then
    SERVER_READY=true
    break
  fi
  /bin/sleep 0.2
done

if [[ "$SERVER_READY" != true ]]; then
  show_error "本地网页启动失败。日志位置：$LOG_FILE"
  exit 1
fi

SERVER_URL="http://$SERVER_HOST:$SERVER_PORT/"
print -r -- "启动成功：$SERVER_URL"
/usr/bin/open "$SERVER_URL"
/usr/bin/osascript -e 'display notification "浏览器已打开，可以开始使用" with title "动效卡片编辑台"' >/dev/null 2>&1 || true
