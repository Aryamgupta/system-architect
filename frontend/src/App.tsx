import React, { useState, useEffect } from "react";
import { useTelemetry } from "./hooks/useTelemetry";
import LeftPanel from "./components/LeftPanel";
import RightPanel from "./components/RightPanel";
import BottomPanel from "./components/BottomPanel";
import Reactor from "./three/Reactor";
import SettingsPanel from "./components/SettingsPanel";
import { Shield, Wifi, WifiOff, Clock } from "lucide-react";

export const App: React.FC = () => {
  const { telemetry, isConnected, settings, updateSettings } = useTelemetry();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [timeStr, setTimeStr] = useState("");

  // Update clock every second
  useEffect(() => {
    const updateClock = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString());
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format seconds to readable format: 1d 4h 20m
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

  // Determine grid template based on toggled modules
  const showLeft = settings.showGit || settings.showDocker;
  const showRight = settings.showNetwork;

  let gridLayoutClass = "grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0";
  if (!showLeft && !showRight) {
    gridLayoutClass = "grid grid-cols-1 gap-4 flex-1 min-h-0";
  } else if (!showLeft) {
    gridLayoutClass = "grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0"; // Reactor takes 3 cols, Right takes 1
  } else if (!showRight) {
    gridLayoutClass = "grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0"; // Left takes 1, Reactor takes 3
  }

  return (
    <div className={`w-screen h-screen flex flex-col p-4 relative select-none scanlines scanlines-${settings.animationQuality === "low" ? "low" : "high"} scanner-grid`}>
      {/* Laser Scanning Line */}
      {settings.animationQuality !== "low" && <div className="scanline-v" />}

      {/* 1. Header Bar */}
      <header className="hud-panel px-4 py-3 mb-4 flex items-center justify-between border border-primary/20 shrink-0">
        {/* Left Section: System Architect Nameplate */}
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-primary animate-pulse" style={{ color: "var(--color-primary)" }} />
          <div className="flex flex-col font-mono">
            <h1 className="text-sm font-black tracking-widest text-primary neon-text-glow" style={{ color: "var(--color-primary)" }}>
              SYSTEM ARCHITECT
            </h1>
            <span className="text-[9px] text-text-dim tracking-wider">COMMAND CENTER WALLPAPER v1.0</span>
          </div>
        </div>

        {/* Center Section: Telemetry Source Context */}
        <div className="hidden md:flex items-center gap-8 font-mono text-[10px] text-text-dim border-l border-r border-white/5 px-8">
          <div>
            <span className="text-primary mr-1.5" style={{ color: "var(--color-primary)" }}>HOST:</span>
            <span className="text-text font-bold">{telemetry.system.hostname}</span>
          </div>
          <div>
            <span className="text-primary mr-1.5" style={{ color: "var(--color-primary)" }}>DISTRO:</span>
            <span className="text-text font-bold">{telemetry.system.distro}</span>
          </div>
          <div>
            <span className="text-primary mr-1.5" style={{ color: "var(--color-primary)" }}>KERNEL:</span>
            <span className="text-text font-bold">{telemetry.system.kernel}</span>
          </div>
          <div>
            <span className="text-primary mr-1.5" style={{ color: "var(--color-primary)" }}>UPTIME:</span>
            <span className="text-text font-bold">{formatUptime(telemetry.system.uptime)}</span>
          </div>
        </div>

        {/* Right Section: Uptime, Clock, Connection Status */}
        <div className="flex items-center gap-4 font-mono text-xs">
          {/* Clock */}
          <div className="flex items-center gap-1.5 text-text bg-black/30 px-2.5 py-1.5 rounded border border-white/5">
            <Clock className="w-3.5 h-3.5 text-primary" style={{ color: "var(--color-primary)" }} />
            <span>{timeStr}</span>
          </div>

          {/* Connection Status Badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border ${
            isConnected 
              ? "bg-primary/10 border-primary/30 text-primary" 
              : "bg-amber-500/10 border-amber-500/30 text-amber-500"
          }`}
          style={{
            borderColor: isConnected ? "var(--color-border)" : undefined,
            color: isConnected ? "var(--color-primary)" : undefined
          }}>
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span className="font-bold">STREAMING</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 animate-pulse" />
                <span className="font-bold animate-pulse">SIMULATED</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. Main Section Grid */}
      <main className={gridLayoutClass}>
        {/* Left Side: Developer Environment */}
        {showLeft && (
          <div className="lg:col-span-1 h-full overflow-y-auto pr-1 scrollbar-none">
            <LeftPanel
              telemetry={telemetry}
              showGit={settings.showGit}
              showDocker={settings.showDocker}
            />
          </div>
        )}

        {/* Center: System Core (Reactor 2D scene) */}
        <div className={`${
          !showLeft && !showRight 
            ? "col-span-1" 
            : !showLeft 
              ? "lg:col-span-3" 
              : !showRight 
                ? "lg:col-span-3" 
                : "lg:col-span-2"
        } h-full min-h-0`}>
          <Reactor
            telemetry={telemetry}
            settings={settings}
          />
        </div>

        {/* Right Side: Network Mesh & Logs */}
        {showRight && (
          <div className="lg:col-span-1 h-full overflow-y-auto pr-1 scrollbar-none">
            <RightPanel
              telemetry={telemetry}
              showNetwork={settings.showNetwork}
            />
          </div>
        )}
      </main>

      {/* 3. Bottom Stats Panel */}
      <footer className="mt-4 shrink-0">
        <BottomPanel telemetry={telemetry} />
      </footer>

      {/* Settings Overlay Drawer */}
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
