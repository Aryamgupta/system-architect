import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings as GearIcon, X, Check, Monitor, Cpu, Sparkles } from "lucide-react";
import type { DashboardSettings } from "../hooks/useTelemetry";

interface SettingsPanelProps {
  settings: DashboardSettings;
  updateSettings: (updates: Partial<DashboardSettings>) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  updateSettings,
  isOpen,
  setIsOpen,
}) => {
  const themes: Array<{ id: DashboardSettings["theme"]; name: string; color: string }> = [
    { id: "cyan", name: "Deep Obsidian", color: "bg-[#00f2fe]" },
    { id: "emerald", name: "Bio Green", color: "bg-[#00ff87]" },
    { id: "violet", name: "Hyper Violet", color: "bg-[#d946ef]" },
    { id: "amber", name: "Solar Amber", color: "bg-[#f59e0b]" },
  ];

  const qualities: Array<DashboardSettings["animationQuality"]> = [
    "low",
    "medium",
    "high",
    "ultra",
  ];

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-40 p-2.5 bg-black/60 hover:bg-black/80 border border-primary/30 hover:border-primary/80 rounded-lg text-primary transition-all duration-300 shadow-[0_0_10px_rgba(0,0,0,0.5)] cursor-pointer"
        aria-label="Open Settings"
        style={{ color: "var(--color-primary)", borderColor: "var(--color-border)" }}
      >
        <GearIcon className="w-5 h-5 animate-[spin_10s_linear_infinite]" />
      </button>

      {/* Slide-in settings drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 cursor-pointer"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-80 bg-black/85 backdrop-blur-xl border-l border-primary/20 z-50 p-6 flex flex-col justify-between shadow-[-10px_0_30px_rgba(0,0,0,0.8)]"
              style={{ borderLeftColor: "var(--color-border)" }}
            >
              <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center border-b border-primary/20 pb-3" style={{ borderBottomColor: "var(--color-border)" }}>
                  <h2 className="text-lg font-mono tracking-wider font-semibold text-primary flex items-center gap-2" style={{ color: "var(--color-primary)" }}>
                    <Sparkles className="w-5 h-5" />
                    CONFIG PANEL
                  </h2>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 text-text-dim hover:text-primary transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Themes Selection */}
                <div className="space-y-3">
                  <label className="text-xs font-mono font-bold tracking-widest text-text-dim uppercase">
                    COLOR SCHEME
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {themes.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => updateSettings({ theme: t.id })}
                        className={`flex items-center justify-between p-2.5 rounded-md border text-left text-xs font-mono transition-all cursor-pointer ${
                          settings.theme === t.id
                            ? "bg-primary/10 border-primary text-text font-bold shadow-[0_0_10px_var(--color-glow)]"
                            : "bg-surface/40 border-primary/10 text-text-dim hover:bg-surface/80"
                        }`}
                        style={{
                          borderColor: settings.theme === t.id ? "var(--color-primary)" : "rgba(255,255,255,0.05)",
                          backgroundColor: settings.theme === t.id ? "rgba(var(--color-surface), 0.3)" : undefined
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-3.5 h-3.5 rounded-full ${t.color} shadow-sm`} />
                          {t.name}
                        </div>
                        {settings.theme === t.id && <Check className="w-3.5 h-3.5 text-primary" style={{ color: "var(--color-primary)" }} />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modules Visibilities */}
                <div className="space-y-3">
                  <label className="text-xs font-mono font-bold tracking-widest text-text-dim uppercase">
                    HUD COMPONENTS
                  </label>
                  <div className="space-y-2">
                    <button
                      onClick={() => updateSettings({ showGit: !settings.showGit })}
                      className="flex items-center justify-between w-full p-2.5 rounded-md border border-primary/10 bg-surface/30 text-xs font-mono text-left cursor-pointer hover:bg-surface/50 transition-all"
                      style={{ borderColor: "rgba(255,255,255,0.05)" }}
                    >
                      <span>Git Telemetry</span>
                      <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 ${settings.showGit ? "bg-primary" : "bg-zinc-800"}`} style={{ backgroundColor: settings.showGit ? "var(--color-primary)" : undefined }}>
                        <div className={`w-4 h-4 rounded-full bg-black transition-transform duration-300 ${settings.showGit ? "translate-x-4" : "translate-x-0"}`} />
                      </div>
                    </button>

                    <button
                      onClick={() => updateSettings({ showDocker: !settings.showDocker })}
                      className="flex items-center justify-between w-full p-2.5 rounded-md border border-primary/10 bg-surface/30 text-xs font-mono text-left cursor-pointer hover:bg-surface/50 transition-all"
                      style={{ borderColor: "rgba(255,255,255,0.05)" }}
                    >
                      <span>Docker Monitor</span>
                      <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 ${settings.showDocker ? "bg-primary" : "bg-zinc-800"}`} style={{ backgroundColor: settings.showDocker ? "var(--color-primary)" : undefined }}>
                        <div className={`w-4 h-4 rounded-full bg-black transition-transform duration-300 ${settings.showDocker ? "translate-x-4" : "translate-x-0"}`} />
                      </div>
                    </button>

                    <button
                      onClick={() => updateSettings({ showNetwork: !settings.showNetwork })}
                      className="flex items-center justify-between w-full p-2.5 rounded-md border border-primary/10 bg-surface/30 text-xs font-mono text-left cursor-pointer hover:bg-surface/50 transition-all"
                      style={{ borderColor: "rgba(255,255,255,0.05)" }}
                    >
                      <span>Network Mesh Graph</span>
                      <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 ${settings.showNetwork ? "bg-primary" : "bg-zinc-800"}`} style={{ backgroundColor: settings.showNetwork ? "var(--color-primary)" : undefined }}>
                        <div className={`w-4 h-4 rounded-full bg-black transition-transform duration-300 ${settings.showNetwork ? "translate-x-4" : "translate-x-0"}`} />
                      </div>
                    </button>

                    <button
                      onClick={() => updateSettings({ showRadar: !settings.showRadar })}
                      className="flex items-center justify-between w-full p-2.5 rounded-md border border-primary/10 bg-surface/30 text-xs font-mono text-left cursor-pointer hover:bg-surface/50 transition-all"
                      style={{ borderColor: "rgba(255,255,255,0.05)" }}
                    >
                      <span>Radar rings</span>
                      <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 ${settings.showRadar ? "bg-primary" : "bg-zinc-800"}`} style={{ backgroundColor: settings.showRadar ? "var(--color-primary)" : undefined }}>
                        <div className={`w-4 h-4 rounded-full bg-black transition-transform duration-300 ${settings.showRadar ? "translate-x-4" : "translate-x-0"}`} />
                      </div>
                    </button>
                  </div>
                </div>

                {/* Animation Quality */}
                <div className="space-y-3">
                  <label className="text-xs font-mono font-bold tracking-widest text-text-dim uppercase">
                    ANIMATION QUALITY
                  </label>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-surface/40 border border-primary/10 rounded-md" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    {qualities.map((q) => (
                      <button
                        key={q}
                        onClick={() => updateSettings({ animationQuality: q })}
                        className={`py-1.5 rounded text-xs font-mono capitalize transition-all cursor-pointer ${
                          settings.animationQuality === q
                            ? "bg-primary text-black font-bold shadow-[0_0_5px_var(--color-glow)]"
                            : "text-text-dim hover:text-text hover:bg-surface/80"
                        }`}
                        style={{
                          backgroundColor: settings.animationQuality === q ? "var(--color-primary)" : undefined
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer info */}
              <div className="border-t border-primary/10 pt-4 flex flex-col gap-2" style={{ borderTopColor: "var(--color-border)" }}>
                <div className="flex items-center gap-2 text-xs font-mono text-text-dim">
                  <Monitor className="w-4 h-4 text-primary" style={{ color: "var(--color-primary)" }} />
                  <span>Platform: Linux x64</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-text-dim">
                  <Cpu className="w-4 h-4 text-primary" style={{ color: "var(--color-primary)" }} />
                  <span>Telemetry Stream: Active</span>
                </div>
                <div className="text-[10px] font-mono text-text-dim/50 text-center mt-2">
                  System Architect v1.0.0
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
export default SettingsPanel;
