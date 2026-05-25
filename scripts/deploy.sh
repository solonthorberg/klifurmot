#!/bin/bash
set -euo pipefail

# =============================================================================
# Klifurmot — Deploy Script
# Handles both first-time start and updates
# Usage:
#   ./deploy.sh          — pull latest, migrate, rebuild frontend, restart
#   ./deploy.sh --start  — just start all services without pulling
# =============================================================================

APP_DIR="/var/www/klifurmot"
BACKEND_DIR="$APP_DIR/klifurmot-backend"
FRONTEND_DIR="$APP_DIR/klifurmot-frontend"
DOPPLER="doppler run --project klifurmot --config prd_backend --"

START_ONLY=false
if [[ "${1:-}" == "--start" ]]; then
    START_ONLY=true
fi

if [ "$START_ONLY" = false ]; then
    echo "==> [1/5] Pulling latest code..."
    cd "$APP_DIR"
    git pull origin main

    echo "==> [2/5] Installing/updating Python dependencies..."
    cd "$BACKEND_DIR"
    source venv/bin/activate
    pip install -r requirements.txt --quiet

    echo "==> [3/5] Running migrations..."
    $DOPPLER python manage.py migrate --noinput

    echo "==> [4/5] Collecting static files..."
    $DOPPLER python manage.py collectstatic --noinput

    echo "==> [5/5] Building frontend..."
    cd "$FRONTEND_DIR"
    doppler secrets download --project klifurmot --config prd_frontend --format env --no-file > /var/www/klifurmot/.env.production
    npm install --silent
    npm run build
fi

echo "==> Starting / restarting services..."
systemctl start redis
systemctl enable redis

systemctl restart daphne

systemctl restart nginx
systemctl enable nginx

echo ""
echo "==> Service status:"
systemctl is-active redis   && echo "  Redis:  running" || echo "  Redis:  FAILED"
systemctl is-active daphne  && echo "  Daphne: running" || echo "  Daphne: FAILED"
systemctl is-active nginx   && echo "  Nginx:  running" || echo "  Nginx:  FAILED"

echo ""
echo "==> Daphne logs (last 20 lines):"
journalctl -u daphne -n 20 --no-pager
