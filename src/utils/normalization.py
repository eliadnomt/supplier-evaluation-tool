# Placeholder for price/leadtime/moq normalization utilities (commercial-only metrics)
def linear_scale(value: float, vmin: float, vmax: float, out_min: float = 1.0, out_max: float = 10.0) -> float:
    if vmax == vmin:
        return (out_max + out_min) / 2.0
    frac = (value - vmin) / (vmax - vmin)
    frac = max(0.0, min(1.0, frac))
    return out_min + frac * (out_max - out_min)
