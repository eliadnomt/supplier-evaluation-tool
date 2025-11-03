from flask import Flask, jsonify, request, send_from_directory
from src.api.ecobalyse_client import EcobalyseClient
import yaml
import os
from collections import OrderedDict

app = Flask(__name__)
# Configure where to save suppliers
SUPPLIERS_YAML = os.path.join(os.path.dirname(__file__), '../../data/examples/suppliers_min.yaml')
BASE_API_URL = os.environ.get('ECOBALYSE_API_URL', 'https://ecobalyse.beta.gouv.fr/versions/v7.0.0/api')

PREFERRED_FIELD_ORDER = [
    'supplier',
    'price_eur_per_m',
    'lead_time_weeks',
    'moq_m',
    'stock_service',
    'fibre_origin',
    'yarn_origin',
    'fabric_origin',
    'dye_origin',
    'sewing_origin',
    'material_origin',
    'countrySpinning',
    'countryFabric',
    'countryDyeing',
    'countryMaking',
    'fabricProcess',
    'dyeingProcess',
    'makingComplexity',
    'businessSize',
    'numberOfReferences',
    'price',
    'weight_gm2',
    'gross_width',
    'certifications',
    'documentation_level',
]

def _to_float(value):
    try:
        if value is None or value == '':
            return None
        return float(value)
    except Exception:
        return value

def _to_int(value):
    try:
        if value is None or value == '':
            return None
        return int(value)
    except Exception:
        return value

def _to_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {'1','true','yes','y'}
    return bool(value)

def normalize_supplier(raw: dict) -> OrderedDict:
    s = dict(raw or {})
    # Coerce numeric fields
    for k in ['price_eur_per_m', 'moq_m', 'weight_gm2', 'price', 'gross_width', 'lead_time_weeks']:
        if k in s:
            s[k] = _to_float(s.get(k))
    if 'numberOfReferences' in s:
        s['numberOfReferences'] = _to_int(s.get('numberOfReferences'))
    if 'stock_service' in s:
        s['stock_service'] = _to_bool(s.get('stock_service'))
    # Normalize material_origin -> list of {id, share(float), spinning}
    if 'material_origin' in s and isinstance(s['material_origin'], list):
        norm_list = []
        for item in s['material_origin']:
            if not isinstance(item, dict):
                continue
            norm_list.append({
                'id': item.get('id'),
                'share': _to_float(item.get('share')),
                'spinning': item.get('spinning')
            })
        s['material_origin'] = norm_list
    # Build an OrderedDict to strictly control YAML key order
    ordered_items = []
    for key in PREFERRED_FIELD_ORDER:
        if key in s:
            ordered_items.append((key, s[key]))
    for key in s.keys():
        if key not in dict(ordered_items):
            ordered_items.append((key, s[key]))
    return OrderedDict(ordered_items)

def _to_plain(obj):
    """Recursively convert OrderedDicts to plain dicts for YAML dumping."""
    if isinstance(obj, OrderedDict):
        return {k: _to_plain(v) for k, v in obj.items()}
    if isinstance(obj, dict):
        return {k: _to_plain(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_to_plain(v) for v in obj]
    return obj

def get_enum_response(enum):
    fetch_map = {
        'products': EcobalyseClient.fetch_products,
        'materials': EcobalyseClient.fetch_materials,
        'countries': EcobalyseClient.fetch_countries,
        'trims': EcobalyseClient.fetch_trims,
        'fabricProcess': EcobalyseClient.fetch_fabric_processes,
        'makingComplexity': EcobalyseClient.fetch_making_complexities,
        'materialSpinning': EcobalyseClient.fetch_material_spinning_types,
        'businessSize': EcobalyseClient.fetch_business_size,
        'dyeingProcess': EcobalyseClient.fetch_dyeing_process_types,
    }
    fn = fetch_map.get(enum)
    if fn:
        return fn(BASE_API_URL) or []
    return []

@app.route('/api/enums/<enum_name>')
def get_enum(enum_name):
    data = get_enum_response(enum_name)
    return jsonify(data)

@app.route('/api/suppliers', methods=['POST'])
def save_supplier():
    supplier = request.get_json()
    supplier = normalize_supplier(supplier)
    # Load existing YAML
    if os.path.exists(SUPPLIERS_YAML):
        with open(SUPPLIERS_YAML) as yf:
            existing = yaml.safe_load(yf) or []
    else:
        existing = []
    # Merge into list
    if isinstance(existing, dict) and 'suppliers' in existing:
        existing['suppliers'].append(supplier)
        to_dump = existing
    elif isinstance(existing, list):
        existing.append(supplier)
        to_dump = existing
    else:
        to_dump = [supplier]
    # Convert OrderedDicts to plain dicts for YAML
    to_dump_plain = _to_plain(to_dump)
    # Pretty, stable YAML
    with open(SUPPLIERS_YAML, 'w', encoding='utf-8') as yf:
        yaml.safe_dump(to_dump_plain, yf, allow_unicode=True, sort_keys=False, default_flow_style=False)
    return jsonify({'status': 'ok'})

@app.route('/')
def main_page():
    return send_from_directory(os.path.dirname(__file__), 'supplier_form.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
