#!/usr/bin/env bash
# System Architect Wallpaper Installer
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0;0m'

echo -e "${BLUE}=== System Architect Live Wallpaper Installer ===${NC}"

# Get the absolute directory of the project
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "[+] Project Root: ${GREEN}$PROJECT_ROOT${NC}"

# Check for Python 3
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[-] python3 is not installed. Please install it first.${NC}"
    exit 1
fi

# Check for Node.js and NPM
if ! command -v npm &> /dev/null; then
    echo -e "${RED}[-] npm/node is not installed. Please install it first to build the frontend.${NC}"
    exit 1
fi

# 1. Create Python virtual environment
echo -e "[+] Setting up isolated Python virtual environment in backend/venv..."
cd "$PROJECT_ROOT"
python3 -m venv --system-site-packages backend/venv

# Activate venv and install dependencies
echo -e "[+] Installing backend Python dependencies..."
backend/venv/bin/pip install --upgrade pip
backend/venv/bin/pip install -r backend/requirements.txt

# 2. Build Frontend
echo -e "[+] Installing frontend Node packages..."
cd "$PROJECT_ROOT/frontend"
npm install

echo -e "[+] Building production frontend assets..."
npm run build

# 3. Create Systemd user directory if it doesn't exist
SYSTEMD_USER_DIR="$HOME/.config/systemd/user"
mkdir -p "$SYSTEMD_USER_DIR"

# 4. Template the Systemd Service
echo -e "[+] Templating systemd user service..."
SERVICE_FILE="$SYSTEMD_USER_DIR/system-architect-wallpaper.service"
TEMPLATE_FILE="$PROJECT_ROOT/scripts/system-architect-wallpaper.service"
PYTHON_BIN="$PROJECT_ROOT/backend/venv/bin/python"

# Read template and replace tokens
sed -e "s|{{WORKING_DIR}}|${PROJECT_ROOT}|g" \
    -e "s|{{PYTHON_PATH}}|${PYTHON_BIN}|g" \
    "$TEMPLATE_FILE" > "$SERVICE_FILE"

# 5. Make webview wrapper executable
chmod +x "$PROJECT_ROOT/scripts/webview_wrapper.py"

# 6. Enable and Start Backend Service
echo -e "[+] Enabling and starting the telemetry backend systemd user service..."
systemctl --user daemon-reload
systemctl --user enable system-architect-wallpaper.service
systemctl --user restart system-architect-wallpaper.service

# 7. Add nexus.core to /etc/hosts (requires sudo) so the dashboard is reachable at http://nexus.core:9190
HOSTS_LINE="127.0.0.1 nexus.core"
if ! grep -qF "$HOSTS_LINE" /etc/hosts 2>/dev/null; then
    echo -e "[+] Adding ${GREEN}nexus.core${NC} → 127.0.0.1 to /etc/hosts (requires sudo)..."
    echo "$HOSTS_LINE" | sudo tee -a /etc/hosts > /dev/null
    echo -e "[+] ${GREEN}nexus.core${NC} registered."
else
    echo -e "[+] ${GREEN}nexus.core${NC} already present in /etc/hosts, skipping."
fi

echo -e "${GREEN}=== Installation Completed Successfully! ===${NC}"
echo -e "Telemetry backend is running on:"
echo -e "  ${BLUE}http://127.0.0.1:9190${NC}  (direct)"
echo -e "  ${BLUE}http://nexus.core:9190${NC}  (local domain)"
echo -e "Check service logs with: ${BLUE}journalctl --user -u system-architect-wallpaper.service -f${NC}"
echo -e ""
echo -e "To launch the live wallpaper dashboard on your desktop, run:"
echo -e "  ${BLUE}python3 scripts/webview_wrapper.py --fullscreen${NC}"
echo -e ""
echo -e "For development, you can start the hot-reloading frontend dev server:"
echo -e "  cd frontend && npm run dev"
echo -e "And direct your wallpaper wrapper there:"
echo -e "  python3 scripts/webview_wrapper.py --url http://localhost:5173"
