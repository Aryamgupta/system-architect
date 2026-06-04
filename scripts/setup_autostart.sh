#!/bin/bash
# Setup Autostart for System Architect Live Wallpaper

WORK_DIR="/home/aryam/Documents/system-architect"
AUTOSTART_DIR="$HOME/.config/autostart"

echo "[+] Creating autostart directory if it doesn't exist..."
mkdir -p "$AUTOSTART_DIR"

echo "[+] Generating autostart desktop entry at $AUTOSTART_DIR/system-architect-client.desktop..."
cat << EOF > "$AUTOSTART_DIR/system-architect-client.desktop"
[Desktop Entry]
Type=Application
Exec=$WORK_DIR/backend/venv/bin/python $WORK_DIR/scripts/webview_wrapper.py
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Name=System Architect Wallpaper Client
Comment=Start System Architect Live Wallpaper GUI Client at startup
Icon=preferences-desktop-wallpaper
EOF

chmod +x "$AUTOSTART_DIR/system-architect-client.desktop"

echo "[+] Autostart configuration complete!"
echo "[+] The live wallpaper client will now start automatically when you log in."
