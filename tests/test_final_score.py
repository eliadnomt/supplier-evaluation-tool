from src.models.supplier import Supplier
from src.scoring.final_score import final_csr_score

def test_placeholder():
    s = Supplier(
        supplier="Test",
        price_eur_per_m=10.0,
        lead_time_weeks=6.0,
        moq_m=100.0,
        stock_service=True,
        fibre_origin="Portugal",
        yarn_origin="Portugal",
        fabric_origin="Portugal",
        dye_origin="Portugal",
        sewing_origin="Portugal",
        certifications=["GOTS","REACH"],
        documentation_level="audits_verified"
    )
    # Without a real Ecobalyse score, final returns None
    assert final_csr_score(s, "config") is None
