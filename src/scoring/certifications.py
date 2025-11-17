from typing import Dict, List
from ..models.supplier import Supplier
from ..utils.yaml_loader import load_yaml
import os

def certification_bonus(supplier: Supplier, config_root: str) -> float:
    scoring_cfg = load_yaml(f"{config_root}/scoring.yaml") or {}
    
    # Resolve certification_map.yaml path relative to project root
    # config_root is something like /app/config, so go up two levels to get project root
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(config_root)))
    cert_map_path = os.path.join(project_root, "data", "lookups", "certification_map.yaml")
    cmap = load_yaml(cert_map_path) or {}

    t1 = set(cmap.get("tier1", []))
    t2 = set(cmap.get("tier2", []))
    t3 = set(cmap.get("tier3", []))

    tier_points = scoring_cfg.get("certification_tiers", {})
    t1_pts = float(tier_points.get("tier1_points_per_cert", 1.2))
    t2_pts = float(tier_points.get("tier2_points_per_cert", 0.6))
    t3_pts = float(tier_points.get("tier3_points_per_cert", 0.2))

    max_bonus_cfg = tier_points.get("max_bonus", {})
    max_t1 = float(max_bonus_cfg.get("tier1", 2.4))
    max_t2 = float(max_bonus_cfg.get("tier2", 1.2))
    max_t3 = float(max_bonus_cfg.get("tier3", 0.4))

    s_certs = set([c.strip() for c in (supplier.certifications or [])])

    t1_count = len(s_certs & t1)
    t2_count = len(s_certs & t2)
    t3_count = len(s_certs & t3)

    bonus = min(t1_count * t1_pts, max_t1) + min(t2_count * t2_pts, max_t2) + min(t3_count * t3_pts, max_t3)
    return float(bonus)
