#!/usr/bin/env python3
"""
System Architect – Live Wallpaper Client Wrapper
-------------------------------------------------
Uses PyWebView (WebKit2GTK) to render the React dashboard as a native
desktop wallpaper on Linux (GNOME / X11).

Strategy
--------
Rather than override_redirect or X11 reparenting (both fragile under Mutter),
we set the EWMH property  _NET_WM_WINDOW_TYPE  to  _NET_WM_WINDOW_TYPE_DESKTOP.
This is the standard, WM-supported way to tell any EWMH-compliant window
manager (Mutter, KWin, Openbox…) to permanently place the window below all
other windows, never list it in Alt-Tab, and never minimise it on Show-Desktop.

Result: every app you open will appear on top; the wallpaper stays behind.
"""

import sys
import os
import argparse
import time
import ctypes

# ── WebKit2GTK rendering fixes ──────────────────────────────────────────────
os.environ["WEBKIT_DISABLE_DMABUF_RENDERER"] = "1"   # prevents blank/WebGL bugs
os.environ["PYWEBVIEW_GUI"] = "gtk"


# ── X11 / EWMH helpers ──────────────────────────────────────────────────────

def _load_x11():
    """Load libX11 and set up the ctypes signatures we need."""
    x11 = ctypes.CDLL("libX11.so.6")

    x11.XOpenDisplay.restype  = ctypes.c_void_p
    x11.XOpenDisplay.argtypes = [ctypes.c_char_p]

    x11.XDefaultRootWindow.restype  = ctypes.c_ulong
    x11.XDefaultRootWindow.argtypes = [ctypes.c_void_p]

    x11.XInternAtom.restype  = ctypes.c_ulong
    x11.XInternAtom.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_int]

    x11.XChangeProperty.restype  = ctypes.c_int
    x11.XChangeProperty.argtypes = [
        ctypes.c_void_p,   # display
        ctypes.c_ulong,    # window
        ctypes.c_ulong,    # property atom
        ctypes.c_ulong,    # type atom
        ctypes.c_int,      # format (32)
        ctypes.c_int,      # mode (PropModeReplace = 0)
        ctypes.c_char_p,   # data
        ctypes.c_int,      # nelements
    ]

    x11.XFlush.restype  = ctypes.c_int
    x11.XFlush.argtypes = [ctypes.c_void_p]

    x11.XCloseDisplay.restype  = ctypes.c_int
    x11.XCloseDisplay.argtypes = [ctypes.c_void_p]

    return x11


def set_desktop_window_type(xid: int) -> bool:
    """
    Set _NET_WM_WINDOW_TYPE = _NET_WM_WINDOW_TYPE_DESKTOP on the given X11
    window ID.  This is the standard EWMH contract that tells the window
    manager to keep this window permanently below all normal windows.

    No override_redirect, no reparenting – fully WM-managed and therefore
    compatible with Mutter/GNOME workspace switching, Show-Desktop, etc.
    """
    try:
        x11 = _load_x11()
    except OSError as e:
        print(f"[-] X11: could not load libX11.so.6 – {e}")
        return False

    display = x11.XOpenDisplay(None)
    if not display:
        print("[-] X11: XOpenDisplay failed.")
        return False

    try:
        prop_atom  = x11.XInternAtom(display, b"_NET_WM_WINDOW_TYPE",        0)
        value_atom = x11.XInternAtom(display, b"_NET_WM_WINDOW_TYPE_DESKTOP", 0)

        # XChangeProperty expects a pointer to the atom value(s)
        data = ctypes.c_ulong(value_atom)

        x11.XChangeProperty(
            display,
            xid,
            prop_atom,
            x11.XInternAtom(display, b"ATOM", 0),
            32,          # format: 32-bit values
            0,           # PropModeReplace
            ctypes.cast(ctypes.byref(data), ctypes.c_char_p),
            1,           # number of elements
        )
        x11.XFlush(display)
        print(f"[+] X11: _NET_WM_WINDOW_TYPE_DESKTOP set on window {xid}.")
        return True
    except Exception as e:
        print(f"[-] X11: XChangeProperty failed – {e}")
        return False
    finally:
        x11.XCloseDisplay(display)


# ── GTK wallpaper setup ──────────────────────────────────────────────────────

def setup_gtk_wallpaper(window) -> None:
    """
    Called once the pywebview window has been shown.
    Applies EWMH / GTK hints so the WebKit2GTK window behaves as a wallpaper:
      • Permanently behind all normal windows (_NET_WM_WINDOW_TYPE_DESKTOP)
      • Sticks to every virtual desktop
      • Not listed in taskbar / pager / Alt-Tab
      • No title-bar, no border
      • Receives no keyboard or pointer focus (click-through)
    """
    try:
        import gi
        gi.require_version("Gtk", "3.0")
        from gi.repository import Gtk, Gdk, GLib
    except Exception as e:
        print(f"[-] GTK import failed – {e}")
        return

    gtk_window = window.native
    if not gtk_window:
        print("[-] GTK: window.native not available yet.")
        return

    print("[+] Applying wallpaper GTK hints…")

    def apply_hints():
        try:
            # ── 1. Desktop window type hint (GTK level) ──────────────────
            #    Reinforces the X11 atom we set below.
            gtk_window.set_type_hint(Gdk.WindowTypeHint.DESKTOP)

            # ── 2. Always below every other window ───────────────────────
            gtk_window.set_keep_below(True)

            # ── 3. Visible on all virtual desktops ───────────────────────
            gtk_window.stick()

            # ── 4. Hide from taskbar, pager and Alt-Tab ──────────────────
            gtk_window.set_skip_taskbar_hint(True)
            gtk_window.set_skip_pager_hint(True)

            # ── 5. No window decorations ─────────────────────────────────
            gtk_window.set_decorated(False)

            # ── 6. No keyboard / focus (purely visual layer) ─────────────
            gtk_window.set_accept_focus(False)
            gtk_window.set_focus_on_map(False)

            # ── 7. EWMH _NET_WM_WINDOW_TYPE_DESKTOP via X11 atom ─────────
            gdk_win = gtk_window.get_window()
            if gdk_win and hasattr(gdk_win, "get_xid"):
                xid = gdk_win.get_xid()
                set_desktop_window_type(xid)

                # ── 8. Click-through: zero-size input region ─────────────
                try:
                    import cairo
                    gdk_win.input_shape_combine_region(cairo.Region(), 0, 0)
                    print("[+] GTK: click-through input mask applied.")
                except Exception as ex:
                    print(f"[-] GTK: click-through mask failed – {ex}")

            print("[+] GTK: all wallpaper hints applied successfully.")
        except Exception as e:
            print(f"[-] GTK: apply_hints error – {e}")
        return False   # remove from idle loop

    GLib.idle_add(apply_hints)


# ── Backend readiness check ──────────────────────────────────────────────────

def wait_for_backend(url: str, timeout: int = 30) -> bool:
    import urllib.request
    print(f"[+] Waiting for backend server at {url}…")
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as r:
                if r.status == 200:
                    print("[+] Backend server is ready!")
                    return True
        except Exception:
            pass
        time.sleep(0.5)
    print("[-] Warning: backend did not respond in time – starting anyway.")
    return False


# ── Entry point ──────────────────────────────────────────────────────────────

def get_screen_resolution() -> tuple[int, int]:
    """
    Ask xrandr for the primary display's current resolution.
    Falls back to 1920x1080 on any error.
    """
    import subprocess, re
    try:
        out = subprocess.check_output(["xrandr", "--current"], text=True)
        # Match the line that ends with " connected primary WxH+X+Y"
        m = re.search(r" connected primary (\d+)x(\d+)", out)
        if not m:
            # Some setups omit "primary"; take the first connected resolution
            m = re.search(r" connected (\d+)x(\d+)", out)
        if m:
            return int(m.group(1)), int(m.group(2))
    except Exception:
        pass
    return 1920, 1080


def monitor_display_changes(restart_callback, poll_interval: float = 5.0):
    """
    Poll xrandr every `poll_interval` seconds.  When the primary resolution
    changes (e.g. an external monitor is plugged in), call restart_callback
    so the wallpaper window is re-created at the new size.
    """
    import threading

    def _watch():
        last_res = get_screen_resolution()
        while True:
            time.sleep(poll_interval)
            current_res = get_screen_resolution()
            if current_res != last_res:
                print(f"[+] Display resolution changed: {last_res} → {current_res}.  Restarting wallpaper…")
                last_res = current_res
                restart_callback(current_res)

    t = threading.Thread(target=_watch, daemon=True)
    t.start()


def main():
    # Detect primary screen resolution via xrandr (reliable, includes external monitors)
    detected_width, detected_height = get_screen_resolution()
    print(f"[+] Screen resolution detected: {detected_width}x{detected_height}")

    parser = argparse.ArgumentParser(description="System Architect Live Wallpaper Client")
    parser.add_argument("--url",    default="http://127.0.0.1:8000")
    parser.add_argument("--width",  type=int, default=detected_width)
    parser.add_argument("--height", type=int, default=detected_height)
    args = parser.parse_args()

    try:
        import webview
    except ImportError:
        print("[-] pywebview is not installed.  Run: pip install pywebview")
        sys.exit(1)

    print(f"[+] Starting Wallpaper Client → {args.url}")
    wait_for_backend(args.url)

    # ── Create the borderless WebKit2GTK window ──────────────────────────────
    # NOTE: we do NOT pass fullscreen=True because GTK fullscreen covers the
    # GNOME taskbar/dock.  Instead we set width/height = screen dimensions and
    # let _NET_WM_WINDOW_TYPE_DESKTOP handle layering (stays below everything).
    window = webview.create_window(
        title            = "NexusCore Wallpaper",
        url              = args.url,
        width            = args.width,
        height           = args.height,
        x                = 0,
        y                = 0,
        frameless        = True,
        resizable        = False,
        fullscreen       = False,   # ← MUST be False so taskbar stays on top
        background_color = "#0B0C10",
        on_top           = False,
    )

    # Hook: after the window is drawn for the first time, apply wallpaper hints
    def on_shown():
        time.sleep(0.3)   # allow GdkWindow to fully realise
        setup_gtk_wallpaper(window)

    window.events.shown += on_shown

    # ── Display hotplug watcher ──────────────────────────────────────────────
    # When a new monitor is connected the wrapper restarts itself at the new
    # resolution automatically (the systemd / autostart service handles respawn).
    def on_resolution_change(new_res: tuple[int, int]):
        w, h = new_res
        print(f"[+] Resizing wallpaper window to {w}x{h}…")
        try:
            window.resize(w, h)
            window.move(0, 0)
        except Exception as e:
            print(f"[-] Could not resize window – {e}")
            # Fallback: restart the whole process
            os.execv(sys.executable, [sys.executable] + sys.argv)

    monitor_display_changes(on_resolution_change)

    webview.start(gui="gtk")


if __name__ == "__main__":
    main()
