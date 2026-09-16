"""
Authenticity Scoring & Visual ASCII Bar Generator (Phase 4.5 & Layout.txt Spec)
Renders the high-precision 20-segment authenticity bar used in layout.txt and computes
source/user reliability ratings.
"""

from typing import Dict, Any

def generate_ascii_bar(percentage: float, total_blocks: int = 20) -> str:
    """
    Renders an ASCII block progress bar matching layout.txt:
    e.g. 95% -> ███████████████████░
         82% -> ████████████████░░░░
         61% -> ████████████░░░░░░░░
    """
    percentage = max(0.0, min(100.0, percentage))
    filled_count = int(round((percentage / 100.0) * total_blocks))
    empty_count = total_blocks - filled_count
    return ("█" * filled_count) + ("░" * empty_count)

def calculate_source_trust(source_metadata: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes calibrated authenticity percentage, verified badge flag, and ASCII bar.
    """
    score = float(source_metadata.get("authenticity_score", 85.0))
    is_verified = bool(source_metadata.get("verified", score >= 75.0))
    status = source_metadata.get("status", "ACTIVE")
    
    # Degraded or delayed sources get status flag
    if status == "DELAYED":
        is_verified = False
        
    ascii_bar = generate_ascii_bar(score, total_blocks=20)
    
    return {
        "score": round(score, 1),
        "is_verified": is_verified,
        "status": status,
        "ascii_bar": ascii_bar,
        "formatted_display": f"{ascii_bar}  {int(round(score))}%"
    }
