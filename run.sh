#!/usr/bin/env bash
set -e
PORT=${PORT:-5050}
HOST=${HOST:-0.0.0.0}
echo "==> Server on http://$HOST:$PORT"
npm install
node -e "console.log('Node', process.version)"
npm run dev
