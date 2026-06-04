import abc
from typing import Dict, Any

class BaseCollector(abc.ABC):
    """
    Abstract Base Class for all telemetry data collectors.
    Allows easy plugin integration by implementing this interface.
    """
    
    @abc.abstractmethod
    def collect(self) -> Dict[str, Any]:
        """
        Collect metrics and return as a JSON-serializable dictionary.
        """
        pass
