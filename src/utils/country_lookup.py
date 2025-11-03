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
