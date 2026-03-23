#!/bin/bash
set -e

echo "=== AkhmadPay Deploy ==="

# Pull latest code
echo ">> Pulling latest code..."
git pull origin main

# Build and restart
echo ">> Building Docker image..."
docker compose build

echo ">> Restarting container..."
docker compose up -d

echo ">> Cleaning old images..."
docker image prune -f

echo ""
echo "=== Deploy complete ==="
echo "App running at http://localhost:3000"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f        # View logs"
echo "  docker compose restart         # Restart"
echo "  docker compose down            # Stop"
echo "  docker compose up -d --build   # Rebuild & start"
