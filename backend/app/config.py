import os
from pathlib import Path
from typing import List

class Settings:
    # API configuration
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Telemetry streaming interval in seconds
    UPDATE_INTERVAL: float = float(os.getenv("UPDATE_INTERVAL", "1.0"))
    
    # Monitored directory roots for Git workspace detection
    # Defaulting to common locations
    WORKSPACE_ROOTS: List[str] = [
        str(Path.home() / "Documents"),
        str(Path.home() / "Projects"),
        str(Path.home() / "src"),
        "/home/aryam/Documents/system-architect"
    ]
    
    # Ignore patterns for Git scans
    IGNORE_PATTERNS: List[str] = [
        "node_modules",
        "venv",
        ".venv",
        "env",
        ".git",
        "build",
        "dist",
        "target",
        "__pycache__"
    ]
    
    # GPU Vendor to check (auto, nvidia, amd, intel)
    GPU_VENDOR: str = os.getenv("GPU_VENDOR", "auto")

settings = Settings()
