#!/bin/bash
set -e

PI_USER=pi
PI_HOST=192.168.31.248
PI_DIR=/home/pi/trippla

echo "=== Deploying Trippla to Raspberry Pi ($PI_HOST) ==="

# 1. Sync project files
# 3. Prepare HDD directory and build on Pi
echo ""
echo "[3/3] Building and starting containers (first build may take 15-30 min on Pi)..."
ssh ${PI_USER}@${PI_HOST} "
  cd ${PI_DIR}

  # Load env to get HDD_PATH
  source .env

  # Create data directory on HDD
  if [ ! -d \"\$HDD_PATH\" ]; then
    echo 'WARNING: HDD_PATH=\$HDD_PATH does not exist. Is the drive mounted?'
    exit 1
  fi
  sudo mkdir -p \"\$HDD_PATH/trippla/postgres\"

  # Build and start
  docker compose up --build -d
"

echo ""
echo "=== Deploy complete! ==="
echo "App: http://${PI_HOST}:3017"
echo ""
echo "Useful commands:"
echo "  Logs:    ssh ${PI_USER}@${PI_HOST} 'cd ${PI_DIR} && docker compose logs -f'"
echo "  Stop:    ssh ${PI_USER}@${PI_HOST} 'cd ${PI_DIR} && docker compose down'"
echo "  Restart: ssh ${PI_USER}@${PI_HOST} 'cd ${PI_DIR} && docker compose restart'"
