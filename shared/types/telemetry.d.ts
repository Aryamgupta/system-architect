export interface CpuTelemetry {
  usage: number;
  frequency: number;
  cores: number;
  per_core: number[];
}

export interface MemoryTelemetry {
  total: number;
  used: number;
  free: number;
  percentage: number;
}

export interface DiskTelemetry {
  total: number;
  used: number;
  free: number;
  percentage: number;
  read_speed: number; // in bytes per second
  write_speed: number; // in bytes per second
}

export interface NetworkTelemetry {
  upload_rate: number; // in bytes per second
  download_rate: number; // in bytes per second
  interfaces: string[];
}

export interface BatteryTelemetry {
  percentage: number | null;
  charging: boolean | null;
  remaining_time: number | null; // in seconds, null if charging/discharging cannot be computed
}

export interface TemperatureTelemetry {
  cpu: number | null;
  gpu: number | null;
}

export interface GitTelemetry {
  repo: string | null;
  branch: string | null;
  modified_files: number;
  uncommitted_changes: boolean;
  commits_today: number;
}

export interface DockerTelemetry {
  running_containers: number;
  total_containers: number;
  status: string; // 'healthy', 'warning', 'inactive'
}

export interface IdesTelemetry {
  vscode: boolean;
  cursor: boolean;
  jetbrains: string[];
  terminal_count: number;
}

export interface DeveloperTelemetry {
  git: GitTelemetry;
  docker: DockerTelemetry;
  ides: IdesTelemetry;
}

export interface SystemDetailsTelemetry {
  hostname: string;
  uptime: number;
  kernel: string;
  distro: string;
}

export interface TelemetryData {
  cpu: CpuTelemetry;
  memory: MemoryTelemetry;
  disk: DiskTelemetry;
  network: NetworkTelemetry;
  battery: BatteryTelemetry;
  temperature: TemperatureTelemetry;
  developer: DeveloperTelemetry;
  system: SystemDetailsTelemetry;
  timestamp: string;
}
