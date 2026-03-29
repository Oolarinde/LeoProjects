#!/bin/bash
set -e

DOCKER="/Applications/Docker.app/Contents/Resources/bin/docker"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== TAL Accounting AIS — Setup Script ==="
echo ""

# 1. Start DB
echo ">>> Starting PostgreSQL..."
cd "$PROJECT_DIR"
$DOCKER compose up -d db
echo ">>> Waiting for Postgres to be ready..."
for i in $(seq 1 20); do
  if $DOCKER compose exec -T db pg_isready -U postgres >/dev/null 2>&1; then
    echo ">>> PostgreSQL is ready."
    break
  fi
  sleep 2
done

# 2. Run migrations
echo ""
echo ">>> Running Alembic migrations..."
cd "$PROJECT_DIR/backend"
source venv/bin/activate
alembic upgrade head
echo ">>> Migrations complete."

# 3. Start API
echo ""
echo ">>> Starting FastAPI backend on :8000 ..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
API_PID=$!
echo ">>> API started (PID $API_PID)"

echo ""
echo "========================================"
echo " Setup complete!"
echo " API:      http://localhost:8000"
echo " API docs: http://localhost:8000/docs"
echo ""
echo " Start frontend in a new terminal:"
echo "   cd $PROJECT_DIR/frontend"
echo "   npm install && npm run dev"
echo "========================================"
