from dataclasses import dataclass
from typing import List, Optional, Any

@dataclass
class Supplier:
    supplier: str
    fabricName: Optional[str]
    price_eur_per_m: float
    lead_time_weeks: float
    moq_m: float
    stock_service: bool

    # TODO remove old params that have been replaced by EcoBalyse ones below
    fibre_origin: Optional[str]
    yarn_origin: Optional[str]
    fabric_origin: Optional[str]
    dye_origin: Optional[str]
    sewing_origin: Optional[str]

    certifications: List[str]
    documentation_level: str  # none | country_only | factory_identified | audits_verified

    # Optional extended fields used for Ecobalyse payload
    material_origin: Optional[List[dict]] = None  # [{id, share, spinning, country?}]
    countrySpinning: Optional[str] = None
    countryFabric: Optional[str] = None
    countryDyeing: Optional[str] = None
    countryMaking: Optional[str] = None
    fabricProcess: Optional[str] = None
    makingComplexity: Optional[str] = None
    dyeingProcess: Optional[str] = None
    businessSize: Optional[str] = None
    numberOfReferences: Optional[int] = None
    price: Optional[float] = None
    weight_gm2: Optional[float] = None
    gross_width: Optional[float] = None
    product: Optional[str] = None
    fabric_lead_time_weeks: Optional[float] = None
