from flask import Flask, jsonify, request, send_from_directory
from src.api.ecobalyse_client import EcobalyseClient
from src.utils.yaml_loader import load_yaml
from src.scoring.final_score import final_csr_score
from src.models.supplier import Supplier
import yaml
import os
from collections import OrderedDict
import time

app = Flask(__name__)
# Configure where to save suppliers
SUPPLIERS_YAML = os.path.join(os.path.dirname(__file__), '../../data/examples/suppliers_min.yaml')
BASE_API_URL = os.environ.get('ECOBALYSE_API_URL', 'https://ecobalyse.beta.gouv.fr/versions/v7.0.0/api')

# Paths
THIS_DIR = os.path.dirname(__file__)
CONFIG_ROOT = os.path.join(os.path.dirname(os.path.dirname(THIS_DIR)), 'config')

# Simple in-memory cache for enums
_ENUM_CACHE = {}
_ENUM_TTL_SECONDS = int(os.environ.get('ENUM_CACHE_TTL_SECONDS', 6 * 60 * 60))  # 6h default

def _cache_get(key):
    item = _ENUM_CACHE.get(key)
    if not item:
        return None
    data, ts = item
    if (time.time() - ts) > _ENUM_TTL_SECONDS:
        _ENUM_CACHE.pop(key, None)
        return None
    return data

def _cache_set(key, data):
    _ENUM_CACHE[key] = (data, time.time())

PREFERRED_FIELD_ORDER = [
    'supplier',
    'product',
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
    for k in ['price_eur_per_m', 'moq_m', 'weight_gm2', 'price', 'gross_width', 'lead_time_weeks']:
        if k in s:
            s[k] = _to_float(s.get(k))
    if 'numberOfReferences' in s:
        s['numberOfReferences'] = _to_int(s.get('numberOfReferences'))
    if 'stock_service' in s:
        s['stock_service'] = _to_bool(s.get('stock_service'))
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
    ordered_items = []
    for key in PREFERRED_FIELD_ORDER:
        if key in s:
            ordered_items.append((key, s[key]))
    for key in s.keys():
        if key not in dict(ordered_items):
            ordered_items.append((key, s[key]))
    return OrderedDict(ordered_items)

def _to_plain(obj):
    if isinstance(obj, OrderedDict):
        return {k: _to_plain(v) for k, v in obj.items()}
    if isinstance(obj, dict):
        return {k: _to_plain(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_to_plain(v) for v in obj]
    return obj

def get_enum_response(enum):
    # Serve from cache if present
    cached = _cache_get(enum)
    if cached is not None:
        return cached
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
    data = fn(BASE_API_URL) or [] if fn else []
    _cache_set(enum, data)
    return data

# --------- Pages ---------
@app.route('/')
def dashboard():
    return send_from_directory(THIS_DIR, 'dashboard.html')

@app.route('/add')
def add_page():
    return send_from_directory(THIS_DIR, 'supplier_form.html')

# --------- Static Files ---------
@app.route('/static/<path:filename>')
def static_files(filename):
    static_dir = os.path.join(THIS_DIR, 'static')
    return send_from_directory(static_dir, filename)

# --------- Enum API ---------
@app.route('/api/enums/<enum_name>')
def get_enum(enum_name):
    data = get_enum_response(enum_name)
    return jsonify(data)

# --------- Suppliers API ---------
@app.route('/api/suppliers', methods=['POST'])
def save_supplier():
    supplier = request.get_json()
    supplier = normalize_supplier(supplier)
    if os.path.exists(SUPPLIERS_YAML):
        with open(SUPPLIERS_YAML) as yf:
            existing = yaml.safe_load(yf) or []
    else:
        existing = []
    if isinstance(existing, dict) and 'suppliers' in existing:
        existing['suppliers'].append(supplier)
        to_dump = existing
    elif isinstance(existing, list):
        existing.append(supplier)
        to_dump = existing
    else:
        to_dump = [supplier]
    to_dump_plain = _to_plain(to_dump)
    with open(SUPPLIERS_YAML, 'w', encoding='utf-8') as yf:
        yaml.safe_dump(to_dump_plain, yf, allow_unicode=True, sort_keys=False, default_flow_style=False)
    return jsonify({'status': 'ok'})

@app.route('/api/suppliers/all')
def list_suppliers():
    if os.path.exists(SUPPLIERS_YAML):
        data = load_yaml(SUPPLIERS_YAML) or []
    else:
        data = []
    return jsonify(data)

@app.route('/api/suppliers/<int:index>', methods=['DELETE'])
def delete_supplier(index):
    if os.path.exists(SUPPLIERS_YAML):
        with open(SUPPLIERS_YAML) as yf:
            existing = yaml.safe_load(yf) or []
    else:
        return jsonify({'error': 'No suppliers file'}), 404
    
    if isinstance(existing, dict) and 'suppliers' in existing:
        suppliers_list = existing['suppliers']
    elif isinstance(existing, list):
        suppliers_list = existing
    else:
        suppliers_list = []
    
    if index < 0 or index >= len(suppliers_list):
        return jsonify({'error': 'Invalid index'}), 404
    
    suppliers_list.pop(index)
    
    if isinstance(existing, dict):
        to_dump = existing
    else:
        to_dump = suppliers_list
    
    to_dump_plain = _to_plain(to_dump)
    with open(SUPPLIERS_YAML, 'w', encoding='utf-8') as yf:
        yaml.safe_dump(to_dump_plain, yf, allow_unicode=True, sort_keys=False, default_flow_style=False)
    return jsonify({'status': 'ok'})

@app.route('/api/suppliers/<int:index>', methods=['PUT'])
def update_supplier(index):
    supplier = request.get_json()
    supplier = normalize_supplier(supplier)
    
    if os.path.exists(SUPPLIERS_YAML):
        with open(SUPPLIERS_YAML) as yf:
            existing = yaml.safe_load(yf) or []
    else:
        return jsonify({'error': 'No suppliers file'}), 404
    
    if isinstance(existing, dict) and 'suppliers' in existing:
        suppliers_list = existing['suppliers']
    elif isinstance(existing, list):
        suppliers_list = existing
    else:
        suppliers_list = []
    
    if index < 0 or index >= len(suppliers_list):
        return jsonify({'error': 'Invalid index'}), 404
    
    suppliers_list[index] = supplier
    
    if isinstance(existing, dict):
        to_dump = existing
    else:
        to_dump = suppliers_list
    
    to_dump_plain = _to_plain(to_dump)
    with open(SUPPLIERS_YAML, 'w', encoding='utf-8') as yf:
        yaml.safe_dump(to_dump_plain, yf, allow_unicode=True, sort_keys=False, default_flow_style=False)
    return jsonify({'status': 'ok'})

# --------- Scoring API ---------

def _row_to_supplier(row: dict) -> Supplier:
    certs = row.get('certifications') or []
    if isinstance(certs, str):
        certs = [c.strip() for c in certs.split(';') if c.strip()]
    return Supplier(
        supplier=row.get('supplier', ''),
        price_eur_per_m=float(row.get('price_eur_per_m', 0.0)),
        lead_time_weeks=float(row.get('lead_time_weeks', 0.0)),
        moq_m=float(row.get('moq_m', 0.0)),
        stock_service=bool(row.get('stock_service', False)),
        fibre_origin=row.get('fibre_origin'),
        yarn_origin=row.get('yarn_origin'),
        fabric_origin=row.get('fabric_origin'),
        dye_origin=row.get('dye_origin'),
        sewing_origin=row.get('sewing_origin'),
        certifications=certs,
        documentation_level=str(row.get('documentation_level','none')),
        material_origin=row.get('material_origin'),
        countrySpinning=row.get('countrySpinning'),
        countryFabric=row.get('countryFabric'),
        countryDyeing=row.get('countryDyeing'),
        countryMaking=row.get('countryMaking'),
        fabricProcess=row.get('fabricProcess'),
        makingComplexity=row.get('makingComplexity'),
        dyeingProcess=row.get('dyeingProcess'),
        businessSize=row.get('businessSize'),
        numberOfReferences=row.get('numberOfReferences'),
        price=row.get('price'),
        weight_gm2=row.get('weight_gm2'),
        gross_width=row.get('gross_width'),
        product=row.get('product')
    )

@app.route('/api/scores')
def compute_scores():
    data = load_yaml(SUPPLIERS_YAML) or []
    results = []
    for row in (data if isinstance(data, list) else data.get('suppliers', [])):
        try:
            s = _row_to_supplier(row)
            score_result = final_csr_score(s, CONFIG_ROOT)
            if score_result is None:
                results.append({
                    'supplier': s.supplier,
                    'ecobalyse_score': None,
                    'final_csr_score': None,
                    'error': 'Ecobalyse score unavailable'
                })
            else:
                eco, final_score = score_result
                results.append({
                    'supplier': s.supplier,
                    'ecobalyse_score': eco,
                    'final_csr_score': final_score
                })
        except Exception as e:
            results.append({ 'supplier': row.get('supplier','(unknown)'), 'error': str(e) })
    return jsonify(results)

@app.route('/api/suppliers/for-radar')
def suppliers_for_radar():
    """Return suppliers with all data needed for radar chart scoring"""
    data = load_yaml(SUPPLIERS_YAML) or []
    suppliers_list = data if isinstance(data, list) else data.get('suppliers', [])
    results = []
    
    for row in suppliers_list:
        try:
            s = _row_to_supplier(row)
            # Get Ecobalyse score
            score_result = final_csr_score(s, CONFIG_ROOT)
            ecobalyse_score = score_result[0] if score_result else None
            
            # Get product type from supplier or assumptions
            assumptions = load_yaml(f"{CONFIG_ROOT}/assumptions.yaml") or {}
            product_type = s.product or assumptions.get("default_product", "tshirt")
            
            # Build supplier data with all fields needed for radar chart and supplier list
            supplier_data = {
                'supplier': s.supplier,
                'price_eur_per_m': s.price_eur_per_m,
                'lead_time_weeks': s.lead_time_weeks,
                'moq_m': s.moq_m,
                'ecobalyse_score': ecobalyse_score,
                'product': product_type,
                'material_origin': s.material_origin,
                'countrySpinning': s.countrySpinning,
                'countryFabric': s.countryFabric,
                'countryDyeing': s.countryDyeing,
                'countryMaking': s.countryMaking,
                'fabricProcess': s.fabricProcess,
                'dyeingProcess': s.dyeingProcess,
                'certifications': s.certifications or [],
                # Additional fields for supplier list display
                'weight_gm2': s.weight_gm2,
                'gross_width': s.gross_width,
                'price': s.price,
                'numberOfReferences': s.numberOfReferences,
                'businessSize': s.businessSize,
                'makingComplexity': s.makingComplexity
            }
            results.append(supplier_data)
        except Exception as e:
            # Include supplier name even if scoring fails
            results.append({
                'supplier': row.get('supplier', '(unknown)'),
                'error': str(e),
                'ecobalyse_score': None
            })
    
    return jsonify(results)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
