#!/usr/bin/env bash

set -euo pipefail

# ==============================
# Load NVM (safe for CI shells)
# ==============================
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

if ! command -v nvm >/dev/null 2>&1; then
  echo "❌ NVM not found. Install it first."
  exit 1
fi

# Ensure Node 20 is installed & used
nvm install 20 >/dev/null
nvm use 20 >/dev/null

# ==============================
# App Config
# ==============================
APP_NAME="surveillance-main-server-frontend"
PORT="${PORT:-3000}"
LOG_DIR="${LOG_DIR:-./logs}"
PID_FILE="${PID_FILE:-./.next-start.pid}"
LOG_FILE="${LOG_FILE:-$LOG_DIR/nohup.log}"

mkdir -p "$LOG_DIR"

echo "🚀 Deploying $APP_NAME..."

# ==============================
# Install Dependencies
# ==============================
echo "📦 Installing dependencies..."
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

# ==============================
# Build
# ==============================
echo "🏗️ Building application..."
npm run build

# ==============================
# Stop old process
# ==============================
if [[ -f "$PID_FILE" ]]; then
  OLD_PID="$(cat "$PID_FILE")"
  if ps -p "$OLD_PID" >/dev/null 2>&1; then
    echo "🛑 Stopping old process ($OLD_PID)..."
    kill "$OLD_PID"
    sleep 2
  fi
  rm -f "$PID_FILE"
fi

# ==============================
# Start new process
# ==============================
echo "▶️ Starting app on port $PORT..."

nohup node_modules/.bin/next start -p "$PORT" >>"$LOG_FILE" 2>&1 &

NEW_PID=$!
echo "$NEW_PID" >"$PID_FILE"

echo "✅ Started with PID $NEW_PID"
echo "📄 Logs: $LOG_FILE"