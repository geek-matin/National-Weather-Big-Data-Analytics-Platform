import re
from typing import List, Optional
from datetime import datetime, timedelta

# Source base trust weights
SOURCE_WEIGHTS = {
    "rss_imd": 0.95,
    "news_ndma": 0.90,
    "citizen_report": 0.70,
    "reddit": 0.60,
    "synthetic": 0.55
}

# Sensationalist & Rumor Trigger Patterns
SENSATIONAL_PATTERNS = [
    r"\b(apocalypse|run for your lives|doomsday|end of the world)\b",
    r"\b(secret coverup|govt is lying|they are hiding)\b",
    r"\b(unbelievable catastrophe|worst in human history)\b",
    r"[!]{3,}",          # Multiple exclamations like !!!
    r"\b[A-Z]{5,}\b"     # Excessive shouting in ALL CAPS
]

def calculate_trust_score(
    raw_text: str,
    source_name: str,
    media_urls: Optional[List[str]] = None,
    corroborating_count: int = 0,
    author_handle: Optional[str] = None
) -> float:
    """
    Computes composite trust score between 0.0 and 1.0 based on:
    1. Baseline source credibility
    2. Media verification bonus
    3. Sensationalism & rumor penalties
    4. Cross-report geospatial corroboration
    """
    base_weight = SOURCE_WEIGHTS.get(source_name.lower(), 0.50)
    score = base_weight

    # 1. Media attachment bonus (authentic on-the-ground visual evidence)
    if media_urls and len(media_urls) > 0:
        score += 0.12

    # 2. Corroboration bonus (independent confirmation from other nodes/citizens)
    if corroborating_count >= 3:
        score += 0.20
    elif corroborating_count >= 1:
        score += 0.10

    # 3. Official verified handle bonus
    if author_handle:
        handle_lower = author_handle.lower()
        if any(official in handle_lower for official in ["imd", "ndma", "ndrf", "gov", "police", "collector"]):
            score += 0.20

    # 4. Sensationalism & Rumor Penalties
    for pattern in SENSATIONAL_PATTERNS:
        if re.search(pattern, raw_text, re.IGNORECASE):
            score -= 0.15

    # Clamp between 0.05 and 0.99
    return round(max(0.05, min(0.99, score)), 2)

def evaluate_verification(trust_score: float, corroborating_count: int, source_name: str) -> bool:
    """
    Evaluates whether an event satisfies IMD criteria for verified disaster telemetry.
    """
    # Official IMD or NDMA alerts are auto-verified
    if source_name.lower() in ["rss_imd", "news_ndma"]:
        return True

    # High trust score and corroborated by at least 1 other report
    if trust_score >= 0.70 and corroborating_count >= 1:
        return True

    # Very high trust score (e.g. citizen with clear photo and high confidence)
    if trust_score >= 0.85:
        return True

    return False
