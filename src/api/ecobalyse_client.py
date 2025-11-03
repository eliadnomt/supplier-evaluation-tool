"""
Thin Ecobalyse API client.
NOTE: This is a skeleton. Replace the placeholders to actually call the API.
"""
import os
import requests
from typing import Optional, Dict

class EcobalyseClient:
    def __init__(self, base_url: str, timeout_seconds: int = 20, api_key_env: str = None):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout_seconds
        self.api_key = os.getenv(api_key_env) if api_key_env else None
        self.session = requests.Session()
        if self.api_key:
            self.session.headers.update({"Authorization": f"Bearer {self.api_key}"})
        self.session.headers.update({"Content-Type": "application/json"})

    def get_score(self, payload: Dict) -> Optional[float]:
        """Call Ecobalyse score endpoint with a prepared payload.
        Returns the ECS impact as the score (float) or None on failure.
        """
        try:
            url = f"{self.base_url}/textile/simulator"
            # print("Payload being sent:", payload)
            resp = self.session.post(url, json=payload, timeout=self.timeout)
            resp.raise_for_status()
            resp_json = resp.json()
            #print("Response schema:", resp_json)
            raw_score = resp_json.get("impacts", {}).get("ecs")
            if raw_score is not None:
                return self._normalize_score(raw_score)
        except requests.HTTPError as e:
            print(f"HTTP error: {e}")
            if hasattr(e, 'response') and e.response is not None:
                try:
                    print("Response content:", e.response.content.decode())
                except Exception:
                    print("Response content (raw):", e.response.content)
        except Exception as e:
            print(f"Other error: {e}")
        return None

    @staticmethod
    def _normalize_score(raw_score: float) -> float:
        """Passthrough normalization for now (may adapt formula/scale later)."""
        return float(raw_score)

    @staticmethod
    def fetch_products(base_url: str, timeout: int = 20) -> Optional[list]:
        try:
            url = f"{base_url.rstrip('/')}/textile/products"
            resp = requests.get(url, timeout=timeout)
            resp.raise_for_status()
            return resp.json()  # adapt if a nested field; else a list
        except Exception as e:
            print(f"Error fetching products: {e}")
            return None

    @staticmethod
    def fetch_materials(base_url: str, timeout: int = 20) -> Optional[list]:
        try:
            url = f"{base_url.rstrip('/')}/textile/materials"
            resp = requests.get(url, timeout=timeout)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            print(f"Error fetching materials: {e}")
            return None

    @staticmethod
    def fetch_countries(base_url: str, timeout: int = 20) -> Optional[list]:
        try:
            url = f"{base_url.rstrip('/')}/textile/countries"
            resp = requests.get(url, timeout=timeout)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            print(f"Error fetching countries: {e}")
            return None

    @staticmethod
    def fetch_trims(base_url: str, timeout: int = 20) -> Optional[list]:
        try:
            url = f"{base_url.rstrip('/')}/textile/trims"
            resp = requests.get(url, timeout=timeout)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            print(f"Error fetching trims: {e}")
            return None

    @staticmethod
    def fetch_material_spinning_types(base_url: str, timeout: int = 20) -> Optional[list]:
        # Enum is static based on docs
        return [
            'ConventionalSpinning',  # filature conventionnelle (à anneaux : ring spun) pour les matières naturelles ou artificielles
            'UnconventionalSpinning',  #filature non conventionnelle (à bouts libérées : open-end) pour les matières naturelles ou artificielles
            'SyntheticSpinning'  # filage pour les matières synthétiques
        ]

    @staticmethod
    def fetch_business_size(base_url: str, timeout: int = 20) -> Optional[list]:
        # Enum is static based on docs
        return [
            'small-business',  # PME/TPE
            'large-business-with-services',  # Grande entreprise avec service de réparation
            'large-business-without-services'  # (par défaut): Grande entreprise sans service de réparation
        ]

    @staticmethod
    def fetch_dyeing_process_types(base_url: str, timeout: int = 20) -> Optional[list]:
        # Enum is static based on docs
        return [
            'average',  # par defaut
            'continuous',
            'discontinuous'
        ]

    @staticmethod
    def fetch_fabric_processes(base_url: str, timeout: int = 20) -> Optional[list]:
        # Enum is static based on docs
        return [
            'knitting-mix',  # mix of circular and straight knitting
            'knitting-fully-fashioned',  # seamless
            'knitting-integral',  # whole garment
            'knitting-circular',  # circular knitting
            'knitting-straight',  # straight knitting
            'weaving'
        ]

    @staticmethod
    def fetch_making_complexities(base_url: str = None, timeout: int = 20) -> Optional[list]:
        # Enum is static based on docs
        return [
            'very-high',
            'high',
            'medium',
            'low',
            'very-low',  # default fully-fashioned knitting
            'not-applicable'  # default for for integral knitting
        ]
