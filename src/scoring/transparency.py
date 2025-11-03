from typing import Mapping
from ..models.supplier import Supplier
from ..utils.yaml_loader import load_yaml

def transparency_weight(supplier: Supplier, config_root: str) -> float:
    cfg = load_yaml(f"{config_root}/scoring.yaml")
    weights: Mapping[str, float] = cfg.get("transparency_weight", {})
    level = (supplier.documentation_level or "none").lower()
    return float(weights.get(level, weights.get("none", 0.7)))
