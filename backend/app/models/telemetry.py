from pydantic import BaseModel
from typing import List, Optional

class CpuTelemetry(BaseModel):
    usage: float
    frequency: float
    cores: int
    per_core: List[float]

class MemoryTelemetry(BaseModel):
    total: int
    used: int
    free: int
    percentage: float

class DiskTelemetry(BaseModel):
    total: int
    used: int
    free: int
    percentage: float
    read_speed: float
    write_speed: float

class NetworkTelemetry(BaseModel):
    upload_rate: float
    download_rate: float
    interfaces: List[str]

class BatteryTelemetry(BaseModel):
    percentage: Optional[float] = None
    charging: Optional[bool] = None
    remaining_time: Optional[int] = None

class TemperatureTelemetry(BaseModel):
    cpu: Optional[float] = None
    gpu: Optional[float] = None

class GitTelemetry(BaseModel):
    repo: Optional[str] = None
    branch: Optional[str] = None
    modified_files: int = 0
    uncommitted_changes: bool = False
    commits_today: int = 0

class DockerTelemetry(BaseModel):
    running_containers: int = 0
    total_containers: int = 0
    status: str = "inactive" # healthy, warning, inactive

class IdesTelemetry(BaseModel):
    vscode: bool = False
    cursor: bool = False
    jetbrains: List[str] = []
    terminal_count: int = 0

class DeveloperTelemetry(BaseModel):
    git: GitTelemetry
    docker: DockerTelemetry
    ides: IdesTelemetry

class SystemDetailsTelemetry(BaseModel):
    hostname: str
    uptime: float
    kernel: str
    distro: str

class TelemetryDataModel(BaseModel):
    cpu: CpuTelemetry
    memory: MemoryTelemetry
    disk: DiskTelemetry
    network: NetworkTelemetry
    battery: BatteryTelemetry
    temperature: TemperatureTelemetry
    developer: DeveloperTelemetry
    system: SystemDetailsTelemetry
    timestamp: str
