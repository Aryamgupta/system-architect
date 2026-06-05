import { useState, useEffect, useRef } from "react";
import type { TelemetryData } from "../../../shared/types/telemetry";

// Default configuration settings for the dashboard
export interface DashboardSettings {
  theme: "cyan" | "emerald" | "violet" | "amber";
  showGit: boolean;
  showDocker: boolean;
  showNetwork: boolean;
  showRadar: boolean;
  animationQuality: "low" | "medium" | "high" | "ultra";
}

const DEFAULT_SETTINGS: DashboardSettings = {
  theme: "cyan",
  showGit: true,
  showDocker: true,
  showNetwork: true,
  showRadar: true,
  animationQuality: "high",
};

// Generates high-fidelity mock data mimicking system telemetry for offline testing / visual preview
const getMockTelemetry = (): TelemetryData => {
  const t = new Date().getTime();
  const cpuCount = 8;
  
  // Sine-wave CPU variation
  const baseCpu = 25 + Math.sin(t / 10000) * 15;
  const perCore = Array.from({ length: cpuCount }, (_, i) => 
    Math.max(0, Math.min(100, baseCpu + Math.sin(t / 2000 + i) * 20))
  );
  
  return {
    cpu: {
      usage: parseFloat(baseCpu.toFixed(1)),
      frequency: 2400 + Math.floor(Math.sin(t / 5000) * 400),
      cores: cpuCount,
      per_core: perCore,
    },
    memory: {
      total: 17179869184, // 16GB
      used: 8589934592 + Math.floor(Math.sin(t / 8000) * 1073741824), // 8GB + var
      free: 8589934592,
      percentage: parseFloat((50 + Math.sin(t / 8000) * 6).toFixed(1)),
    },
    disk: {
      total: 512110190592, // 512GB
      used: 256055095296,
      free: 256055095296,
      percentage: 50.0,
      read_speed: Math.max(0, 1024 * 100 + Math.sin(t / 1000) * 1024 * 50),
      write_speed: Math.max(0, 1024 * 50 + Math.cos(t / 1000) * 1024 * 25),
    },
    network: {
      upload_rate: Math.max(0, 1024 * 25 + Math.sin(t / 1500) * 1024 * 20),
      download_rate: Math.max(0, 1024 * 350 + Math.sin(t / 1200) * 1024 * 250),
      interfaces: ["wlan0", "docker0"],
    },
    battery: {
      percentage: 85,
      charging: true,
      remaining_time: 4200,
    },
    temperature: {
      cpu: parseFloat((45 + Math.sin(t / 8000) * 5).toFixed(1)),
      gpu: parseFloat((52 + Math.sin(t / 6000) * 4).toFixed(1)),
    },
    developer: {
      git: {
        repo: "system-architect",
        branch: "main",
        modified_files: 2,
        uncommitted_changes: true,
        commits_today: 4,
      },
      docker: {
        running_containers: 3,
        total_containers: 5,
        status: "healthy",
      },
      ides: {
        vscode: true,
        cursor: false,
        jetbrains: ["PyCharm"],
        terminal_count: 3,
      },
    },
    system: {
      hostname: "developer-center",
      uptime: 86450,
      kernel: "6.8.0-generic-linux",
      distro: "Ubuntu 24.04 LTS"
    },
    timestamp: new Date().toISOString(),
  };
};

// Safe LocalStorage wrapper for headless/sandboxed WebKit environments where localStorage may be null
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn("localStorage is not accessible:", e);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn("localStorage is not accessible:", e);
    }
  }
};

export const useTelemetry = () => {
  const [telemetry, setTelemetry] = useState<TelemetryData>(getMockTelemetry());
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [settings, setSettingsState] = useState<DashboardSettings>(() => {
    const saved = safeLocalStorage.getItem("system_architect_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_SETTINGS, ...parsed };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to apply settings and save to LocalStorage
  const updateSettings = (updates: Partial<DashboardSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...updates };
      safeLocalStorage.setItem("system_architect_settings", JSON.stringify(next));
      return next;
    });
  };

  // Sync settings theme to HTML body tag
  useEffect(() => {
    document.body.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  // Handle WebSocket Connection (runs once on mount)
  useEffect(() => {
    const connect = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Derive WebSocket URL from current page location so it works on
      // localhost, system-architect, or any custom hostname without hardcoding.
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      const host = window.location.hostname;
      const port = window.location.port || "9190";
      const wsUrl = `${proto}://${host}:${port}/ws/telemetry`;
      console.log(`Connecting to telemetry WebSocket: ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("Telemetry WebSocket connected.");
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data: TelemetryData = JSON.parse(event.data);
          setTelemetry(data);
        } catch (error) {
          console.error("Failed to parse telemetry socket message:", error);
        }
      };

      ws.onclose = (event) => {
        console.warn(`Telemetry WebSocket closed: ${event.reason}. Retrying in 3s...`);
        setIsConnected(false);
        wsRef.current = null;
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        console.error("Telemetry WebSocket error occurred:", error);
        ws.close();
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        // Prevent trigger onclose callback loop during unmount
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Fallback simulation when disconnected so UI still updates smoothly
  useEffect(() => {
    if (isConnected) return;

    console.log("Starting offline mock telemetry simulation...");
    const interval = setInterval(() => {
      setTelemetry(getMockTelemetry());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isConnected]);

  return {
    telemetry,
    isConnected,
    settings,
    updateSettings,
  };
};
