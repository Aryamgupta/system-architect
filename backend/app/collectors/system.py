import time
import os
import psutil
from typing import Dict, Any, List, Optional
from backend.app.collectors.base import BaseCollector

class SystemCollector(BaseCollector):
    def __init__(self):
        # State tracking for calculating rates (bytes/sec)
        self.last_time = time.time()
        
        # Disk IO state
        try:
            disk_io = psutil.disk_io_counters()
            self.last_disk_read = disk_io.read_bytes if disk_io else 0
            self.last_disk_write = disk_io.write_bytes if disk_io else 0
        except Exception:
            self.last_disk_read = 0
            self.last_disk_write = 0
            
        # Network IO state
        try:
            net_io = psutil.net_io_counters()
            self.last_net_sent = net_io.bytes_sent if net_io else 0
            self.last_net_recv = net_io.bytes_recv if net_io else 0
        except Exception:
            self.last_net_sent = 0
            self.last_net_recv = 0

        # Cache paths for GPU/CPU sysfs temperatures to save battery
        self.gpu_temp_path = self._find_gpu_temp_path()
        self.cpu_temp_path = self._find_cpu_temp_path()

    def collect(self) -> Dict[str, Any]:
        current_time = time.time()
        dt = current_time - self.last_time
        if dt <= 0:
            dt = 1.0
        self.last_time = current_time

        cpu_data = self._collect_cpu()
        memory_data = self._collect_memory()
        disk_data = self._collect_disk(dt)
        network_data = self._collect_network(dt)
        battery_data = self._collect_battery()
        temp_data = self._collect_temperature()
        system_data = self._collect_system()

        return {
            "cpu": cpu_data,
            "memory": memory_data,
            "disk": disk_data,
            "network": network_data,
            "battery": battery_data,
            "temperature": temp_data,
            "system": system_data
        }

    def _collect_system(self) -> Dict[str, Any]:
        import socket
        import platform
        
        # 1. Hostname
        hostname = socket.gethostname()
        
        # 2. Kernel
        kernel = platform.release()
        
        # 3. Distro
        distro = "Linux"
        if os.path.exists("/etc/os-release"):
            try:
                with open("/etc/os-release", "r") as f:
                    for line in f:
                        if line.startswith("PRETTY_NAME="):
                            distro = line.split("=")[1].strip().strip('"')
                            break
            except Exception:
                pass
                
        # 4. Uptime in seconds
        uptime = 0.0
        if os.path.exists("/proc/uptime"):
            try:
                with open("/proc/uptime", "r") as f:
                    uptime = float(f.readline().split()[0])
            except Exception:
                pass
                
        return {
            "hostname": hostname,
            "uptime": uptime,
            "kernel": kernel,
            "distro": distro
        }


    def _collect_cpu(self) -> Dict[str, Any]:
        # non-blocking CPU check
        usage = psutil.cpu_percent(interval=None)
        per_core = psutil.cpu_percent(interval=None, percpu=True)
        
        # Frequency
        freq = 0.0
        try:
            cpu_freq = psutil.cpu_freq()
            if cpu_freq:
                freq = cpu_freq.current
        except Exception:
            pass
            
        cores = psutil.cpu_count(logical=True) or 1
        
        return {
            "usage": usage,
            "frequency": freq,
            "cores": cores,
            "per_core": per_core
        }

    def _collect_memory(self) -> Dict[str, Any]:
        vm = psutil.virtual_memory()
        return {
            "total": vm.total,
            "used": vm.used,
            "free": vm.free,
            "percentage": vm.percent
        }

    def _collect_disk(self, dt: float) -> Dict[str, Any]:
        # Usage info for root partition
        try:
            usage = psutil.disk_usage('/')
            total = usage.total
            used = usage.used
            free = usage.free
            percent = usage.percent
        except Exception:
            total = used = free = percent = 0

        # Speed calculation
        read_speed = 0.0
        write_speed = 0.0
        try:
            disk_io = psutil.disk_io_counters()
            if disk_io:
                curr_read = disk_io.read_bytes
                curr_write = disk_io.write_bytes
                
                read_speed = max(0.0, (curr_read - self.last_disk_read) / dt)
                write_speed = max(0.0, (curr_write - self.last_disk_write) / dt)
                
                self.last_disk_read = curr_read
                self.last_disk_write = curr_write
        except Exception:
            pass

        return {
            "total": total,
            "used": used,
            "free": free,
            "percentage": percent,
            "read_speed": read_speed,
            "write_speed": write_speed
        }

    def _collect_network(self, dt: float) -> Dict[str, Any]:
        # List of interfaces
        interfaces = []
        try:
            for name, stats in psutil.net_if_stats().items():
                if stats.isup and not name.startswith("lo"):
                    interfaces.append(name)
        except Exception:
            pass

        # Speed calculation
        upload_rate = 0.0
        download_rate = 0.0
        try:
            net_io = psutil.net_io_counters()
            if net_io:
                curr_sent = net_io.bytes_sent
                curr_recv = net_io.bytes_recv
                
                upload_rate = max(0.0, (curr_sent - self.last_net_sent) / dt)
                download_rate = max(0.0, (curr_recv - self.last_net_recv) / dt)
                
                self.last_net_sent = curr_sent
                self.last_net_recv = curr_recv
        except Exception:
            pass

        return {
            "upload_rate": upload_rate,
            "download_rate": download_rate,
            "interfaces": interfaces
        }

    def _collect_battery(self) -> Dict[str, Any]:
        try:
            battery = psutil.sensors_battery()
            if battery:
                return {
                    "percentage": battery.percent,
                    "charging": battery.power_plugged,
                    "remaining_time": battery.secsleft if battery.secsleft >= 0 else None
                }
        except Exception:
            pass
        return {
            "percentage": None,
            "charging": None,
            "remaining_time": None
        }

    def _collect_temperature(self) -> Dict[str, Any]:
        cpu_temp = None
        gpu_temp = None
        
        # 1. CPU Temp from sysfs or psutil
        if self.cpu_temp_path:
            cpu_temp = self._read_sysfs_temp(self.cpu_temp_path)
            
        if cpu_temp is None:
            try:
                temps = psutil.sensors_temperatures()
                for name in ['coretemp', 'cpu_thermal', 'k10temp', 'zenpower', 'acpitz']:
                    if name in temps and temps[name]:
                        cpu_temp = temps[name][0].current
                        break
            except Exception:
                pass
                
        # 2. GPU Temp from sysfs or fallback nvidia-smi
        if self.gpu_temp_path:
            gpu_temp = self._read_sysfs_temp(self.gpu_temp_path)
            
        if gpu_temp is None:
            # Fallback for NVIDIA cards using nvidia-smi (quiet query to minimize impact)
            try:
                import subprocess
                out = subprocess.check_output(
                    ["nvidia-smi", "--query-gpu=temperature.gpu", "--format=csv,noheader,nounits"],
                    stderr=subprocess.DEVNULL
                )
                gpu_temp = float(out.decode().strip())
            except Exception:
                pass

        return {
            "cpu": cpu_temp,
            "gpu": gpu_temp
        }

    def _read_sysfs_temp(self, path: str) -> Optional[float]:
        try:
            with open(path, "r") as f:
                val = f.read().strip()
                return float(val) / 1000.0 # Convert millidegrees to degrees C
        except Exception:
            return None

    def _find_cpu_temp_path(self) -> Optional[str]:
        # Search sysfs for CPU temperatures
        base_dir = "/sys/class/hwmon"
        if not os.path.exists(base_dir):
            return None
            
        try:
            for hwmon in os.listdir(base_dir):
                path = os.path.join(base_dir, hwmon)
                # Check the name of the sensor
                name_file = os.path.join(path, "name")
                if os.path.exists(name_file):
                    with open(name_file, "r") as f:
                        name = f.read().strip()
                    if name in ["coretemp", "k10temp", "cpu_thermal", "zenpower"]:
                        # Look for temp1_input or temp2_input (package temp is usually temp1 or temp2)
                        for t in ["temp1_input", "temp2_input"]:
                            t_path = os.path.join(path, t)
                            if os.path.exists(t_path):
                                return t_path
        except Exception:
            pass
        return None

    def _find_gpu_temp_path(self) -> Optional[str]:
        # Search sysfs for AMD or Intel/Nvidia GPU temp sensors
        base_dir = "/sys/class/hwmon"
        if not os.path.exists(base_dir):
            return None
            
        try:
            for hwmon in os.listdir(base_dir):
                path = os.path.join(base_dir, hwmon)
                name_file = os.path.join(path, "name")
                if os.path.exists(name_file):
                    with open(name_file, "r") as f:
                        name = f.read().strip()
                    # AMD/Intel GPUs are named amdgpu or i915
                    if name in ["amdgpu", "nouveau"]:
                        t_path = os.path.join(path, "temp1_input")
                        if os.path.exists(t_path):
                            return t_path
        except Exception:
            pass
        return None
