"""
Adapter that prepares the Ecobalyse payload from a Supplier + assumptions,
then asks EcobalyseClient for a score.
"""
from typing import Optional
from ..models.supplier import Supplier
from ..utils.yaml_loader import load_yaml
from ..api.ecobalyse_client import EcobalyseClient

def ecobalyse_score_for_supplier(supplier: Supplier, config_root: str) -> Optional[float]:
    assumptions = load_yaml(f"{config_root}/assumptions.yaml")
    ecoconfig = load_yaml(f"{config_root}/ecobalyse.yaml")

    # Build payload per Ecobalyse schema (placeholder)
    payload = {
        "mass": 0.17,
        "materials": [
            {
            "id": "ei-coton",
            "share": 1,
            "country": supplier.fibre_origin or "---"
            }
        ],
        "product": "chemise",
        "countrySpinning": supplier.yarn_origin or "---",
        "countryFabric": supplier.fabric_origin or "---",
        "countryDyeing": supplier.dye_origin or "---",
        "countryMaking": supplier.sewing_origin or "---",
        "fabricProcess": "weaving",
        "makingComplexity": "very-high",
        "numberOfReferences": 100,
        "price": 400.0
    }

    client = EcobalyseClient(
        base_url=ecoconfig.get("base_url"),
        timeout_seconds=ecoconfig.get("timeout_seconds", 20),
        api_key_env=ecoconfig.get("auth", {}).get("api_key_env")
    )
    score = client.get_score(payload)
    return score  # may be None if not implemented
