#!/usr/bin/env bash

set -euo pipefail

APP_NAME="surveillance-main-server-frontend"
REQUIRED_NODE_MAJOR=20
REQUIRED_NODE_MINOR=9
PORT="${PORT:-3000}"
LOG_DIR="${LOG_DIR:-./logs}"
PID_FILE="${PID_FILE:-./.next-start.pid}"
LOG_FILE="${LOG_FILE:-$LOG_DIR/nohup.log}"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install Node.js ${REQUIRED_NODE_MAJOR}.${REQUIRED_NODE_MINOR}+ and retry."
  exit 1
fi

NODE_VERSION_RAW="$(node -v)"
NODE_VERSION="${NODE_VERSION_RAW#v}"
NODE_MAJOR="${NODE_VERSION%%.*}"
NODE_REMAINDER="${NODE_VERSION#*.}"
NODE_MINOR="${NODE_REMAINDER%%.*}"

if (( NODE_MAJOR < REQUIRED_NODE_MAJOR )) || (( NODE_MAJOR == REQUIRED_NODE_MAJOR && NODE_MINOR < REQUIRED_NODE_MINOR )); then
  echo "Node.js ${REQUIRED_NODE_MAJOR}.${REQUIRED_NODE_MINOR}+ is required, but found ${NODE_VERSION_RAW}."
  echo "Install a newer Node.js version on the server, then run this script again."
  exit 1
fi

mkdir -p "$LOG_DIR"

echo "Installing dependencies..."
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

echo "Building application..."
npm run build

if [[ -f "$PID_FILE" ]]; then
  OLD_PID="$(cat "$PID_FILE")"
  if ps -p "$OLD_PID" >/dev/null 2>&1; then
    echo "Stopping existing process $OLD_PID..."
    kill "$OLD_PID"
    sleep 2
  fi
  rm -f "$PID_FILE"
fi

echo "Starting $APP_NAME on port $PORT..."
nohup npx next start -p "$PORT" >>"$LOG_FILE" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" >"$PID_FILE"

echo "Started with PID $NEW_PID"
echo "Log file: $LOG_FILE"
