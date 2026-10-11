#!/bin/bash
set -e

echo "=========================================================="
echo "🚀 Starting TaskPulse AI - Full Stack Microservices System"
echo "=========================================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Trap Ctrl+C to kill all background processes
cleanup() {
  echo ""
  echo "🛑 Stopping all services..."
  kill $(jobs -p) 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 1. Start Python AI Service (Port 5001)
echo "🤖 [1/3] Starting Python AI Service on http://localhost:5001..."
cd "$ROOT_DIR/ai-service"
./venv/bin/python run.py &
AI_PID=$!

# Wait for AI service to be responsive
sleep 2

# 2. Start Node.js Backend Core (Port 3001)
echo "⚡ [2/3] Starting Node.js Backend Core on http://localhost:3001..."
cd "$ROOT_DIR/backend-core"
npm run dev &
BACKEND_PID=$!

# Wait for backend to initialize
sleep 2

# 3. Start Next.js Frontend (Port 3000)
echo "🎨 [3/3] Starting Next.js Frontend on http://localhost:3000..."
cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=========================================================="
echo "🎉 All services are LIVE!"
echo "👉 Frontend App:     http://localhost:3000"
echo "👉 Backend Core API: http://localhost:3001"
echo "👉 AI Microservice:  http://localhost:5001"
echo "=========================================================="
echo "Press Ctrl+C to stop all services."
echo ""

wait
