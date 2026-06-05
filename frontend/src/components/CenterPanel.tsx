import React, { useState, useEffect, useRef } from "react";
import { Layers, Activity, ScrollText, Cpu } from "lucide-react";
import type { TelemetryData } from "../../../shared/types/telemetry";

interface CenterPanelProps {
  telemetry: TelemetryData;
}

// ── Tiny inline sparkline ────────────────────────────────────────────────────
function Spark({ value, max, color }: { value: number; max: number; color: string }) {
  const ref = useRef<number[]>([]);
  ref.current = [...ref.current.slice(-39), value];
  const pts = ref.current;
  const W = 80; const H = 24;
  if (pts.length < 2) return <div style={{ width: W, height: H }} />;
  const coords = pts.map((v, i) => {
    const x = (i / (pts.length - 1)) * W;
    const y = H - (Math.min(v, max) / max) * H;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: W, height: H, flexShrink: 0 }}>
      <polyline points={coords} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

// ── Process row ──────────────────────────────────────────────────────────────
interface Proc { name: string; pid: number; cpu: number; mem: number; status: string }

function buildProcs(cpuTotal: number, memPct: number): Proc[] {
  // Simulate a stable process list derived from real telemetry values
  const seed = (n: number, scale: number) => parseFloat((n * scale + Math.random() * 0.3).toFixed(1));
  return [
    { name: "Xorg",              pid: 1122, cpu: seed(cpuTotal, 0.12), mem: seed(memPct, 0.06), status: "S" },
    { name: "gnome-shell",       pid: 1288, cpu: seed(cpuTotal, 0.09), mem: seed(memPct, 0.08), status: "S" },
    { name: "code",              pid: 3412, cpu: seed(cpuTotal, 0.18), mem: seed(memPct, 0.14), status: "S" },
    { name: "uvicorn",           pid: 5080, cpu: seed(cpuTotal, 0.04), mem: seed(memPct, 0.03), status: "S" },
    { name: "node",              pid: 4910, cpu: seed(cpuTotal, 0.07), mem: seed(memPct, 0.05), status: "S" },
    { name: "WebKitWebProcess",  pid: 2731, cpu: seed(cpuTotal, 0.08), mem: seed(memPct, 0.10), status: "S" },
    { name: "python3",           pid: 2729, cpu: seed(cpuTotal, 0.06), mem: seed(memPct, 0.04), status: "S" },
    { name: "pulseaudio",        pid: 1401, cpu: seed(cpuTotal, 0.02), mem: seed(memPct, 0.02), status: "S" },
    { name: "systemd",           pid: 1,    cpu: seed(cpuTotal, 0.01), mem: seed(memPct, 0.01), status: "S" },
    { name: "tracker-miner",     pid: 1899, cpu: seed(cpuTotal, 0.03), mem: seed(memPct, 0.02), status: "I" },
    { name: "dbus-daemon",       pid: 1056, cpu: seed(cpuTotal, 0.01), mem: seed(memPct, 0.01), status: "S" },
    { name: "NetworkManager",    pid: 897,  cpu: seed(cpuTotal, 0.01), mem: seed(memPct, 0.01), status: "S" },
  ].sort((a, b) => b.cpu - a.cpu);
}

// ── Load gauge bar ───────────────────────────────────────────────────────────
function LoadBar({ val, max, label }: { val: number; max: number; label: string }) {
  const pct = Math.min((val / max) * 100, 100);
  const col = pct > 80 ? "#ef4444" : pct > 50 ? "#f59e0b" : "var(--color-primary)";
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between font-mono text-[9px]">
        <span className="text-text-dim">{label}</span>
        <span style={{ color: col }}>{val.toFixed(2)}</span>
      </div>
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: col }} />
      </div>
    </div>
  );
}

// ── Journal log line ─────────────────────────────────────────────────────────
interface LogEntry { ts: string; level: "INFO" | "WARN" | "ERR"; unit: string; msg: string }

const LOG_POOL: Omit<LogEntry, "ts">[] = [
  { level: "INFO", unit: "kernel",          msg: "CPU frequency scaling: 2.4 GHz" },
  { level: "INFO", unit: "systemd",         msg: "Started user session for aryam" },
  { level: "INFO", unit: "NetworkManager",  msg: "wlp3s0: link is connected (DHCP)" },
  { level: "WARN", unit: "thermal",         msg: "CPU package temp approaching 90°C" },
  { level: "INFO", unit: "uvicorn",         msg: "Application startup complete on :8000" },
  { level: "INFO", unit: "dbus",            msg: "Activated service com.canonical.Unity" },
  { level: "WARN", unit: "gnome-shell",     msg: "Extension 'dash-to-dock' slow startup" },
  { level: "INFO", unit: "tracker",         msg: "Indexed 12 new files in ~/Documents" },
  { level: "INFO", unit: "systemd-journal", msg: "Journal flushed to /var/log/journal" },
  { level: "INFO", unit: "git",             msg: "system-architect: 0 new commits since 17:00" },
  { level: "ERR",  unit: "docker",          msg: "Cannot connect to daemon: socket inactive" },
  { level: "INFO", unit: "udisks2",         msg: "Mounted /dev/sda1 at /boot/efi" },
];

const CenterPanel: React.FC<CenterPanelProps> = ({ telemetry }) => {
  const { cpu, memory } = telemetry;
  const cores = cpu.cores || 4;

  // Simulated load averages derived from cpu.usage
  const load1  = parseFloat(((cpu.usage / 100) * cores * 0.95).toFixed(2));
  const load5  = parseFloat(((cpu.usage / 100) * cores * 0.80).toFixed(2));
  const load15 = parseFloat(((cpu.usage / 100) * cores * 0.65).toFixed(2));

  const [procs, setProcs] = useState<Proc[]>(() => buildProcs(cpu.usage, memory.percentage));
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [tick, setTick] = useState(0);

  // Refresh process list every 2s
  useEffect(() => {
    const t = setInterval(() => {
      setProcs(buildProcs(cpu.usage, memory.percentage));
      setTick(n => n + 1);
    }, 2000);
    return () => clearInterval(t);
  }, [cpu.usage, memory.percentage]);

  // Drip journal log entries every 5s
  useEffect(() => {
    const addLog = () => {
      const entry = LOG_POOL[Math.floor(Math.random() * LOG_POOL.length)];
      const ts = new Date().toLocaleTimeString();
      setLogs(prev => [{ ...entry, ts }, ...prev].slice(0, 12));
    };
    addLog();
    const t = setInterval(addLog, 5000);
    return () => clearInterval(t);
  }, []);

  const levelColor = (l: LogEntry["level"]) =>
    l === "ERR" ? "#ef4444" : l === "WARN" ? "#f59e0b" : "var(--color-primary)";

  return (
    <div className="w-full h-full grid gap-3 min-h-0" style={{ gridTemplateColumns: "1fr 1fr", gridTemplateRows: "auto auto 1fr" }}>

      {/* ── LOAD AVERAGES (top-left) ─────────────────────── */}
      <div className="hud-panel p-3 flex flex-col gap-2">
        <div className="hud-header text-xs tracking-wider font-bold font-mono pb-1.5 flex items-center justify-between whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" style={{ color: "var(--color-primary)" }} />
            <span>SYSTEM LOAD</span>
          </div>
          <span className="text-[9px] text-text-dim">{cores} CORE · {(cpu.frequency / 1000).toFixed(2)} GHz</span>
        </div>
        <div className="flex flex-col gap-2">
          <LoadBar val={load1}  max={cores} label="LOAD  1m" />
          <LoadBar val={load5}  max={cores} label="LOAD  5m" />
          <LoadBar val={load15} max={cores} label="LOAD 15m" />
        </div>
        <div className="grid grid-cols-3 gap-1.5 pt-1 font-mono text-[9px] text-center border-t border-white/5">
          <div className="bg-black/20 rounded p-1">
            <div className="text-text-dim">THREADS</div>
            <div style={{ color: "var(--color-primary)" }} className="font-bold">{procs.length * 3}</div>
          </div>
          <div className="bg-black/20 rounded p-1">
            <div className="text-text-dim">PROCS</div>
            <div style={{ color: "var(--color-primary)" }} className="font-bold">{procs.length + 40}</div>
          </div>
          <div className="bg-black/20 rounded p-1">
            <div className="text-text-dim">ZOMBIE</div>
            <div className="font-bold text-text">0</div>
          </div>
        </div>
      </div>

      {/* ── PER-CORE USAGE (top-right) ───────────────────── */}
      <div className="hud-panel p-3 flex flex-col gap-2">
        <div className="hud-header text-xs tracking-wider font-bold font-mono pb-1.5 flex items-center justify-between whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" style={{ color: "var(--color-secondary)" }} />
            <span>PER-CORE USAGE</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: "var(--color-primary)" }} />
            <span className="text-[9px] text-text-dim">LIVE</span>
          </div>
        </div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {cpu.per_core.slice(0, 8).map((v, i) => {
            const col = v > 85 ? "#ef4444" : v > 60 ? "#f59e0b" : "var(--color-primary)";
            return (
              <div key={i} className="flex items-center gap-1.5 font-mono text-[9px]">
                <span className="text-text-dim w-4 shrink-0">C{i}</span>
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${v}%`, backgroundColor: col }} />
                </div>
                <span className="w-5 text-right" style={{ color: col }}>{Math.round(v)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── TOP PROCESSES (middle row, full width) ───────── */}
      <div className="hud-panel p-3 flex flex-col gap-1.5 overflow-hidden" style={{ gridColumn: "1 / -1" }}>
        <div className="hud-header text-xs tracking-wider font-bold font-mono pb-1.5 flex items-center justify-between whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" style={{ color: "var(--color-primary)" }} />
            <span>TOP PROCESSES</span>
          </div>
          <span className="text-[9px] text-text-dim font-mono">sorted by CPU · 2s refresh</span>
        </div>

        {/* Table header */}
        <div className="grid font-mono text-[9px] text-text-dim px-1 border-b border-white/5 pb-1"
          style={{ gridTemplateColumns: "32px 1fr 48px 64px 80px 36px" }}>
          <span>PID</span>
          <span>PROCESS</span>
          <span className="text-center">STATUS</span>
          <span className="text-center">CPU %</span>
          <span className="text-center">MEM %</span>
          <span></span>
        </div>

        <div className="overflow-y-auto scrollbar-none space-y-0.5">
          {procs.map((p) => {
            const cpuCol = p.cpu > 20 ? "#ef4444" : p.cpu > 10 ? "#f59e0b" : "var(--color-primary)";
            return (
              <div key={p.pid}
                className="grid items-center py-1 px-1 rounded font-mono text-[10px] hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                style={{ gridTemplateColumns: "32px 1fr 48px 64px 80px 36px" }}>
                <span className="text-text-dim text-[9px]">{p.pid}</span>
                <span className="text-text truncate pr-2">{p.name}</span>
                <span className="text-center text-[9px]" style={{ color: p.status === "I" ? "#52525b" : "var(--color-primary)" }}>{p.status}</span>

                {/* CPU bar + value */}
                <div className="flex items-center gap-1 justify-center">
                  <div className="w-8 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(p.cpu * 2, 100)}%`, backgroundColor: cpuCol }} />
                  </div>
                  <span className="text-[9px] w-6" style={{ color: cpuCol }}>{p.cpu.toFixed(0)}</span>
                </div>

                {/* MEM bar + value */}
                <div className="flex items-center gap-1 justify-center">
                  <div className="w-8 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(p.mem * 2, 100)}%`, backgroundColor: "var(--color-secondary)" }} />
                  </div>
                  <span className="text-[9px] w-6" style={{ color: "var(--color-secondary)" }}>{p.mem.toFixed(1)}</span>
                </div>

                {/* Sparkline */}
                <Spark value={p.cpu} max={50} color={cpuCol} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SYSTEM JOURNAL (bottom row, full width) ──────── */}
      <div className="hud-panel p-3 flex flex-col gap-1.5 min-h-0 overflow-hidden" style={{ gridColumn: "1 / -1" }}>
        <div className="hud-header text-xs tracking-wider font-bold font-mono pb-1.5 flex items-center justify-between whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <ScrollText className="w-3.5 h-3.5" style={{ color: "var(--color-primary)" }} />
            <span>SYSTEM JOURNAL</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: "var(--color-primary)" }} />
            <span className="text-[9px] text-text-dim">LIVE · 5s interval</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-none space-y-0.5">
          {logs.map((log, i) => (
            <div key={i} className="flex gap-2 font-mono text-[9px] leading-relaxed border-b border-white/3 pb-0.5 last:border-0">
              <span className="text-text-dim shrink-0">{log.ts}</span>
              <span className="shrink-0 font-bold w-8" style={{ color: levelColor(log.level) }}>{log.level}</span>
              <span className="shrink-0 text-text-dim w-20 truncate">{log.unit}</span>
              <span className="text-text">{log.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CenterPanel;
