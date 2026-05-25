#!/bin/bash
set -euo pipefail

echo "==> Starting Redis..."
systemctl start redis
systemctl enable redis

echo "==> Starting Daphne..."
systemctl start daphne

echo "==> Starting Nginx..."
systemctl start nginx
systemctl enable nginx

echo ""
echo "==> Service status:"
systemctl is-active redis   && echo "  Redis:  running" || echo "  Redis:  FAILED"
systemctl is-active daphne  && echo "  Daphne: running" || echo "  Daphne: FAILED"
systemctl is-active nginx   && echo "  Nginx:  running" || echo "  Nginx:  FAILED"

echo ""
echo "==> Logs (last 20 lines each):"
echo "--- Daphne ---"
journalctl -u daphne -n 20 --no-pager
