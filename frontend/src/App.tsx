import React, { useState, useEffect } from "react";
import { useTelemetry } from "./hooks/useTelemetry";
import LeftPanel from "./components/LeftPanel";
import RightPanel from "./components/RightPanel";
import BottomPanel from "./components/BottomPanel";
import CenterPanel from "./components/CenterPanel";
import SettingsPanel from "./components/SettingsPanel";
import { Shield, Wifi, WifiOff, Clock } from "lucide-react";

export const App: React.FC = () => {
  const { telemetry, isConnected, settings, updateSettings } = useTelemetry();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString());
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (totalSeconds: number): string => {
    const d = Math.floor(totalSeconds / (3600 * 24));
    const h = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0 || d > 0) parts.push(`${h}h`);
    parts.push(`${m}m`);
    return parts.join(" ");
  };

  const showLeft   = settings.showGit || settings.showDocker;
  const showRight  = settings.showNetwork;

  // Build grid-template-columns so it always fills the viewport
  // Left: 260px fixed, Center: 1fr, Right: 260px fixed
  const gridCols =
    showLeft && showRight ? "260px 1fr 260px" :
    showLeft              ? "260px 1fr" :
    showRight             ? "1fr 260px" :
                            "1fr";

  return (
    <div
      className={`w-screen h-screen flex flex-col p-3 relative select-none scanlines scanlines-${settings.animationQuality === "low" ? "low" : "high"} scanner-grid`}
      style={{ gap: "10px" }}
    >
      {/* Scanning laser line */}
      {settings.animationQuality !== "low" && <div className="scanline-v" />}

      {/* ── HEADER ───────────────────────────────────────────── */}
      <header className="hud-panel px-4 py-2.5 flex items-center justify-between border border-primary/20 shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 animate-pulse" style={{ color: "var(--color-primary)" }} />
          <div className="flex flex-col font-mono">
            <h1 className="text-sm font-black tracking-widest neon-text-glow" style={{ color: "var(--color-primary)" }}>
              SYSTEM ARCHITECT
            </h1>
            <span className="text-[9px] text-text-dim tracking-wider">COMMAND CENTER WALLPAPER v1.0</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6 font-mono text-[10px] text-text-dim border-l border-r border-white/5 px-6">
          {[
            { label: "HOST",   val: telemetry.system.hostname },
            { label: "DISTRO", val: telemetry.system.distro },
            { label: "KERNEL", val: telemetry.system.kernel },
            { label: "UPTIME", val: formatUptime(telemetry.system.uptime) },
          ].map(({ label, val }) => (
            <div key={label}>
              <span className="mr-1" style={{ color: "var(--color-primary)" }}>{label}:</span>
              <span className="text-text font-bold">{val}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-1.5 text-text bg-black/30 px-2.5 py-1.5 rounded border border-white/5">
            <Clock className="w-3.5 h-3.5" style={{ color: "var(--color-primary)" }} />
            <span>{timeStr}</span>
          </div>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border ${
              isConnected
                ? "bg-primary/10 border-primary/30"
                : "bg-amber-500/10 border-amber-500/30 text-amber-500"
            }`}
            style={{ color: isConnected ? "var(--color-primary)" : undefined, borderColor: isConnected ? "var(--color-border)" : undefined }}
          >
            {isConnected ? (
              <><Wifi className="w-3.5 h-3.5" /><span className="font-bold">STREAMING</span></>
            ) : (
              <><WifiOff className="w-3.5 h-3.5 animate-pulse" /><span className="font-bold animate-pulse">SIMULATED</span></>
            )}
          </div>
          {/* Settings gear */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-8 h-8 rounded border border-white/10 bg-black/30 flex items-center justify-center hover:border-primary/40 transition-colors"
            style={{ color: "var(--color-primary)" }}
            title="Settings"
          >
            ⚙
          </button>
        </div>
      </header>

      {/* ── MAIN GRID ─────────────────────────────────────────── */}
      <main
        className="flex-1 min-h-0"
        style={{ display: "grid", gridTemplateColumns: gridCols, gap: "10px" }}
      >
        {showLeft && (
          <div className="h-full overflow-y-auto scrollbar-none">
            <LeftPanel
              telemetry={telemetry}
              showGit={settings.showGit}
              showDocker={settings.showDocker}
            />
          </div>
        )}

        {/* Center: always visible, fills remaining space */}
        <div className="h-full min-h-0">
          <CenterPanel telemetry={telemetry} />
        </div>

        {showRight && (
          <div className="h-full overflow-y-auto scrollbar-none">
            <RightPanel telemetry={telemetry} showNetwork={settings.showNetwork} />
          </div>
        )}
      </main>

      {/* ── BOTTOM STATS ──────────────────────────────────────── */}
      <footer className="shrink-0">
        <BottomPanel telemetry={telemetry} />
      </footer>

      <SettingsPanel
        settings={settings}
        updateSettings={updateSettings}
        isOpen={isSettingsOpen}
        setIsOpen={setIsSettingsOpen}
      />
    </div>
  );
};

export default App;
