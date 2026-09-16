from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone, timedelta
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class EventDeduplicator:
    """
    Geospatial and Semantic Deduplication engine.
    Maintains a rolling spatial-temporal cache of recent events to identify near-duplicates.
    """

    def __init__(self, threshold: float = 0.82):
        self.threshold = threshold
        self.vectorizer = TfidfVectorizer(ngram_range=(1, 3), analyzer="word", min_df=1)
        # In-memory index: city -> list of event dicts: {"id": str, "text": str, "timestamp": datetime, "vector": array}
        self.city_index: Dict[str, List[Dict[str, Any]]] = {}

    def check_and_register(
        self,
        event_id: str,
        text: str,
        city: str,
        category: str,
        timestamp: datetime
    ) -> Tuple[bool, Optional[str], int]:
        """
        Checks if text is a duplicate of a recent event in the same city and category.
        Returns: (is_duplicate: bool, canonical_event_id: Optional[str], corroborating_count: int)
        """
        city_key = (city or "unknown").lower()
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(hours=24)

        if city_key not in self.city_index:
            self.city_index[city_key] = []

        # Prune older entries
        self.city_index[city_key] = [
            e for e in self.city_index[city_key]
            if e["timestamp"] >= cutoff
        ]

        existing_events = self.city_index[city_key]

        # Calculate corroboration count for this city & category
        same_cat_events = [e for e in existing_events if e["category"] == category]
        corroborating_count = len(same_cat_events)

        if not existing_events:
            # First event in this region
            self.city_index[city_key].append({
                "id": event_id,
                "text": text,
                "category": category,
                "timestamp": timestamp
            })
            return False, None, corroborating_count

        # Check semantic similarity against same category events
        for candidate in same_cat_events:
            sim = self._compute_similarity(text, candidate["text"])
            if sim >= self.threshold:
                # Found duplicate! Canonical is the earlier candidate
                return True, candidate["id"], corroborating_count

        # Register this event as a canonical record
        self.city_index[city_key].append({
            "id": event_id,
            "text": text,
            "category": category,
            "timestamp": timestamp
        })
        return False, None, corroborating_count

    def _compute_similarity(self, text1: str, text2: str) -> float:
        """Computes TF-IDF cosine similarity between two texts."""
        try:
            tfidf = self.vectorizer.fit_transform([text1.lower(), text2.lower()])
            sim_matrix = cosine_similarity(tfidf[0:1], tfidf[1:2])
            return float(sim_matrix[0][0])
        except Exception:
            # Fallback simple Jaccard token overlap
            s1 = set(text1.lower().split())
            s2 = set(text2.lower().split())
            intersection = len(s1.intersection(s2))
            union = len(s1.union(s2))
            return intersection / union if union > 0 else 0.0

deduplicator = EventDeduplicator()
