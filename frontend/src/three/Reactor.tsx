import React from "react";
import type { TelemetryData } from "../../../shared/types/telemetry";
import type { DashboardSettings } from "../hooks/useTelemetry";

interface ReactorProps {
  telemetry: TelemetryData;
  settings: DashboardSettings;
}

export const Reactor: React.FC<ReactorProps> = ({ telemetry }) => {
  const { cpu, memory, temperature } = telemetry;
  
  // Calculate dynamic animation values based on telemetry
  const cpuFactor = cpu.usage / 100;
  
  // Speed ranges from 20s (idle) to 1.5s (heavy load)
  const rotationSpeed = Math.max(1.5, 20 - cpuFactor * 18.5);
  // Outer ring rotates in reverse: 25s (idle) to 2.5s (load)
  const outerRotationSpeed = Math.max(2.5, 25 - cpuFactor * 22.5);
  
  // Pulsing scale based on CPU usage
  const pulseScale = 1 + cpuFactor * 0.08;
  
  // Determine color theme class or style based on temperature
  // Normal cyan/blue to warning amber/red at 75C+
  const temp = temperature.cpu || 40;
  const isHot = temp > 75;
  const isWarm = temp > 55 && temp <= 75;
  
  const coreColor = isHot 
    ? "text-red-500" 
    : isWarm 
      ? "text-amber-500" 
      : "text-[var(--color-primary)]";
      
  const glowShadow = isHot
    ? "rgba(239, 68, 68, 0.4)"
    : isWarm
      ? "rgba(245, 158, 11, 0.4)"
      : "var(--color-glow)";

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center bg-black/20 border border-[var(--color-border)] rounded-lg overflow-hidden hud-panel">
      {/* Background Reactor Title Plate */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center font-mono text-[10px] tracking-widest text-[var(--color-primary)]/40 z-10">
        <div>CORE TELEMETRY VECTOR REACTOR</div>
        <div className="flex gap-1 mt-1 text-[8px]">
          <span className="animate-pulse text-emerald-500">●</span> ONLINE (2D ECO-MODE)
        </div>
      </div>

      {/* SVG Cyberpunk Reactor Diagram */}
      <div className="w-[85%] h-[85%] relative flex items-center justify-center z-0">
        <svg 
          viewBox="0 0 200 200" 
          className="w-full h-full max-w-[400px] max-h-[400px]"
          style={{ overflow: "visible" }}
        >
          {/* Outer Radar ring with static division lines */}
          <circle 
            cx="100" 
            cy="100" 
            r="90" 
            className="stroke-[var(--color-primary)]/10 fill-none stroke-[0.5]" 
          />
          <circle 
            cx="100" 
            cy="100" 
            r="85" 
            className="stroke-[var(--color-secondary)]/15 fill-none stroke-[0.75] stroke-dasharray-[4,6]" 
            strokeDasharray="4 6"
          />

          {/* Outer Rotating Segment Ring */}
          <g 
            style={{ 
              transformOrigin: "100px 100px", 
              animation: `spin-slow ${outerRotationSpeed}s linear infinite reverse` 
            }}
          >
            <circle 
              cx="100" 
              cy="100" 
              r="76" 
              className="stroke-[var(--color-secondary)]/30 fill-none stroke-[1.5]"
              strokeDasharray="40 80 60 40"
            />
            {/* Tick marks on outer rotating ring */}
            <circle 
              cx="100" 
              cy="100" 
              r="80" 
              className="stroke-[var(--color-primary)]/40 fill-none stroke-[2]"
              strokeDasharray="2 18"
            />
          </g>

          {/* Middle Rotating HUD Compass Ring */}
          <g 
            style={{ 
              transformOrigin: "100px 100px", 
              animation: `spin-slow ${rotationSpeed}s linear infinite` 
            }}
          >
            <circle 
              cx="100" 
              cy="100" 
              r="62" 
              className="stroke-[var(--color-primary)]/40 fill-none stroke-[1.25]"
              strokeDasharray="120 40 30 50"
            />
            {/* Hexagon shape inside */}
            <polygon 
              points="100,45 147.6,72.5 147.6,127.5 100,155 52.4,127.5 52.4,72.5" 
              className="stroke-[var(--color-primary)]/20 fill-none stroke-[0.75]" 
            />
          </g>

          {/* Inner ring that pulses */}
          <circle 
            cx="100" 
            cy="100" 
            r="38" 
            className="stroke-[var(--color-primary)]/40 fill-none stroke-[1.5]"
            strokeDasharray="6 4"
            style={{
              transformOrigin: "100px 100px",
              transform: `scale(${pulseScale})`,
              transition: "transform 0.1s ease-out",
            }}
          />

          {/* Central Hexagon Core */}
          <g 
            className={coreColor}
            style={{
              transformOrigin: "100px 100px",
              transform: `scale(${pulseScale})`,
              filter: `drop-shadow(0 0 8px ${glowShadow})`,
              transition: "transform 0.1s ease-out, filter 0.2s ease",
            }}
          >
            {/* Outer Hex */}
            <polygon 
              points="100,75 121.6,87.5 121.6,112.5 100,125 78.4,112.5 78.4,87.5" 
              className="fill-current opacity-10 stroke-current stroke-[1.5]" 
            />
            {/* Inner solid hexagon point */}
            <polygon 
              points="100,88 110.4,94 110.4,106 100,112 89.6,106 89.6,94" 
              className="fill-current opacity-80" 
            />
          </g>
        </svg>

        {/* Center Text displaying CPU usage */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none font-mono text-[var(--color-text)]">
          <div className="text-[26px] font-bold tracking-tighter leading-none neon-text-glow">
            {Math.round(cpu.usage)}<span className="text-[12px] opacity-60">%</span>
          </div>
          <div className="text-[8px] text-[var(--color-text-dim)] tracking-widest uppercase mt-0.5">
            CPU LOAD
          </div>
        </div>
      </div>

      {/* Dynamic telemetry radar panel layout */}
      <div className="absolute bottom-4 left-6 right-6 flex justify-between font-mono text-[9px] text-[var(--color-text-dim)] z-10 border-t border-[var(--color-border)] pt-2.5">
        <div className="flex gap-4">
          <div>RAM USED: <span className="text-[var(--color-primary)]">{Math.round(memory.percentage)}%</span></div>
          <div>CORE TEMP: <span className={temp > 70 ? "text-red-400 font-bold" : "text-[var(--color-secondary)]"}>{temp.toFixed(1)}°C</span></div>
        </div>
        <div className="text-right">
          SCAN SYS: ACTIVE
        </div>
      </div>

      {/* Scanning laser visual overlay */}
      <div className="absolute inset-0 pointer-events-none border border-[var(--color-primary)]/5 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]" />
      <div className="scanline-v" />
    </div>
  );
};

export default Reactor;
