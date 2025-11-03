from flask import Flask, jsonify, request, send_from_directory
from src.api.ecobalyse_client import EcobalyseClient
import yaml
import os

app = Flask(__name__)
# Configure where to save suppliers
SUPPLIERS_YAML = os.path.join(os.path.dirname(__file__), '../../data/examples/suppliers_min.yaml')
BASE_API_URL = os.environ.get('ECOBALYSE_API_URL', 'https://ecobalyse.beta.gouv.fr/versions/v7.0.0/api')

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
    # Accepts JSON dict from frontend, appends to suppliers_min.yaml
    supplier = request.get_json()
    # Load existing YAML
    if os.path.exists(SUPPLIERS_YAML):
        with open(SUPPLIERS_YAML) as yf:
            existing = yaml.safe_load(yf) or []
    else:
        existing = []
    # If YAML is dict with 'suppliers' key, use that
    if isinstance(existing, dict) and 'suppliers' in existing:
        existing_suppliers = existing['suppliers']
        existing['suppliers'].append(supplier)
    elif isinstance(existing, list):
        existing_suppliers = existing
        existing_suppliers.append(supplier)
        existing = existing_suppliers
    else:
        existing_suppliers = []
        existing = [supplier]
    with open(SUPPLIERS_YAML, 'w') as yf:
        yaml.safe_dump(existing, yf, allow_unicode=True)
    return jsonify({'status': 'ok'})

@app.route('/')
def main_page():
    # Serve static HTML for single-page form UI
    return send_from_directory(os.path.dirname(__file__), 'supplier_form.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
