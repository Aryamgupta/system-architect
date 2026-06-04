import React, { useEffect, useState } from "react";
import { Network, Globe, ShieldCheck, Server, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { TelemetryData } from "../../../shared/types/telemetry";

interface RightPanelProps {
  telemetry: TelemetryData;
  showNetwork: boolean;
}

interface LogLine {
  time: string;
  type: "INFO" | "NET" | "SYS";
  msg: string;
}

export const RightPanel: React.FC<RightPanelProps> = ({ telemetry, showNetwork }) => {
  const { upload_rate, download_rate, interfaces } = telemetry.network;
  const [logs, setLogs] = useState<LogLine[]>([]);

  // Function to format bytes to human readable rates
  const formatSpeed = (bytesPerSec: number): string => {
    if (bytesPerSec >= 1024 * 1024) {
      return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
    }
    if (bytesPerSec >= 1024) {
      return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    }
    return `${bytesPerSec.toFixed(0)} B/s`;
  };

  // Generate real-time log stream lines
  useEffect(() => {
    const addLog = () => {
      const types: Array<LogLine["type"]> = ["INFO", "NET", "SYS"];
      const randType = types[Math.floor(Math.random() * types.length)];
      let msg = "";

      if (randType === "NET") {
        const activeInt = interfaces[Math.floor(Math.random() * interfaces.length)] || "eth0";
        if (Math.random() > 0.5) {
          msg = `Route active on ${activeInt}: TX ${formatSpeed(upload_rate)}`;
        } else {
          msg = `Incoming pack stream on ${activeInt}: RX ${formatSpeed(download_rate)}`;
        }
      } else if (randType === "SYS") {
        msg = `Core reactor temperature: ${telemetry.temperature.cpu}°C | CPU: ${telemetry.cpu.usage}%`;
      } else {
        const repos = [telemetry.developer.git.repo || "system-architect", "node-mesh", "docker-core"];
        msg = `Git sync in ${repos[Math.floor(Math.random() * repos.length)]} -> OK`;
      }

      const timestamp = new Date().toLocaleTimeString();
      setLogs((prev) => [{ time: timestamp, type: randType, msg }, ...prev.slice(0, 7)]);
    };

    const interval = setInterval(addLog, 4000);
    // Add initial log
    addLog();
    return () => clearInterval(interval);
  }, [upload_rate, download_rate, interfaces, telemetry.cpu.usage, telemetry.temperature.cpu, telemetry.developer.git.repo]);

  if (!showNetwork) return null;

  // Animation speed modifier based on bandwidth usage
  const totalTraffic = upload_rate + download_rate;
  const flowDuration = Math.max(1, 10 - Math.min(8, totalTraffic / (1024 * 100))); // 10s down to 2s based on traffic

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Topology Graph */}
      <div className="hud-panel p-4 flex-1 flex flex-col min-h-0">
        <div className="hud-header text-sm tracking-wider font-bold mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-primary" style={{ color: "var(--color-primary)" }} />
            <span>CONNECTION TOPOLOGY</span>
          </div>
          <span className="text-[10px] font-mono text-text-dim">MESH MAPPED</span>
        </div>

        {/* Dynamic SVG Vector Map */}
        <div className="flex-1 min-h-[220px] relative border border-primary/5 rounded bg-black/40 overflow-hidden flex items-center justify-center">
          <svg viewBox="0 0 320 280" className="w-full h-full max-h-[300px]">
            {/* Definitions for gradients/markers */}
            <defs>
              <radialGradient id="glow-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
              </radialGradient>
              <filter id="glow-filter">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Connection Edges */}
            {/* Host (160, 140) to Internet (260, 60) */}
            <path d="M160,140 L260,60" stroke="var(--color-border)" strokeWidth="1.5" strokeDasharray="5,5" className="opacity-40" />
            <path d="M160,140 L260,60" stroke="var(--color-primary)" strokeWidth="1.5" strokeDasharray="8,20" strokeDashoffset="0" className="opacity-70 filter-[url(#glow-filter)]" style={{ animation: `spin-slow ${flowDuration}s infinite linear reverse` }} />

            {/* Host (160, 140) to Docker (60, 220) */}
            <path d="M160,140 L60,220" stroke="var(--color-border)" strokeWidth="1.5" strokeDasharray="5,5" className="opacity-40" />
            <path d="M160,140 L60,220" stroke="var(--color-primary)" strokeWidth="1.5" strokeDasharray="10,15" strokeDashoffset="0" className="opacity-70" style={{ animation: `spin-slow ${flowDuration * 1.5}s infinite linear` }} />

            {/* Host (160, 140) to Git (60, 60) */}
            <path d="M160,140 L60,60" stroke="var(--color-border)" strokeWidth="1.5" strokeDasharray="5,5" className="opacity-40" />
            <path d="M160,140 L60,60" stroke="var(--color-primary)" strokeWidth="1.5" strokeDasharray="6,25" strokeDashoffset="0" className="opacity-70" style={{ animation: `spin-slow ${flowDuration * 2}s infinite linear reverse` }} />

            {/* Host (160, 140) to Local API (260, 220) */}
            <path d="M160,140 L260,220" stroke="var(--color-border)" strokeWidth="1.5" strokeDasharray="5,5" className="opacity-40" />
            <path d="M160,140 L260,220" stroke="var(--color-primary)" strokeWidth="1.5" strokeDasharray="8,12" strokeDashoffset="0" className="opacity-70" style={{ animation: `spin-slow ${flowDuration * 1.2}s infinite linear` }} />

            {/* Docker (60, 220) to Local API (260, 220) */}
            <path d="M60,220 L260,220" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="4,8" className="opacity-25" />

            {/* Pulsing Glow Rings behind Nodes */}
            <circle cx="160" cy="140" r="22" fill="url(#glow-grad)" className="animate-pulse" />
            <circle cx="260" cy="60" r="15" fill="url(#glow-grad)" className="animate-pulse opacity-50" />
            <circle cx="60" cy="60" r="15" fill="url(#glow-grad)" className="animate-pulse opacity-50" />

            {/* Node Points */}
            {/* Host Center */}
            <circle cx="160" cy="140" r="8" fill="var(--color-primary)" filter="url(#glow-filter)" className="cursor-pointer" />
            <circle cx="160" cy="140" r="12" stroke="var(--color-primary)" strokeWidth="1" fill="none" className="animate-ping" />

            {/* Internet Node */}
            <circle cx="260" cy="60" r="6" fill="var(--color-secondary)" />
            <circle cx="260" cy="60" r="10" stroke="var(--color-secondary)" strokeWidth="0.7" fill="none" className="opacity-50" />

            {/* Git Node */}
            <circle cx="60" cy="60" r="6" fill="var(--color-secondary)" />

            {/* Docker Node */}
            <circle cx="60" cy="220" r="6" fill={telemetry.developer.docker.status !== "inactive" ? "var(--color-primary)" : "#3f3f46"} />

            {/* Local Web Server Node */}
            <circle cx="260" cy="220" r="6" fill="var(--color-primary)" />

            {/* Node Labels */}
            <text x="160" y="122" textAnchor="middle" fill="var(--color-text)" fontSize="8.5" fontFamily="var(--font-mono)" fontWeight="bold">LOCAL_HOST</text>
            <text x="260" y="44" textAnchor="middle" fill="var(--color-text-dim)" fontSize="8" fontFamily="var(--font-mono)">GATEWAY_WAN</text>
            <text x="60" y="44" textAnchor="middle" fill="var(--color-text-dim)" fontSize="8" fontFamily="var(--font-mono)">VCS_GIT</text>
            <text x="60" y="238" textAnchor="middle" fill="var(--color-text-dim)" fontSize="8" fontFamily="var(--font-mono)">DOCKER_DAEMON</text>
            <text x="260" y="238" textAnchor="middle" fill="var(--color-text-dim)" fontSize="8" fontFamily="var(--font-mono)">LOCAL_API</text>
          </svg>

          {/* Network Traffic floating HUD badges */}
          <div className="absolute top-2 left-2 flex gap-1 font-mono text-[9px] bg-black/60 px-1.5 py-0.5 rounded border border-white/5 text-text-dim">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 self-center animate-pulse" />
            <span>SECURE LINK</span>
          </div>
        </div>
      </div>

      {/* Network Traffic Speeds */}
      <div className="hud-panel p-4 flex flex-col font-mono text-xs gap-3">
        <div className="hud-header text-sm tracking-wider font-bold mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" style={{ color: "var(--color-primary)" }} />
            <span>TRAFFIC INDICATION</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 bg-surface/20 border border-primary/5 rounded flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[9px] text-text-dim">DOWNLOAD</span>
              <span className="text-sm font-bold text-primary" style={{ color: "var(--color-primary)" }}>{formatSpeed(download_rate)}</span>
            </div>
            <ArrowDownRight className="w-5 h-5 text-emerald-500" />
          </div>

          <div className="p-2 bg-surface/20 border border-primary/5 rounded flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[9px] text-text-dim">UPLOAD</span>
              <span className="text-sm font-bold text-secondary" style={{ color: "var(--color-secondary)" }}>{formatSpeed(upload_rate)}</span>
            </div>
            <ArrowUpRight className="w-5 h-5 text-sky-400" />
          </div>
        </div>

        {/* Interfaces list */}
        <div className="flex items-center justify-between text-[10px] text-text-dim border-t border-white/5 pt-2">
          <span>ACTIVE INTERFACES</span>
          <span className="text-primary font-bold" style={{ color: "var(--color-primary)" }}>
            {interfaces.join(", ") || "none"}
          </span>
        </div>
      </div>

      {/* Console log activity stream */}
      <div className="hud-panel p-4 flex-1 flex flex-col min-h-0">
        <div className="hud-header text-sm tracking-wider font-bold mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" style={{ color: "var(--color-primary)" }} />
            <span>METRIC ACTIVITY LOG</span>
          </div>
          <span className="w-2.5 h-2.5 rounded-full border border-primary/40 flex items-center justify-center">
            <Server className="w-1.5 h-1.5 text-primary" style={{ color: "var(--color-primary)" }} />
          </span>
        </div>

        <div className="flex-1 font-mono text-[10px] text-text-dim overflow-y-auto space-y-1.5 pr-1 select-text">
          {logs.map((log, idx) => (
            <div key={idx} className="flex gap-2 leading-relaxed border-b border-white/3 pb-1 border-dotted last:border-b-0">
              <span className="text-primary opacity-50 shrink-0" style={{ color: "var(--color-primary)" }}>[{log.time}]</span>
              <span className={`shrink-0 font-bold ${
                log.type === "NET" ? "text-secondary" : log.type === "SYS" ? "text-primary" : "text-amber-500"
              }`}
              style={{
                color: log.type === "NET" ? "var(--color-secondary)" : log.type === "SYS" ? "var(--color-primary)" : undefined
              }}>
                {log.type}
              </span>
              <span className="text-text break-all">{log.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default RightPanel;
