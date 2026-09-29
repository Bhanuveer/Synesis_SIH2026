#!/usr/bin/env bash
# SYNESIS eRTMAC-NWIS — one-shot setup + run for macOS/Linux.
set -e

cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv .venv
fi
source .venv/bin/activate

echo "Installing backend dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

echo "Seeding demo data..."
python scripts/seed_data.py

echo "Training risk model (skips if models/risk_model.pkl already exists and is up to date)..."
python scripts/train_model.py

echo "Generating demo PDF documents..."
python scripts/generate_demo_documents.py

if [ ! -d "frontend/node_modules" ]; then
  echo "Installing frontend dependencies..."
  (cd frontend && npm install)
fi

echo "Starting backend on http://127.0.0.1:8000 ..."
(cd backend && uvicorn app.main:app --port 8000 &)
BACKEND_PID=$!

sleep 2
echo "Starting frontend on http://127.0.0.1:5173 ..."
(cd frontend && npm run dev)
