#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════╗
# ║       System Architect — Management Script               ║
# ║                                                          ║
# ║  Usage:  ./scripts/manage.sh <command>                   ║
# ║                                                          ║
# ║  Commands:                                               ║
# ║    start      Start the backend service + webview        ║
# ║    stop       Stop the backend service + kill webview    ║
# ║    restart    Restart the backend service                 ║
# ║    status     Show backend + webview process status      ║
# ║    logs       Stream live backend journal logs           ║
# ║    uninstall  Remove everything from the system          ║
# ╚══════════════════════════════════════════════════════════╝

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVICE_NAME="system-architect-wallpaper.service"
SERVICE_FILE="$HOME/.config/systemd/user/$SERVICE_NAME"
AUTOSTART_FILE="$HOME/.config/autostart/system-architect-client.desktop"
PYTHON_BIN="$PROJECT_ROOT/backend/venv/bin/python"
WRAPPER="$PROJECT_ROOT/scripts/webview_wrapper.py"
HOSTS_LINE="127.0.0.1 system-architect"
PORT=9190

# ── Helpers ───────────────────────────────────────────────────────────────────
info()    { echo -e "${CYAN}[•]${NC} $*"; }
ok()      { echo -e "${GREEN}[✓]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
err()     { echo -e "${RED}[✗]${NC} $*"; }
section() { echo -e "\n${BOLD}${BLUE}── $* ──${NC}"; }

confirm() {
    echo -e "${YELLOW}${BOLD}$1${NC} [y/N] " && read -r ans
    [[ "${ans,,}" == "y" ]]
}

# ── Command: start ────────────────────────────────────────────────────────────
cmd_start() {
    section "Starting System Architect"

    if systemctl --user is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        warn "Backend service is already running."
    else
        info "Starting backend systemd service..."
        systemctl --user start "$SERVICE_NAME"
        ok "Backend started → http://system-architect:$PORT  |  http://localhost:$PORT"
    fi

    # Brief wait for backend to be ready before launching webview
    info "Waiting for backend to respond on :$PORT..."
    for i in $(seq 1 15); do
        if curl -sf "http://127.0.0.1:$PORT/" > /dev/null 2>&1; then
            ok "Backend is ready."
            break
        fi
        sleep 1
    done

    if pgrep -f "webview_wrapper.py" > /dev/null 2>&1; then
        warn "Webview is already running (PID: $(pgrep -f webview_wrapper.py))."
    else
        info "Launching desktop webview wallpaper..."
        nohup "$PYTHON_BIN" "$WRAPPER" > /tmp/system-architect-webview.log 2>&1 &
        ok "Webview launched (PID: $!). Log: /tmp/system-architect-webview.log"
    fi
}

# ── Command: stop ─────────────────────────────────────────────────────────────
cmd_stop() {
    section "Stopping System Architect"

    # Kill webview process
    if pgrep -f "webview_wrapper.py" > /dev/null 2>&1; then
        info "Killing webview process..."
        pkill -f "webview_wrapper.py" && ok "Webview stopped." || warn "Could not kill webview."
    else
        warn "Webview is not running."
    fi

    # Stop backend service
    if systemctl --user is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        info "Stopping backend service..."
        systemctl --user stop "$SERVICE_NAME"
        ok "Backend service stopped."
    else
        warn "Backend service is not running."
    fi
}

# ── Command: restart ──────────────────────────────────────────────────────────
cmd_restart() {
    section "Restarting System Architect"

    info "Restarting backend service..."
    systemctl --user daemon-reload
    systemctl --user restart "$SERVICE_NAME"
    ok "Backend restarted."

    # Restart webview
    if pgrep -f "webview_wrapper.py" > /dev/null 2>&1; then
        info "Restarting webview..."
        pkill -f "webview_wrapper.py" || true
        sleep 1
    fi

    info "Waiting for backend on :$PORT..."
    for i in $(seq 1 15); do
        if curl -sf "http://127.0.0.1:$PORT/" > /dev/null 2>&1; then
            ok "Backend is ready."
            break
        fi
        sleep 1
    done

    nohup "$PYTHON_BIN" "$WRAPPER" > /tmp/system-architect-webview.log 2>&1 &
    ok "Webview relaunched (PID: $!)"

    echo ""
    ok "System Architect restarted successfully."
    echo -e "   Dashboard: ${CYAN}http://system-architect:$PORT${NC}  |  ${CYAN}http://localhost:$PORT${NC}"
}

# ── Command: status ───────────────────────────────────────────────────────────
cmd_status() {
    section "System Architect Status"

    # Backend service
    echo -e "\n${BOLD}Backend Service${NC}"
    if systemctl --user is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        ok "system-architect-wallpaper.service  →  ${GREEN}RUNNING${NC}"
        uptime_str=$(systemctl --user show "$SERVICE_NAME" --property=ActiveEnterTimestamp \
            | cut -d= -f2)
        echo -e "   Since: $uptime_str"
    else
        err "system-architect-wallpaper.service  →  ${RED}STOPPED${NC}"
    fi

    # HTTP reachability
    echo -e "\n${BOLD}HTTP / WebSocket${NC}"
    if curl -sf "http://127.0.0.1:$PORT/" > /dev/null 2>&1; then
        ok "http://127.0.0.1:$PORT          →  ${GREEN}REACHABLE${NC}"
    else
        err "http://127.0.0.1:$PORT          →  ${RED}UNREACHABLE${NC}"
    fi
    if curl -sf "http://system-architect:$PORT/" > /dev/null 2>&1; then
        ok "http://system-architect:$PORT        →  ${GREEN}REACHABLE${NC}"
    else
        warn "http://system-architect:$PORT        →  not reachable (hosts entry missing?)"
    fi

    # Webview process
    echo -e "\n${BOLD}Webview Process${NC}"
    WV_PID=$(pgrep -f "webview_wrapper.py" 2>/dev/null || echo "")
    if [[ -n "$WV_PID" ]]; then
        ok "webview_wrapper.py  →  ${GREEN}RUNNING${NC}  (PID: $WV_PID)"
    else
        warn "webview_wrapper.py  →  not running (wallpaper mode not active)"
    fi

    # /etc/hosts
    echo -e "\n${BOLD}Local Domain${NC}"
    if grep -qF "$HOSTS_LINE" /etc/hosts 2>/dev/null; then
        ok "system-architect  →  ${GREEN}registered in /etc/hosts${NC}"
    else
        warn "system-architect  →  NOT in /etc/hosts (run: echo '$HOSTS_LINE' | sudo tee -a /etc/hosts)"
    fi

    # Autostart
    echo -e "\n${BOLD}Autostart (on login)${NC}"
    if [[ -f "$AUTOSTART_FILE" ]]; then
        ok "GNOME autostart entry  →  ${GREEN}exists${NC}"
    else
        warn "GNOME autostart entry  →  not set (run scripts/setup_autostart.sh)"
    fi

    echo ""
}

# ── Command: logs ─────────────────────────────────────────────────────────────
cmd_logs() {
    section "System Architect Backend Logs  (Ctrl+C to exit)"
    journalctl --user -u "$SERVICE_NAME" -f --no-hostname --output=short-iso
}

# ── Command: uninstall ────────────────────────────────────────────────────────
cmd_uninstall() {
    section "Uninstalling System Architect"

    echo -e "${RED}${BOLD}"
    echo "  This will remove:"
    echo "    • The systemd backend service"
    echo "    • The GNOME autostart desktop entry"
    echo "    • The system-architect entry from /etc/hosts"
    echo "    • backend/venv/ (Python virtualenv)"
    echo "    • frontend/dist/ (compiled assets)"
    echo "    • frontend/node_modules/ (npm packages)"
    echo -e "${NC}"

    confirm "Proceed with uninstall?" || { echo "Aborted."; exit 0; }

    # 1. Kill webview
    echo ""
    info "Stopping webview process..."
    pkill -f "webview_wrapper.py" 2>/dev/null && ok "Webview killed." || warn "Webview was not running."

    # 2. Stop + disable + remove systemd service
    info "Disabling and removing backend systemd service..."
    systemctl --user stop "$SERVICE_NAME"    2>/dev/null || true
    systemctl --user disable "$SERVICE_NAME" 2>/dev/null || true
    if [[ -f "$SERVICE_FILE" ]]; then
        rm -f "$SERVICE_FILE"
        ok "Removed $SERVICE_FILE"
    fi
    systemctl --user daemon-reload
    ok "Systemd service removed."

    # 3. Remove GNOME autostart entry
    info "Removing GNOME autostart entry..."
    if [[ -f "$AUTOSTART_FILE" ]]; then
        rm -f "$AUTOSTART_FILE"
        ok "Removed $AUTOSTART_FILE"
    else
        warn "Autostart entry not found, skipping."
    fi

    # 4. Remove system-architect from /etc/hosts
    info "Removing system-architect from /etc/hosts (requires sudo)..."
    if grep -qF "$HOSTS_LINE" /etc/hosts 2>/dev/null; then
        sudo sed -i "\|$HOSTS_LINE|d" /etc/hosts
        ok "Removed '$HOSTS_LINE' from /etc/hosts."
    else
        warn "system-architect was not in /etc/hosts, skipping."
    fi

    # 5. Remove Python venv
    info "Removing backend/venv/..."
    if [[ -d "$PROJECT_ROOT/backend/venv" ]]; then
        rm -rf "$PROJECT_ROOT/backend/venv"
        ok "backend/venv/ removed."
    else
        warn "backend/venv/ not found, skipping."
    fi

    # 6. Remove compiled frontend
    info "Removing frontend/dist/..."
    if [[ -d "$PROJECT_ROOT/frontend/dist" ]]; then
        rm -rf "$PROJECT_ROOT/frontend/dist"
        ok "frontend/dist/ removed."
    else
        warn "frontend/dist/ not found, skipping."
    fi

    # 7. Remove node_modules
    info "Removing frontend/node_modules/..."
    if [[ -d "$PROJECT_ROOT/frontend/node_modules" ]]; then
        rm -rf "$PROJECT_ROOT/frontend/node_modules"
        ok "frontend/node_modules/ removed."
    else
        warn "frontend/node_modules/ not found, skipping."
    fi

    # 8. Optional: remove entire project
    echo ""
    if confirm "Also delete the entire project directory ($PROJECT_ROOT)?"; then
        info "Removing project directory..."
        rm -rf "$PROJECT_ROOT"
        ok "Project directory removed. System Architect is fully uninstalled."
    else
        ok "Project source files kept at: $PROJECT_ROOT"
        info "To reinstall later, run: ./scripts/install.sh"
    fi

    echo ""
    echo -e "${GREEN}${BOLD}=== System Architect uninstalled successfully ===${NC}"
}

# ── Entry point ───────────────────────────────────────────────────────────────
COMMAND="${1:-help}"

case "$COMMAND" in
    start)     cmd_start     ;;
    stop)      cmd_stop      ;;
    restart)   cmd_restart   ;;
    status)    cmd_status    ;;
    logs)      cmd_logs      ;;
    uninstall) cmd_uninstall ;;
    *)
        echo -e "${BOLD}System Architect Management Script${NC}"
        echo ""
        echo -e "  Usage: ${CYAN}./scripts/manage.sh <command>${NC}"
        echo ""
        echo "  Commands:"
        echo -e "    ${GREEN}start${NC}      Start backend service and desktop wallpaper"
        echo -e "    ${GREEN}stop${NC}       Stop backend service and kill wallpaper"
        echo -e "    ${GREEN}restart${NC}    Restart backend service and wallpaper"
        echo -e "    ${GREEN}status${NC}     Show backend, webview, domain, and autostart status"
        echo -e "    ${GREEN}logs${NC}       Stream live backend service logs"
        echo -e "    ${RED}uninstall${NC}  Remove all System Architect components from this system"
        echo ""
        ;;
esac
