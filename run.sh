#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [[ ! -d node_modules ]]; then
  echo "Missing node_modules. Run 'npm install' first."
  exit 1
fi

if [[ ! -x .venv/bin/python ]]; then
  echo "Missing .venv/bin/python. Create the virtual environment first."
  exit 1
fi

frontend_pid=""
backend_pid=""

cleanup() {
  local exit_code=$?

  if [[ -n "$frontend_pid" ]] && kill -0 "$frontend_pid" 2>/dev/null; then
    kill "$frontend_pid" 2>/dev/null || true
  fi

  if [[ -n "$backend_pid" ]] && kill -0 "$backend_pid" 2>/dev/null; then
    kill "$backend_pid" 2>/dev/null || true
  fi

  wait 2>/dev/null || true
  exit "$exit_code"
}

trap cleanup EXIT INT TERM

echo "Starting Next.js frontend on http://localhost:3000"
npm run dev &
frontend_pid=$!

echo "Starting FastAPI backend on http://127.0.0.1:8000"
.venv/bin/python -m uvicorn api.index:app --reload --host 127.0.0.1 --port 8000 &
backend_pid=$!

wait