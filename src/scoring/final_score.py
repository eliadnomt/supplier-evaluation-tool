from typing import Tuple
from ..models.supplier import Supplier
from .ecobalyse_score import ecobalyse_score_for_supplier
from .transparency import transparency_weight
from ..utils.yaml_loader import load_yaml

def final_csr_score(supplier: Supplier, config_root: str) -> Tuple[float, float]:
    caps = load_yaml(f"{config_root}/scoring.yaml") or {}
    caps_dict = caps.get("caps", {}) if isinstance(caps, dict) else {}
    max_score = float(caps_dict.get("final_csr_score", 10.0))

    eco = ecobalyse_score_for_supplier(supplier, config_root)
    if eco is None:
        return None  # cannot compute without Ecobalyse Score

    t_weight = transparency_weight(supplier, config_root)

    raw = eco * t_weight
    return eco, min(raw, max_score)
