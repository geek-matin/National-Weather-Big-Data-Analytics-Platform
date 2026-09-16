"""
Fake / Misleading Report ML Detector (Phase 4.1 Spec)
Cross-validates citizen/unverified reports against official ground telemetry (IMD/CWC),
evaluates textual sensationalism/panic triggers, and computes anomaly confidence.
"""

import re
from typing import Dict, Any, Tuple

SENSATIONAL_PATTERNS = [
    r"entire city (underwater|submerged|destroyed|vanished)",
    r"thousands (dead|drowned|buried)",
    r"breaking news panic",
    r"dam breached completely",
    r"tsunami coming",
    r"run for your lives",
    r"apocalypse",
    r"government hiding casualties"
]

def analyze_text_sensationalism(text: str) -> Tuple[float, list]:
    """
    Detects sensationalism or panic-mongering keywords.
    Returns: (penalty_score, detected_flags)
    """
    flags = []
    penalty = 0.0
    lower = text.lower()
    
    for pattern in SENSATIONAL_PATTERNS:
        if re.search(pattern, lower):
            flags.append(pattern)
            penalty += 25.0
            
    # Excessive capitalization check
    words = text.split()
    if len(words) >= 4:
        caps = [w for w in words if w.isupper() and len(w) > 1]
        if len(caps) / len(words) > 0.45:
            flags.append("EXCESSIVE_CAPITALIZATION")
            penalty += 15.0

    # Multiple exclamation marks
    if text.count("!") >= 3:
        flags.append("EXCESSIVE_PUNCTUATION")
        penalty += 10.0

    return min(50.0, penalty), flags

def evaluate_report_authenticity(
    report_text: str,
    user_trust_score: float = 80.0,
    has_media: bool = False,
    nearby_sensor_rainfall: float = 0.0,
    nearby_sensor_water_level: float = 0.0
) -> Dict[str, Any]:
    """
    Computes ML authenticity score (0-100) and classification verdict.
    """
    base_score = user_trust_score
    flags = []
    
    # 1. Text Sensationalism penalty
    penalty, text_flags = analyze_text_sensationalism(report_text)
    base_score -= penalty
    flags.extend(text_flags)
    
    # 2. Sensor cross-check validation
    # If text claims severe flooding
    is_claiming_flood = any(w in report_text.lower() for w in ["flood", "waterlog", "submerge", "overflow", "drown"])
    
    if is_claiming_flood:
        if nearby_sensor_rainfall > 50.0 or nearby_sensor_water_level > 3.5:
            # Corroborated by official station! Boost authenticity
            base_score += 12.0
            flags.append("CORROBORATED_BY_OFFICIAL_GROUND_STATION")
        elif nearby_sensor_rainfall < 5.0 and nearby_sensor_water_level < 2.0:
            # Contradicted by dry sensors in that place
            base_score -= 30.0
            flags.append("CONTRADICTED_BY_DRY_GROUND_SENSORS")
            
    # 3. Media verification bonus
    if has_media:
        base_score += 8.0
        flags.append("MEDIA_ATTACHMENT_VERIFIED")
        
    final_score = round(max(5.0, min(99.0, base_score)), 1)
    
    if final_score >= 75.0:
        verdict = "VERIFIED_GENUINE"
        verified_badge = True
    elif final_score >= 50.0:
        verdict = "SUSPECTED_ANOMALY"
        verified_badge = False
    else:
        verdict = "FLAGGED_MISLEADING"
        verified_badge = False
        
    return {
        "authenticity_score": final_score,
        "verdict": verdict,
        "verified_badge": verified_badge,
        "anomaly_flags": flags,
        "sensor_crosscheck": {
            "sensor_rainfall_mm": nearby_sensor_rainfall,
            "sensor_water_level_m": nearby_sensor_water_level,
            "corroborated": "CORROBORATED_BY_OFFICIAL_GROUND_STATION" in flags
        }
    }
