#!/usr/bin/env python3
import sys
import os
import argparse
import time

# Fix for WebKit2GTK rendering issues (blank screens / WebGL failure) on Linux
os.environ["WEBKIT_DISABLE_DMABUF_RENDERER"] = "1"
os.environ["PYWEBVIEW_GUI"] = "gtk"

def setup_gtk_wallpaper(window):
    """
    GTK window manager configurations to set the window as a desktop wallpaper.
    """
    try:
        # Import GTK and Gdk using PyGObject
        import gi
        gi.require_version('Gtk', '3.0')
        from gi.repository import Gtk, Gdk, GLib
        
        # Get the GTK Window instance from pywebview
        gtk_window = window.native
        if not gtk_window:
            print("[-] GTK Window handle not ready yet.")
            return

        print("[+] Customizing GTK Window for Desktop Wallpaper Integration...")

        def apply_hints():
            try:
                # 1. Stay behind all other windows (keep_below)
                gtk_window.set_keep_below(True)

                # 2. Hide from the taskbar and workspace switcher pager
                gtk_window.set_skip_taskbar_hint(True)
                gtk_window.set_skip_pager_hint(True)

                # 3. Stick to all workspaces/desktops
                gtk_window.stick()

                # 4. Set type hint to UTILITY (sits above background image, but below other apps)
                gtk_window.set_type_hint(Gdk.WindowTypeHint.UTILITY)

                # 5. Disable window decorations
                gtk_window.set_decorated(False)
                
                # 6. Disable keyboard/mouse window focus
                gtk_window.set_accept_focus(False)
                gtk_window.set_focus_on_map(False)

                # 7. Disable window manager window operations (MOVE, RESIZE, MAXIMIZE)
                gdk_win = gtk_window.get_window()
                if gdk_win:
                    try:
                        gdk_win.set_functions(
                            Gdk.WMFunction.ALL & 
                            ~Gdk.WMFunction.MOVE & 
                            ~Gdk.WMFunction.RESIZE & 
                            ~Gdk.WMFunction.MAXIMIZE
                        )
                        print("[+] GDK window functions (un-movable/un-resizable) set.")
                    except Exception as ex:
                        print(f"[-] Could not set GDK window functions: {ex}")

                    # 8. Set empty input shape to make the window completely click-through (X11 only)
                    try:
                        import cairo
                        region = cairo.Region()
                        gdk_win.input_shape_combine_region(region, 0, 0)
                        print("[+] Click-through (cairo input shape mask) applied successfully.")
                    except Exception as ex:
                        print(f"[-] Could not apply click-through input shape mask: {ex}")

                print("[+] GTK window adjustments applied successfully on GUI thread.")
            except Exception as e:
                print(f"[-] Error applying GTK hints on GUI thread: {e}")
            return False # Return False so it doesn't repeat

        # Dispatch to GTK main thread
        GLib.idle_add(apply_hints)
    except Exception as e:
        print(f"[-] Could not apply GTK wallpaper hints: {e}")
        print("[-] Wallpaper will run in standard borderless fullscreen mode.")

def main():
    try:
        import webview
        # Detect connected screen monitors dynamically
        screens = webview.screens
        primary_screen = screens[0]
        detected_width = primary_screen.width
        detected_height = primary_screen.height
        print(f"[+] Screen resolution detected automatically: {detected_width}x{detected_height}")
    except Exception:
        detected_width = 1920
        detected_height = 1080

    parser = argparse.ArgumentParser(description="System Architect Live Wallpaper Client Wrapper")
    parser.add_argument("--url", default="http://127.0.0.1:8000", help="URL of the web wallpaper (default: http://127.0.0.1:8000)")
    parser.add_argument("--fullscreen", action="store_true", help="Launch in fullscreen mode")
    parser.add_argument("--width", type=int, default=detected_width, help=f"Window width (default: {detected_width})")
    parser.add_argument("--height", type=int, default=detected_height, help=f"Window height (default: {detected_height})")
    args = parser.parse_args()

    try:
        import webview
    except ImportError:
        print("[-] pywebview is not installed. Install it via: pip install pywebview")
        sys.exit(1)

    print(f"[+] Starting Wallpaper Client loading: {args.url}")

    # Create the borderless window
    window = webview.create_window(
        title="System Architect Wallpaper",
        url=args.url,
        width=args.width,
        height=args.height,
        frameless=True,
        resizable=False,
        fullscreen=args.fullscreen,
        background_color='#0B0C10'
    )

    # Apply GTK wallpaper modifications on startup
    # We delay the callback slightly to ensure the window has been realized
    def on_shown():
        time.sleep(0.5)
        setup_gtk_wallpaper(window)

    window.events.shown += on_shown

    # Start the webview loop (uses GTK/WebKit2 on Linux)
    webview.start(gui="gtk")

if __name__ == "__main__":
    main()
