import datetime
from typing import Dict, Any
from backend.app.collectors.system import SystemCollector
from backend.app.collectors.developer import DeveloperCollector

class CollectorManager:
    def __init__(self):
        self.system_collector = SystemCollector()
        self.developer_collector = DeveloperCollector()

    def get_telemetry(self) -> Dict[str, Any]:
        """
        Gathers telemetry from all collectors and merges them into a single dict.
        """
        system_data = self.system_collector.collect()
        developer_data = self.developer_collector.collect()
        
        return {
            "cpu": system_data["cpu"],
            "memory": system_data["memory"],
            "disk": system_data["disk"],
            "network": system_data["network"],
            "battery": system_data["battery"],
            "temperature": system_data["temperature"],
            "developer": developer_data,
            "system": system_data["system"],
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        }

# Global manager instance
collector_manager = CollectorManager()
