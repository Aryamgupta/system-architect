import React from "react";
import { Cpu, HardDrive, Thermometer, Battery, BatteryCharging, Power } from "lucide-react";
import type { TelemetryData } from "../../../shared/types/telemetry";

interface BottomPanelProps {
  telemetry: TelemetryData;
}

export const BottomPanel: React.FC<BottomPanelProps> = ({ telemetry }) => {
  const { cpu, memory, disk, battery, temperature } = telemetry;

  // Format bytes to GB
  const formatGB = (bytes: number): string => {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // Format seconds to H:MM
  const formatTime = (secs: number | null): string => {
    if (secs === null) return "N/A";
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="hud-panel p-4 flex gap-6 w-full font-mono text-xs overflow-x-auto min-h-[160px]">
      
      {/* 1. CPU Section */}
      <div className="flex-1 min-w-[280px] flex flex-col justify-between border-r border-primary/10 pr-4 last:border-0" style={{ borderRightColor: "var(--color-border)" }}>
        <div className="hud-header text-sm tracking-wider font-bold mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" style={{ color: "var(--color-primary)" }} />
            <span>PROCESSOR CORE</span>
          </div>
          <span className="text-[10px] text-text-dim">FREQ: {(cpu.frequency / 1000).toFixed(2)} GHz</span>
        </div>

        <div className="space-y-2">
          {/* CPU Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-text-dim">
              <span>CPU LOAD</span>
              <span className="text-primary font-bold" style={{ color: "var(--color-primary)" }}>{cpu.usage}%</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ 
                  width: `${cpu.usage}%`,
                  backgroundColor: "var(--color-primary)"
                }}
              />
            </div>
          </div>

          {/* Per-Core vertical visualizer */}
          <div className="flex justify-between items-end h-10 gap-1.5 px-1 bg-black/30 rounded border border-white/5 pt-2 pb-1">
            {cpu.per_core.map((coreVal, idx) => (
              <div key={idx} className="flex-1 flex flex-col justify-end h-full">
                <div 
                  className="w-full bg-primary hover:bg-highlight transition-all duration-300 rounded-[1px]"
                  style={{ 
                    height: `${coreVal}%`,
                    backgroundColor: "var(--color-primary)"
                  }}
                  title={`Core ${idx + 1}: ${coreVal}%`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. MEMORY Section */}
      <div className="flex-1 min-w-[200px] flex flex-col justify-between border-r border-primary/10 pr-4 last:border-0" style={{ borderRightColor: "var(--color-border)" }}>
        <div className="hud-header text-sm tracking-wider font-bold mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-secondary" style={{ color: "var(--color-secondary)" }} />
            <span>SYSTEM MEMORY</span>
          </div>
          <span className="text-[10px] text-text-dim">{formatGB(memory.used)} / {formatGB(memory.total)}</span>
        </div>

        <div className="space-y-2">
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-text-dim">
              <span>RAM USAGE</span>
              <span className="text-secondary font-bold" style={{ color: "var(--color-secondary)" }}>{memory.percentage}%</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-secondary transition-all duration-300"
                style={{ 
                  width: `${memory.percentage}%`,
                  backgroundColor: "var(--color-secondary)"
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] text-text-dim bg-black/20 p-1.5 rounded border border-white/3">
            <div>FREE: {formatGB(memory.free)}</div>
            <div className="text-right">TOTAL: {formatGB(memory.total)}</div>
          </div>
        </div>
      </div>

      {/* 3. DISK STORAGE Section */}
      <div className="flex-1 min-w-[200px] flex flex-col justify-between border-r border-primary/10 pr-4 last:border-0" style={{ borderRightColor: "var(--color-border)" }}>
        <div className="hud-header text-sm tracking-wider font-bold mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-primary" style={{ color: "var(--color-primary)" }} />
            <span>DISK STORAGE</span>
          </div>
          <span className="text-[10px] text-text-dim">{disk.percentage}% USED</span>
        </div>

        <div className="space-y-2">
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-text-dim">
              <span>ROOT PARTITION (/)</span>
              <span className="text-text font-bold">{formatGB(disk.used)} / {formatGB(disk.total)}</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ 
                  width: `${disk.percentage}%`,
                  backgroundColor: "var(--color-primary)"
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[9px] text-text-dim bg-black/20 p-1.5 rounded border border-white/3">
            <div>READ: {(disk.read_speed / (1024 * 1024)).toFixed(1)} MB/s</div>
            <div className="text-right">WRITE: {(disk.write_speed / (1024 * 1024)).toFixed(1)} MB/s</div>
          </div>
        </div>
      </div>

      {/* 4. TEMPERATURE Section */}
      <div className="flex-1 min-w-[160px] flex flex-col justify-between border-r border-primary/10 pr-4 last:border-0" style={{ borderRightColor: "var(--color-border)" }}>
        <div className="hud-header text-sm tracking-wider font-bold mb-2 flex items-center">
          <Thermometer className="w-4 h-4 text-primary" style={{ color: "var(--color-primary)" }} />
          <span>THERMALS</span>
        </div>

        <div className="space-y-2.5">
          <div className="flex justify-between items-center bg-black/20 p-1.5 border border-white/3 rounded">
            <span className="text-text-dim text-[10px]">CPU TEMP</span>
            <span className="font-bold text-primary" style={{ color: "var(--color-primary)" }}>
              {temperature.cpu !== null ? `${temperature.cpu.toFixed(0)}°C` : "N/A"}
            </span>
          </div>

          <div className="flex justify-between items-center bg-black/20 p-1.5 border border-white/3 rounded">
            <span className="text-text-dim text-[10px]">GPU TEMP</span>
            <span className="font-bold text-secondary" style={{ color: "var(--color-secondary)" }}>
              {temperature.gpu !== null ? `${temperature.gpu.toFixed(0)}°C` : "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* 5. POWER & BATTERY Section */}
      <div className="flex-1 min-w-[160px] flex flex-col justify-between last:border-0">
        <div className="hud-header text-sm tracking-wider font-bold mb-2 flex items-center">
          <Battery className="w-4 h-4 text-primary" style={{ color: "var(--color-primary)" }} />
          <span>POWER SUPPLY</span>
        </div>

        {battery.percentage !== null ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] text-text-dim">
              <span>CHARGE STATE</span>
              <span className="flex items-center gap-1 font-bold text-primary" style={{ color: "var(--color-primary)" }}>
                {battery.charging ? (
                  <>
                    <BatteryCharging className="w-3.5 h-3.5 animate-pulse" />
                    <span>CHARGING</span>
                  </>
                ) : (
                  <>
                    <Power className="w-3.5 h-3.5 text-amber-500" />
                    <span>DISCHARGING</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Battery Graphic */}
              <div className="relative w-12 h-6 border-2 border-primary/45 rounded p-0.5" style={{ borderColor: "var(--color-border)" }}>
                <div 
                  className="h-full bg-primary rounded-[1px] transition-all"
                  style={{ 
                    width: `${battery.percentage}%`,
                    backgroundColor: "var(--color-primary)"
                  }}
                />
                <div className="absolute top-1 -right-1.5 w-1 h-3 bg-primary/45 rounded-r-[1px]" style={{ backgroundColor: "var(--color-border)" }} />
              </div>

              {/* Text info */}
              <div className="flex-1">
                <div className="text-sm font-bold text-text">{battery.percentage}%</div>
                <div className="text-[9px] text-text-dim">
                  {battery.charging ? "Adapter Connected" : `${formatTime(battery.remaining_time)} Left`}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-text-dim/40 italic">
            AC Mains Connected
          </div>
        )}
      </div>

    </div>
  );
};
export default BottomPanel;
