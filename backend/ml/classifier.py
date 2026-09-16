"""
Event Auto-Categorization ML Classifier (Phase 4.4 Spec)
Classifies meteorological/hydrological text and telemetry into canonical event types:
- rainfall
- thunderstorm
- flooding
- heatwave
- fog
- dust storm
- strong wind
"""

import re
from typing import Dict, Any, List

KEYWORD_MAP = {
    "flooding": [
        "flood", "waterlogging", "inundat", "submerg", "overflow", "drown", "breach", 
        "deluge", "drainage", "water level", "subway flooded", "mithi river", "nullah", "high tide"
    ],
    "rainfall": [
        "rain", "downpour", "shower", "monsoon", "precipitation", "cloudburst", "drizzle", "torrential"
    ],
    "thunderstorm": [
        "thunder", "lightning", "strike", "storm", "thundercloud", "squall", "bolting", "electr"
    ],
    "heatwave": [
        "heat", "loo", "hot", "sunstroke", "scorching", "temperature", "dehydration", "45 degree", "mercury"
    ],
    "dust storm": [
        "dust", "andhi", "sandstorm", "grit", "particulate", "haze", "sand", "haboob"
    ],
    "fog": [
        "fog", "smog", "visibility", "dense fog", "mist", "zero visibility", "runway fog", "train delay"
    ],
    "strong wind": [
        "wind", "gale", "gust", "cyclone", "tree uprooted", "tin roof", "cyclonic", "depression"
    ]
}

def classify_event(text: str, sensor_metrics: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Classifies a disaster report or bulletin text into standard categories.
    Returns: category, confidence (0.0 to 1.0), and keyword matches.
    """
    cleaned = text.lower()
    scores: Dict[str, float] = {cat: 0.0 for cat in KEYWORD_MAP}
    matches: Dict[str, List[str]] = {cat: [] for cat in KEYWORD_MAP}

    for cat, kws in KEYWORD_MAP.items():
        for kw in kws:
            if re.search(r'\b' + re.escape(kw), cleaned):
                scores[cat] += 1.0
                matches[cat].append(kw)

    # Sensor telemetry heuristics if available
    if sensor_metrics:
        rain = sensor_metrics.get("rainfall_mm", 0.0)
        water = sensor_metrics.get("water_level_m", 0.0)
        wind = sensor_metrics.get("wind_kmh", 0.0)
        temp = sensor_metrics.get("temperature_c", 28.0)

        if water >= 4.0 or rain >= 70.0:
            scores["flooding"] += 2.5
        if rain >= 25.0:
            scores["rainfall"] += 1.5
        if wind >= 45.0:
            scores["strong wind"] += 2.0
        if temp >= 42.0:
            scores["heatwave"] += 3.0

    # Determine highest scoring category
    best_cat = max(scores, key=scores.get)
    best_score = scores[best_cat]

    if best_score == 0:
        return {
            "category": "rainfall",
            "confidence": 0.5,
            "matched_terms": [],
            "all_scores": scores
        }

    total = sum(scores.values())
    confidence = round(min(0.99, (best_score / total) * 0.7 + 0.3), 2)

    return {
        "category": best_cat,
        "confidence": confidence,
        "matched_terms": matches[best_cat],
        "all_scores": scores
    }
