#!/bin/bash
set -e

echo "============================================"
echo "  SAP SoD Audit System - Backend Starting"
echo "============================================"

# Run seed script to ensure users exist
echo "[INFO] Running database seed..."
python quick_seed.py || echo "[WARN] Seed script had issues, continuing..."

echo "[INFO] Starting uvicorn server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
