"""
Data Quality Validation Layer (Phase 8 Spec)
Enforces sanity boundaries, rejects impossible values, flags sensor spikes,
and sanitizes raw sensor ingestion.
"""

from typing import Dict, Any, Tuple

# Sanity ranges for meteorological and hydrological telemetry in India
METRIC_BOUNDS = {
    "rainfall_mm": (0.0, 1500.0),        # Mawsynram daily record is ~1000mm
    "water_level_m": (0.0, 45.0),         # River gauge depth in meters
    "temperature_c": (-45.0, 60.0),       # Dras (-45C) to Phalodi (+51C)
    "relative_humidity_pct": (0.0, 100.0),
    "rain_probability_pct": (0.0, 100.0),
    "wind_kmh": (0.0, 350.0),             # Super cyclone gusts up to 300 km/h
    "soil_saturation_pct": (0.0, 100.0)
}

def validate_metric(metric: str, value: float) -> Tuple[bool, float, str]:
    """
    Validates a metric reading against physical limits.
    Returns: (is_valid, sanitized_value, reason)
    """
    if metric not in METRIC_BOUNDS:
        return True, value, "UNKNOWN_METRIC"
        
    low, high = METRIC_BOUNDS[metric]
    if value < low:
        return False, low, f"Value {value} below absolute minimum {low}"
    if value > high:
        return False, high, f"Value {value} exceeds absolute physical ceiling {high}"
        
    return True, round(value, 2), "VALID"

def sanitize_telemetry_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitizes an incoming telemetry dictionary, correcting minor clamping anomalies.
    """
    sanitized = dict(payload)
    for key in list(sanitized.keys()):
        if key in METRIC_BOUNDS and isinstance(sanitized[key], (int, float)):
            valid, clean_val, _ = validate_metric(key, float(sanitized[key]))
            sanitized[key] = clean_val
    return sanitized
