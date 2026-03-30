#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  echo "Stopping services..."
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null
  wait 2>/dev/null
  echo "Done."
}
trap cleanup EXIT INT TERM

echo "=== Starting Backend (Spring Boot) ==="
cd "$ROOT_DIR/backend"
./gradlew bootRun --quiet &
BACKEND_PID=$!

echo "=== Starting Frontend (Next.js) ==="
cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Backend:  http://localhost:8080"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both services."

wait
