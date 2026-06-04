import os
import subprocess
import time
import psutil
from typing import Dict, Any, List, Optional
from pathlib import Path
from backend.app.collectors.base import BaseCollector
from backend.app.config import settings

class DeveloperCollector(BaseCollector):
    def __init__(self):
        self.last_process_scan = 0.0
        self.last_git_scan = 0.0
        self.last_docker_scan = 0.0
        
        # Cache dictionaries
        self.git_cache = {
            "repo": None,
            "branch": None,
            "modified_files": 0,
            "uncommitted_changes": False,
            "commits_today": 0
        }
        self.docker_cache = {
            "running_containers": 0,
            "total_containers": 0,
            "status": "inactive"
        }
        self.ides_cache = {
            "vscode": False,
            "cursor": False,
            "jetbrains": [],
            "terminal_count": 0
        }
        
        # Current active workspace path
        self.active_workspace_path: Optional[str] = None

    def collect(self) -> Dict[str, Any]:
        now = time.time()
        
        # 1. Update IDE and Process info (every 15s)
        if now - self.last_process_scan > 15.0 or not self.ides_cache:
            self._scan_processes()
            self.last_process_scan = now
            
        # 2. Update Git statistics (every 5s)
        if now - self.last_git_scan > 5.0:
            self._scan_git()
            self.last_git_scan = now
            
        # 3. Update Docker statistics (every 5s)
        if now - self.last_docker_scan > 5.0:
            self._scan_docker()
            self.last_docker_scan = now
            
        return {
            "git": self.git_cache,
            "docker": self.docker_cache,
            "ides": self.ides_cache
        }

    def _scan_processes(self):
        vscode_running = False
        cursor_running = False
        jetbrains_running = []
        terminal_count = 0
        
        detected_paths = []
        
        # Shell and IDE process name lists
        shell_names = {"bash", "zsh", "fish", "sh"}
        terminal_names = {"kitty", "alacritty", "konsole", "gnome-terminal-", "wezterm-gui", "xfce4-terminal", "termite"}
        
        jetbrains_binaries = {
            "idea": "IntelliJ IDEA",
            "pycharm": "PyCharm",
            "webstorm": "WebStorm",
            "clion": "CLion",
            "goland": "GoLand",
            "rider": "Rider",
            "studio": "Android Studio"
        }
        
        try:
            for p in psutil.process_iter(['name', 'cmdline', 'cwd']):
                try:
                    name = p.info['name'].lower() if p.info['name'] else ""
                    cmdline = p.info['cmdline'] or []
                    
                    # Count shells
                    if name in shell_names:
                        terminal_count += 1
                    elif any(term in name for term in terminal_names):
                        # Some terminal servers spawn children, but counting shells or processes is a good proxy
                        pass
                        
                    # VS Code
                    if "code" in name or name == "code-oss" or any("vscode" in c.lower() for c in cmdline):
                        vscode_running = True
                        # Look for workspace path arguments (absolute paths that exist)
                        for arg in cmdline:
                            if arg.startswith("/") and os.path.isdir(arg) and not any(ig in arg for ig in settings.IGNORE_PATTERNS):
                                detected_paths.append(arg)
                                
                    # Cursor
                    elif "cursor" in name or any("cursor" in c.lower() for c in cmdline):
                        cursor_running = True
                        for arg in cmdline:
                            if arg.startswith("/") and os.path.isdir(arg) and not any(ig in arg for ig in settings.IGNORE_PATTERNS):
                                detected_paths.append(arg)
                                
                    # JetBrains IDEs
                    else:
                        for jb_bin, jb_name in jetbrains_binaries.items():
                            if jb_bin in name or any(jb_bin in c.lower() for c in cmdline):
                                if jb_name not in jetbrains_running:
                                    jetbrains_running.append(jb_name)
                                # Try to grab folder from command line or cwd
                                for arg in cmdline:
                                    if arg.startswith("/") and os.path.isdir(arg) and not any(ig in arg for ig in settings.IGNORE_PATTERNS):
                                        detected_paths.append(arg)
                                if p.info['cwd'] and os.path.isdir(p.info['cwd']):
                                    detected_paths.append(p.info['cwd'])
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    continue
        except Exception:
            pass

        self.ides_cache = {
            "vscode": vscode_running,
            "cursor": cursor_running,
            "jetbrains": jetbrains_running,
            "terminal_count": terminal_count
        }
        
        # Decide active workspace path based on detected folders
        if detected_paths:
            # Pick the first valid directory containing .git, or fallback to the first detected path
            for path in detected_paths:
                if os.path.isdir(os.path.join(path, ".git")):
                    self.active_workspace_path = path
                    return
            self.active_workspace_path = detected_paths[0]
        else:
            # Fallback to configured workspace roots
            for root in settings.WORKSPACE_ROOTS:
                if os.path.exists(root):
                    # Check if the root itself is a git repo
                    if os.path.isdir(os.path.join(root, ".git")):
                        self.active_workspace_path = root
                        return
                    # Scan for subdirectories containing .git (up to 2 levels deep to stay fast)
                    try:
                        for entry in os.scandir(root):
                            if entry.is_dir() and not any(ig in entry.name for ig in settings.IGNORE_PATTERNS):
                                if os.path.isdir(os.path.join(entry.path, ".git")):
                                    self.active_workspace_path = entry.path
                                    return
                    except Exception:
                        pass
            
            # Default fallback to current working directory
            self.active_workspace_path = os.getcwd()

    def _scan_git(self):
        if not self.active_workspace_path or not os.path.exists(self.active_workspace_path):
            self.git_cache = {
                "repo": None,
                "branch": None,
                "modified_files": 0,
                "uncommitted_changes": False,
                "commits_today": 0
            }
            return

        # Check if the directory is actually a Git repository
        # Run git rev-parse --show-toplevel to find the root folder
        try:
            repo_root = subprocess.check_output(
                ["git", "rev-parse", "--show-toplevel"],
                cwd=self.active_workspace_path,
                stderr=subprocess.DEVNULL
            ).decode().strip()
            
            repo_name = os.path.basename(repo_root)
            
            # Branch Name
            branch = subprocess.check_output(
                ["git", "rev-parse", "--abbrev-ref", "HEAD"],
                cwd=repo_root,
                stderr=subprocess.DEVNULL
            ).decode().strip()
            
            # Modified files count
            status_out = subprocess.check_output(
                ["git", "status", "--porcelain"],
                cwd=repo_root,
                stderr=subprocess.DEVNULL
            ).decode().strip()
            
            modified_files = len(status_out.splitlines()) if status_out else 0
            uncommitted_changes = modified_files > 0
            
            # Commits today
            commits_today = 0
            try:
                # Get number of commits since midnight today
                commits_out = subprocess.check_output(
                    ["git", "log", "--since=midnight", "--oneline"],
                    cwd=repo_root,
                    stderr=subprocess.DEVNULL
                ).decode().strip()
                commits_today = len(commits_out.splitlines()) if commits_out else 0
            except Exception:
                pass
                
            self.git_cache = {
                "repo": repo_name,
                "branch": branch,
                "modified_files": modified_files,
                "uncommitted_changes": uncommitted_changes,
                "commits_today": commits_today
            }
        except Exception:
            # Directory is not a git repo or git is not installed
            self.git_cache = {
                "repo": None,
                "branch": None,
                "modified_files": 0,
                "uncommitted_changes": False,
                "commits_today": 0
            }

    def _scan_docker(self):
        # Check if docker daemon is running by looking for docker socket
        docker_socket = "/var/run/docker.sock"
        if not os.path.exists(docker_socket):
            self.docker_cache = {
                "running_containers": 0,
                "total_containers": 0,
                "status": "inactive"
            }
            return
            
        try:
            # Query docker daemon using docker command line
            # It's fast and doesn't require docker-py module
            out = subprocess.check_output(
                ["docker", "ps", "-a", "--format", "{{.State}}"],
                stderr=subprocess.DEVNULL,
                timeout=2.0
            ).decode().strip()
            
            lines = out.splitlines()
            total_containers = len(lines)
            running_containers = sum(1 for line in lines if line.strip().lower() in ["running", "up"])
            
            # Status determination
            status = "healthy"
            if total_containers > 0 and running_containers == 0:
                status = "warning"
            elif total_containers == 0:
                status = "healthy" # Docker is running, but no containers is fine
                
            self.docker_cache = {
                "running_containers": running_containers,
                "total_containers": total_containers,
                "status": status
            }
        except subprocess.PermissionError:
            # Docker socket exists but current user doesn't have permission (not in docker group)
            self.docker_cache = {
                "running_containers": 0,
                "total_containers": 0,
                "status": "warning"
            }
        except Exception:
            # Docker not running or not installed
            self.docker_cache = {
                "running_containers": 0,
                "total_containers": 0,
                "status": "inactive"
            }
