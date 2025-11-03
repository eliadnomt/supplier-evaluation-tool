"""
Country code lookup utilities for Ecobalyse.
"""
from typing import Optional, Dict, List

_country_cache: Optional[Dict[str, str]] = None

def _build_country_mapping(countries_data: List) -> Dict[str, str]:
    """Build a mapping from country name to code from Ecobalyse countries list."""
    mapping = {}
    for item in countries_data:
        if isinstance(item, dict):
            # If it's a dict with 'name' and 'code' or similar
            name = item.get('name') or item.get('label') or str(item)
            code = item.get('code') or item.get('id') or str(item)
            if name and code:
                mapping[name] = code
                # Also map common variations
                if name.lower() == 'france':
                    mapping['France'] = 'FR'
                elif name.lower() == 'united states':
                    mapping['United States'] = 'US'
        elif isinstance(item, str):
            # If it's just a code string, use it as both name and code
            mapping[item] = item
    return mapping

def get_country_code(country_name: str, countries_data: List = None) -> Optional[str]:
    """
    Translate a country name to its Ecobalyse country code.
    If countries_data is provided, uses it; otherwise tries to load from cache.
    """
    global _country_cache
    
    if not country_name:
        return None
    
    # If it's already a 2-3 letter code, return as-is
    if len(country_name) <= 3 and country_name.isupper():
        return country_name
    
    # Build mapping if not cached
    if _country_cache is None and countries_data:
        _country_cache = _build_country_mapping(countries_data)
    
    # Try direct lookup
    if _country_cache and country_name in _country_cache:
        return _country_cache[country_name]
    
    # Try case-insensitive lookup
    if _country_cache:
        for name, code in _country_cache.items():
            if name.lower() == country_name.lower():
                return code
    
    # Fallback: return as-is if no mapping found
    return country_name

def set_country_cache(countries_data: List):
    """Set the country cache from Ecobalyse countries data."""
    global _country_cache
    _country_cache = _build_country_mapping(countries_data)

# Placeholder mapping helpers
def classify_region(country: str) -> str:
    if not country or country.lower() == "unknown":
        return "unknown"
    eu = {"France","Germany","Spain","Portugal","Italy","Netherlands","Belgium","Poland","Czechia","Austria","Hungary","Slovakia","Slovenia","Croatia","Romania","Bulgaria","Greece","Sweden","Finland","Denmark","Ireland","Estonia","Latvia","Lithuania","Luxembourg","Malta","Cyprus"}
    near_eu = {"Turkey","Morocco","Tunisia"}
    if country in eu:
        return "EU"
    if country in near_eu:
        return "near_EU"
    return "rest_of_world"
