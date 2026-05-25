#!/bin/bash
set -euo pipefail

# =============================================================================
# Klifurmot — Production Setup Script
# Run once on a fresh server
# =============================================================================

APP_DIR="/var/www/klifurmot"
BACKEND_DIR="$APP_DIR/klifurmot-backend"
FRONTEND_DIR="$APP_DIR/klifurmot-frontend"
REPO="https://github.com/solonthorberg/klifurmot.git"

echo "==> [1/8] Cloning repo..."
mkdir -p /var/www
git clone "$REPO" "$APP_DIR"

echo "==> [2/8] Installing system dependencies..."
apt update -q
apt install -y python3-pip python3-venv python3-dev libpq-dev certbot python3-certbot-nginx

echo "==> [3/8] Setting up Python virtual environment..."
cd "$BACKEND_DIR"
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "==> [4/8] Running Django migrations..."
doppler run --project klifurmot --config prd_backend -- python manage.py migrate --noinput

echo "==> [5/8] Collecting static files..."
doppler run --project klifurmot --config prd_backend -- python manage.py collectstatic --noinput

echo "==> [6/8] Installing frontend dependencies and building..."
cd "$FRONTEND_DIR"
npm install
npm run build

echo "==> [7/8] Setting up Daphne as a systemd service..."
cat > /etc/systemd/system/daphne.service << EOF
[Unit]
Description=Klifurmot Daphne ASGI Server
After=network.target

[Service]
WorkingDirectory=$BACKEND_DIR
ExecStart=$(which doppler) run --project klifurmot --config prd_backend -- $BACKEND_DIR/venv/bin/daphne -b 127.0.0.1 -p 8000 klifurmot.asgi:application
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable daphne

echo "==> [8/8] Configuring Nginx..."
cat > /etc/nginx/sites-available/klifurmot << 'EOF'
server {
    listen 80;
    server_name klifurmot.is www.klifurmot.is;

    # Frontend — serve built React app
    location / {
        root /var/www/klifurmot/klifurmot-frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Django admin
    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # Static files served by whitenoise via Django
    location /static/ {
        proxy_pass http://127.0.0.1:8000;
    }
}
EOF

ln -sf /etc/nginx/sites-available/klifurmot /etc/nginx/sites-enabled/klifurmot
rm -f /etc/nginx/sites-enabled/default
nginx -t

echo ""
echo "============================================"
echo " Setup complete!"
echo ""
echo " Next steps:"
echo "   1. Run start.sh to start all services"
echo "   2. Run: certbot --nginx -d klifurmot.is -d www.klifurmot.is"
echo "   3. Create a superuser:"
echo "      cd $BACKEND_DIR && source venv/bin/activate"
echo "      doppler run --project klifurmot --config prd_backend -- python manage.py createsuperuser"
echo "============================================"
