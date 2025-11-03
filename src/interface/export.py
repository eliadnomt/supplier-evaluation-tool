"""
Utilities to export scored results for notebooks.
"""
import os
import json
import pandas as pd
from typing import List, Dict

def export_results(records: List[Dict], export_dir: str):
    os.makedirs(export_dir, exist_ok=True)
    df = pd.DataFrame(records)
    df.to_csv(os.path.join(export_dir, "scored_suppliers.csv"), index=False)
    with open(os.path.join(export_dir, "scored_suppliers.json"), "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
