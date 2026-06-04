import React from "react";
import { GitBranch, GitCommit, FileCode, CheckCircle, AlertTriangle, Play, Terminal, AppWindow, Cpu } from "lucide-react";
import type { TelemetryData } from "../../../shared/types/telemetry";

interface LeftPanelProps {
  telemetry: TelemetryData;
  showGit: boolean;
  showDocker: boolean;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({ telemetry, showGit, showDocker }) => {
  const { git, docker, ides } = telemetry.developer;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 1. IDEs & Terminals Status */}
      <div className="hud-panel p-4 flex-1 flex flex-col min-h-0">
        <div className="hud-header text-sm tracking-wider font-bold mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AppWindow className="w-4 h-4 text-primary" style={{ color: "var(--color-primary)" }} />
            <span>DEV WORKSTATION</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" style={{ backgroundColor: "var(--color-primary)" }} />
            <span className="text-[10px] text-primary/80 uppercase tracking-widest font-mono">LIVE</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 bg-surface/30 border border-primary/10 rounded-md flex flex-col justify-between">
            <span className="text-[10px] font-mono text-text-dim tracking-wider">SHELL INSTANCES</span>
            <div className="flex items-end justify-between mt-1">
              <Terminal className="w-5 h-5 text-primary" style={{ color: "var(--color-primary)" }} />
              <span className="text-2xl font-mono font-bold text-primary neon-text-glow" style={{ color: "var(--color-primary)" }}>{ides.terminal_count}</span>
            </div>
          </div>
          <div className="p-3 bg-surface/30 border border-primary/10 rounded-md flex flex-col justify-between">
            <span className="text-[10px] font-mono text-text-dim tracking-wider">ACTIVE IDEs</span>
            <div className="flex items-end justify-between mt-1">
              <FileCode className="w-5 h-5 text-primary" style={{ color: "var(--color-primary)" }} />
              <span className="text-2xl font-mono font-bold text-primary neon-text-glow" style={{ color: "var(--color-primary)" }}>
                {(ides.vscode ? 1 : 0) + (ides.cursor ? 1 : 0) + ides.jetbrains.length}
              </span>
            </div>
          </div>
        </div>

        {/* IDE details */}
        <div className="space-y-2 font-mono text-xs flex-1 overflow-y-auto pr-1">
          <div className="flex justify-between items-center p-2 rounded bg-surface/10 border border-white/5">
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${ides.vscode ? "bg-primary animate-pulse" : "bg-zinc-800"}`} style={{ backgroundColor: ides.vscode ? "var(--color-primary)" : undefined }} />
              <span>VS Code</span>
            </span>
            <span className={ides.vscode ? "text-primary uppercase tracking-widest font-bold" : "text-zinc-600"} style={{ color: ides.vscode ? "var(--color-primary)" : undefined }}>
              {ides.vscode ? "Running" : "Offline"}
            </span>
          </div>

          <div className="flex justify-between items-center p-2 rounded bg-surface/10 border border-white/5">
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${ides.cursor ? "bg-primary animate-pulse" : "bg-zinc-800"}`} style={{ backgroundColor: ides.cursor ? "var(--color-primary)" : undefined }} />
              <span>Cursor</span>
            </span>
            <span className={ides.cursor ? "text-primary uppercase tracking-widest font-bold" : "text-zinc-600"} style={{ color: ides.cursor ? "var(--color-primary)" : undefined }}>
              {ides.cursor ? "Running" : "Offline"}
            </span>
          </div>

          {ides.jetbrains.map((jb, idx) => (
            <div key={idx} className="flex justify-between items-center p-2 rounded bg-surface/10 border border-white/5">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ backgroundColor: "var(--color-primary)" }} />
                <span>{jb}</span>
              </span>
              <span className="text-primary uppercase tracking-widest font-bold" style={{ color: "var(--color-primary)" }}>
                Active
              </span>
            </div>
          ))}

          {!(ides.vscode || ides.cursor || ides.jetbrains.length) && (
            <div className="text-center py-4 text-text-dim/40 italic">
              No developer editor processes detected.
            </div>
          )}
        </div>
      </div>

      {/* 2. Git Status Panel */}
      {showGit && (
        <div className="hud-panel p-4 flex-1 flex flex-col min-h-0">
          <div className="hud-header text-sm tracking-wider font-bold mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-primary" style={{ color: "var(--color-primary)" }} />
              <span>GIT TELEMETRY</span>
            </div>
            <span className="text-[10px] font-mono text-text-dim truncate max-w-[150px]">
              {git.repo || "No Workspace"}
            </span>
          </div>

          {git.repo ? (
            <div className="space-y-3 flex-1 flex flex-col justify-between font-mono text-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-surface/20 rounded border border-white/5">
                  <span className="text-text-dim text-[11px]">ACTIVE BRANCH</span>
                  <span className="flex items-center gap-1.5 text-primary font-bold" style={{ color: "var(--color-primary)" }}>
                    <GitBranch className="w-3.5 h-3.5" />
                    {git.branch}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 bg-surface/20 rounded border border-white/5">
                  <span className="text-text-dim text-[11px]">MODIFIED FILES</span>
                  <span className={`font-bold ${git.modified_files > 0 ? "text-amber-500" : "text-primary"}`} style={{ color: git.modified_files > 0 ? undefined : "var(--color-primary)" }}>
                    {git.modified_files} files
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 bg-surface/20 rounded border border-white/5">
                  <span className="text-text-dim text-[11px]">TODAY COMMITS</span>
                  <span className="flex items-center gap-1 text-primary font-bold" style={{ color: "var(--color-primary)" }}>
                    <GitCommit className="w-3.5 h-3.5" />
                    {git.commits_today}
                  </span>
                </div>
              </div>

              {/* Status bar */}
              <div className={`p-2 rounded text-center border font-bold text-[11px] ${
                git.uncommitted_changes 
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-500 animate-pulse"
                  : "bg-primary/10 border-primary/30 text-primary"
              }`}
              style={{
                borderColor: git.uncommitted_changes ? undefined : "var(--color-border)",
                color: git.uncommitted_changes ? undefined : "var(--color-primary)"
              }}>
                {git.uncommitted_changes ? "UNCOMMITTED CHANGES IN TREE" : "WORKSPACE CLEAN"}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
              <span className="text-text-dim/40 text-xs italic">
                Scanning workspace folders for active Git repositories...
              </span>
            </div>
          )}
        </div>
      )}

      {/* 3. Docker Monitor */}
      {showDocker && (
        <div className="hud-panel p-4 flex-1 flex flex-col min-h-0">
          <div className="hud-header text-sm tracking-wider font-bold mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary" style={{ color: "var(--color-primary)" }} />
              <span>DOCKER CONTAINERS</span>
            </div>
            <div className="flex items-center gap-1.5">
              {docker.status === "healthy" && <CheckCircle className="w-3.5 h-3.5 text-primary" style={{ color: "var(--color-primary)" }} />}
              {docker.status === "warning" && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
              {docker.status === "inactive" && <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />}
              <span className="text-[10px] font-mono text-text-dim uppercase tracking-wider">
                {docker.status}
              </span>
            </div>
          </div>

          {docker.status !== "inactive" ? (
            <div className="space-y-4 flex-1 flex flex-col justify-between font-mono text-xs">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 bg-surface/30 border border-primary/10 rounded">
                  <div className="text-[10px] text-text-dim">RUNNING</div>
                  <div className="text-xl font-bold text-primary mt-1" style={{ color: "var(--color-primary)" }}>{docker.running_containers}</div>
                </div>
                <div className="p-2 bg-surface/30 border border-primary/10 rounded">
                  <div className="text-[10px] text-text-dim">TOTAL</div>
                  <div className="text-xl font-bold text-text mt-1">{docker.total_containers}</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-text-dim">
                  <span>DEPLOYMENT CAPACITY</span>
                  <span>{docker.total_containers > 0 ? Math.round((docker.running_containers / docker.total_containers) * 100) : 0}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-primary transition-all duration-500" 
                    style={{ 
                      width: `${docker.total_containers > 0 ? (docker.running_containers / docker.total_containers) * 100 : 0}%`,
                      backgroundColor: "var(--color-primary)"
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 bg-surface/20 rounded border border-white/5 text-[11px] text-text-dim">
                <Play className="w-3.5 h-3.5 text-primary" style={{ color: "var(--color-primary)" }} />
                <span>Socket /var/run/docker.sock: Connected</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
              <span className="text-text-dim/40 text-xs italic">
                Docker daemon is inactive or not found on this system.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default LeftPanel;
