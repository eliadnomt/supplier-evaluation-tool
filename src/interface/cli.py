"""
Simple CLI: reads a CSV of suppliers, computes Final CSR Score using the skeleton,
and writes an output CSV and JSON to the export directory.
"""
import os
import sys
import json
import pandas as pd
from typing import List
from ..models.supplier import Supplier
from ..scoring.final_score import final_csr_score
from ..utils.yaml_loader import load_yaml

def row_to_supplier(row) -> Supplier:
    certs = [c.strip() for c in str(row.get("certifications", "")).split(";") if c.strip()]
    return Supplier(
        supplier=row["supplier"],
        price_eur_per_m=float(row.get("price_eur_per_m", 0.0)),
        lead_time_weeks=float(row.get("lead_time_weeks", 0.0)),
        moq_m=float(row.get("moq_m", 0.0)),
        stock_service=str(row.get("stock_service", "false")).strip().lower() in {"yes","true","1"},
        fibre_origin=row.get("fibre_origin") or None,
        yarn_origin=row.get("yarn_origin") or None,
        fabric_origin=row.get("fabric_origin") or None,
        dye_origin=row.get("dye_origin") or None,
        sewing_origin=row.get("sewing_origin") or None,
        certifications=certs,
        documentation_level=str(row.get("documentation_level","none")),
        material_origin=row.get("material_origin"),
        countrySpinning=row.get("countrySpinning"),
        countryFabric=row.get("countryFabric"),
        countryDyeing=row.get("countryDyeing"),
        countryMaking=row.get("countryMaking"),
        fabricProcess=row.get("fabricProcess"),
        makingComplexity=row.get("makingComplexity"),
        dyeingProcess=row.get("dyeingProcess"),
        businessSize=row.get("businessSize"),
        numberOfReferences=row.get("numberOfReferences"),
        price=row.get("price"),
        weight_gm2=row.get("weight_gm2"),
        gross_width=row.get("gross_width"),
        product=row.get("product")
    )

def main(yaml_path: str):
    config_root = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "config")
    app_cfg = load_yaml(os.path.join(config_root, "app.yaml"))
    export_dir = app_cfg.get("outputs",{}).get("export_dir")
    os.makedirs(export_dir, exist_ok=True)
    # Use yaml_loader to load YAML data
    data = load_yaml(yaml_path)
    if isinstance(data, dict) and 'suppliers' in data:
        rows = data['suppliers']
    else:
        rows = data  # fallback: top-level list
    suppliers: List[Supplier] = [row_to_supplier(row) for row in rows]
    results = []
    for s in suppliers:
        scores = final_csr_score(s, config_root)
        results.append({
            "supplier": s.supplier,
            "ecobalyse_score": scores[0],
            "final_csr_score": scores[1]
        })
    out_csv = os.path.join(export_dir, "scored_suppliers.csv")
    out_json = os.path.join(export_dir, "scored_suppliers.json")
    pd.DataFrame(results).to_csv(out_csv, index=False)
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"Wrote: {out_csv}\nWrote: {out_json}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m src.interface.cli data/examples/suppliers_min.yaml")
        sys.exit(1)
    main(sys.argv[1])
