from dataclasses import dataclass
from typing import List, Optional

@dataclass
class Supplier:
    supplier: str
    price_eur_per_m: float
    lead_time_weeks: float
    moq_m: float
    stock_service: bool

    fibre_origin: Optional[str]
    yarn_origin: Optional[str]
    fabric_origin: Optional[str]
    dye_origin: Optional[str]
    sewing_origin: Optional[str]

    certifications: List[str]
    documentation_level: str  # none | country_only | factory_identified | audits_verified
