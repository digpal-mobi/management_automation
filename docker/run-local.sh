#!/bin/bash
set -e

echo "========================================================"
echo " Starting TaskPulse Containers locally on Mac"
echo "========================================================"

# Stop any running instances
docker rm -f ai-service backend-core 2>/dev/null || true

# Run AI Service
echo "[1/2] Starting AI Service on port 5001..."
docker run -d \
  --name ai-service \
  --platform linux/amd64 \
  -p 5001:5001 \
  --env-file docker/.env.local \
  -e PORT=5001 \
  ai-service:latest

# Run Backend Core
echo "[2/2] Starting Backend Core on port 3001..."
docker run -d \
  --name backend-core \
  --platform linux/amd64 \
  -p 3001:3001 \
  --env-file docker/.env.local \
  -e PORT=3001 \
  backend-core:latest

echo ""
echo "Waiting 3 seconds for services to initialize..."
sleep 3

echo ""
echo "--- AI Service Health Check (http://localhost:5001/health) ---"
curl -s http://localhost:5001/health || echo "Failed to connect to AI Service"

echo ""
echo ""
echo "--- Backend Core Health Check (http://localhost:3001/api/health) ---"
curl -s http://localhost:3001/api/health || echo "Failed to connect to Backend Core"

echo ""
echo ""
echo "🎉 Both containers are running successfully!"
echo "To view logs:"
echo "  docker logs -f ai-service"
echo "  docker logs -f backend-core"
echo ""
echo "To stop them:"
echo "  docker stop ai-service backend-core"
