"""
Adapter that prepares the Ecobalyse payload from a Supplier + assumptions,
then asks EcobalyseClient for a score.
"""
from typing import Optional, Dict, Any, List
from ..models.supplier import Supplier
from ..utils.yaml_loader import load_yaml
from ..utils.country_lookup import get_country_code, set_country_cache
from ..api.ecobalyse_client import EcobalyseClient

def _estimate_mass_kg(weight_gm2: float = None, gross_width_cm: float = None, length_m: float = 1.0) -> Optional[float]:
    # If fabric weight (g/m^2) and width are known, estimate mass for a given length
    # mass (kg) = weight_gm2 (g/m^2) * (width_m * length_m) / 1000
    if weight_gm2 and gross_width_cm:
        width_m = float(gross_width_cm) / 100.0
        area_m2 = width_m * float(length_m)
        return float(weight_gm2) * area_m2 / 1000.0
    return None

def _build_payload(s: Supplier, assumptions: Dict[str, Any], countries_data: List = None, trims_data: List = None, default_product: str = "tshirt") -> Dict[str, Any]:
    # Get product-specific assumptions
    product_type = s.product or assumptions.get("default_product", default_product)
    products_config = assumptions.get("products", {})
    product_assumptions = products_config.get(product_type, {})
    
    # Fallback to default assumptions if product-specific not found
    if not product_assumptions:
        product_assumptions = products_config.get(assumptions.get("default_product", "tshirt"), {})
    
    materials = []
    if s.material_origin:
        for m in s.material_origin:
            if not isinstance(m, dict):
                continue
            mat_item = {
                "id": m.get("id"),
                "share": float(m.get("share", 0.0)),
                "spinning": m.get("spinning")
            }
            # Translate country if present in material
            if "country" in m:
                mat_item["country"] = get_country_code(m.get("country"), countries_data) or m.get("country")
            materials.append(mat_item)
    if not materials:
        country_code = get_country_code(s.fibre_origin, countries_data) if s.fibre_origin else "FR"
        materials = [{
            "id": "ei-coton",
            "share": 1.0,
            "country": country_code
        }]
    
    # Use product-specific default mass, fallback to estimate or generic default
    default_mass = product_assumptions.get("default_mass", assumptions.get("default_mass", 0.17))
    mass = _estimate_mass_kg(s.weight_gm2, s.gross_width) or default_mass
    
    # Translate country names to codes
    country_spinning = get_country_code(s.countrySpinning, countries_data) if s.countrySpinning else None
    country_fabric = get_country_code(s.countryFabric, countries_data) if s.countryFabric else None
    country_dyeing = get_country_code(s.countryDyeing, countries_data) if s.countryDyeing else None
    country_making = get_country_code(s.countryMaking, countries_data) if s.countryMaking else None
    
    # Get product-specific trims
    trims = product_assumptions.get("trims", [])
    # If trims_data is provided, resolve trim names to UUIDs
    trim_list = []
    if trims_data and trims:
        # Build a lookup map from trim name to UUID
        trim_lookup = {}
        for trim in trims_data:
            if isinstance(trim, dict):
                trim_id = trim.get("id")
                trim_name = trim.get("name", "").lower()
                if trim_id:
                    trim_lookup[trim_name] = trim_id
            elif isinstance(trim, str):
                # If trims_data contains strings, use them directly
                trim_lookup[trim] = trim
        
        for trim_config in trims:
            if isinstance(trim_config, dict):
                trim_id = trim_config.get("id")
                trim_name = trim_config.get("name", "").lower()
                quantity = trim_config.get("quantity", 0)
                # Try to find UUID by name or use provided ID
                resolved_id = trim_lookup.get(trim_name) or trim_id
                if resolved_id and quantity > 0:
                    trim_list.append({"id": resolved_id, "quantity": int(quantity)})
            elif isinstance(trim_config, str):
                # If it's just a string (trim name), try to find it
                resolved_id = trim_lookup.get(trim_config.lower())
                if resolved_id:
                    trim_list.append({"id": resolved_id, "quantity": 1})  # Default quantity
    elif trims:
        # If no trims_data, use trims as-is (assuming they're already UUIDs)
        for trim_config in trims:
            if isinstance(trim_config, dict):
                trim_list.append(trim_config)
    
    payload = {
        "mass": max(0.01, float(mass)),
        "product": product_type,
        "materials": materials,
        "fabricProcess": s.fabricProcess or assumptions.get("default_fabric_process", "weaving"),
        "makingComplexity": s.makingComplexity or assumptions.get("default_making_complexity", "medium"),
        "numberOfReferences": int(s.numberOfReferences or assumptions.get("default_number_of_references", 100)),
        "price": float(s.price or assumptions.get("default_price", 100.0)),
        "upcycled": product_assumptions.get("upcycled", False),
        "airTransportRatio": product_assumptions.get("airTransportRatio", 0.0),
    }
    
    # Add trims if present
    if trim_list:
        payload["trims"] = trim_list
    
    # Only add country fields if they have values
    if country_spinning:
        payload["countrySpinning"] = country_spinning
    if country_fabric:
        payload["countryFabric"] = country_fabric
    if country_dyeing:
        payload["countryDyeing"] = country_dyeing
    if country_making:
        payload["countryMaking"] = country_making
    if s.dyeingProcess:
        payload["dyeingProcess"] = s.dyeingProcess
    if s.businessSize:
        payload["business"] = s.businessSize
    return payload

def ecobalyse_score_for_supplier(supplier: Supplier, config_root: str) -> Optional[float]:
    assumptions = load_yaml(f"{config_root}/assumptions.yaml") or {}
    ecoconfig = load_yaml(f"{config_root}/ecobalyse.yaml") or {}

    # Fetch countries list to build translation mapping
    base_url = ecoconfig.get("base_url")
    countries_data = EcobalyseClient.fetch_countries(base_url) if base_url else None
    if countries_data:
        set_country_cache(countries_data)
    
    # Fetch trims list to resolve trim names to UUIDs
    trims_data = EcobalyseClient.fetch_trims(base_url) if base_url else None

    payload = _build_payload(supplier, assumptions, countries_data, trims_data)

    client = EcobalyseClient(
        base_url=base_url,
        timeout_seconds=ecoconfig.get("timeout_seconds", 20),
        api_key_env=ecoconfig.get("auth", {}).get("api_key_env")
    )
    score = client.get_score(payload)
    return score  # may be None
