"""
Semantic & Geospatial Deduplication Engine (Phase 4.3 Spec)
Merges duplicate reports of the same incident across nearby coordinates and time windows.
"""

import math
from typing import List, Dict, Any

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in kilometers."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    
    a = math.sin(dphi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def text_token_similarity(text1: str, text2: str) -> float:
    """Calculates Jaccard similarity across token sets."""
    tokens1 = set(text1.lower().split())
    tokens2 = set(text2.lower().split())
    if not tokens1 or not tokens2:
        return 0.0
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    return len(intersection) / len(union)

def is_duplicate_report(
    new_report: Dict[str, Any],
    existing_reports: List[Dict[str, Any]],
    max_distance_km: float = 6.0,
    min_similarity: float = 0.45
) -> bool:
    """
    Checks if a new incoming report duplicates any recent report.
    """
    new_lat = new_report.get("latitude", 0.0)
    new_lon = new_report.get("longitude", 0.0)
    new_text = new_report.get("description", "") or new_report.get("title", "")

    for existing in existing_reports:
        ex_lat = existing.get("latitude", 0.0)
        ex_lon = existing.get("longitude", 0.0)
        ex_text = existing.get("description", "") or existing.get("title", "")

        # If locations are known, check distance
        if new_lat and ex_lat:
            dist = haversine_km(new_lat, new_lon, ex_lat, ex_lon)
            if dist > max_distance_km:
                continue

        sim = text_token_similarity(new_text, ex_text)
        if sim >= min_similarity:
            return True

    return False
