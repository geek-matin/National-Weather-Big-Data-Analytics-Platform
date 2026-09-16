import re
from typing import Tuple, Dict, List
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# Category definition matching IMD Disaster Management specs
CATEGORIES = [
    "rainfall",
    "thunderstorm",
    "flood",
    "heatwave",
    "fog",
    "dust_storm",
    "strong_wind",
    "other"
]

# Rule-based keyword mapping with weights and severity implications
CATEGORY_RULES: Dict[str, Dict[str, Any]] = {
    "flood": {
        "keywords": [
            "flood", "flooding", "waterlogging", "waterlogged", "deluge", "submerged",
            "inundated", "inundation", "overflowing", "river overflow", "submersion",
            "breach", "submerged roads", "water entered houses", "ndrf deployed", "rescue boats"
        ],
        "severity": "CRITICAL",
        "weight": 2.5
    },
    "cyclone": { # Maps into strong_wind/thunderstorm or flagged as critical
        "keywords": ["cyclone", "cyclonic", "depression", "super cyclone", "landfall", "eye of storm"],
        "severity": "CRITICAL",
        "weight": 2.8,
        "category_alias": "strong_wind"
    },
    "thunderstorm": {
        "keywords": [
            "thunderstorm", "lightning", "thunder", "cloudburst", "hailstorm", "hail",
            "heavy lightning strikes", "thunderous", "electric storm"
        ],
        "severity": "SEVERE",
        "weight": 2.2
    },
    "heatwave": {
        "keywords": [
            "heatwave", "heat wave", "loo", "scorching", "extreme heat", "mercury crossed",
            "45 degrees", "48 degrees", "sunstroke", "dehydration alert", "yellow alert heat"
        ],
        "severity": "SEVERE",
        "weight": 2.0
    },
    "dust_storm": {
        "keywords": [
            "dust storm", "duststorm", "sandstorm", "andhi", "haze storm", "blind dust"
        ],
        "severity": "MODERATE",
        "weight": 2.0
    },
    "strong_wind": {
        "keywords": [
            "strong wind", "gale", "gust", "gusty", "high wind", "trees uprooted",
            "squall", "destructive winds", "wind speed"
        ],
        "severity": "MODERATE",
        "weight": 1.8
    },
    "fog": {
        "keywords": [
            "dense fog", "smog", "fog", "zero visibility", "poor visibility", "foggy",
            "runway visibility low", "trains delayed fog"
        ],
        "severity": "ADVISORY",
        "weight": 1.7
    },
    "rainfall": {
        "keywords": [
            "rain", "rainfall", "heavy rain", "downpour", "monsoon", "drizzle", "showers",
            "precipitation", "cloudy with rain", "wet spell"
        ],
        "severity": "MODERATE",
        "weight": 1.5
    }
}

# Pre-trained Lightweight TF-IDF Machine Learning Classifier for NLP nuance
_TRAINING_CORPUS = [
    # Rainfall
    ("Heavy rainfall observed across south coastal belts with steady downpour", "rainfall"),
    ("Monsoon showers bring relief from heat with continuous light rain", "rainfall"),
    ("Drizzle and cloudy overcast skies recorded by meteorological department", "rainfall"),
    ("IMD issues orange alert for heavy to very heavy rain tomorrow", "rainfall"),
    # Thunderstorm
    ("Intense thunderstorm with lightning strikes reported across central region", "thunderstorm"),
    ("Cloudburst like situation accompanied by violent thunder and hail", "thunderstorm"),
    ("Severe lightning warning issued for farmers working in open fields", "thunderstorm"),
    ("Sudden hailstorm damages standing crops and vehicles", "thunderstorm"),
    # Flood
    ("Massive waterlogging in low lying residential colonies streets submerged", "flood"),
    ("River crossed danger mark, NDRF teams mobilized for flood relief", "flood"),
    ("Severe urban flooding reported, vehicles floating in waterlogged underpass", "flood"),
    ("Dam gates opened due to rising reservoir level leading to downstream deluge", "flood"),
    # Heatwave
    ("Severe heatwave conditions prevail as temperatures soar past 46 Celsius", "heatwave"),
    ("Scorching sun and blistering loo winds keep residents indoors", "heatwave"),
    ("IMD issues red alert for severe heatwave in northwestern plains", "heatwave"),
    ("Extreme daytime temperatures cause heat exhaustion and dehydration", "heatwave"),
    # Fog
    ("Dense smog and winter fog drops visibility to less than 50 meters", "fog"),
    ("Flight operations disrupted at airport due to impenetrable morning fog", "fog"),
    ("Dense fog envelops highway leading to multi-vehicle pile up", "fog"),
    # Dust Storm
    ("Blinding dust storm reduces visibility suddenly with howling dry winds", "dust_storm"),
    ("Intense andhi hits western sector turning sky orange with sand", "dust_storm"),
    # Strong Wind
    ("Gusty winds reaching 70 kmph uproot trees and electricity poles", "strong_wind"),
    ("Gale force squall damages tin sheds and hoardings across city", "strong_wind"),
    ("Cyclonic storm approaches coast with high velocity winds", "strong_wind"),
    # Other
    ("Weather forecast normal with clear blue skies and mild breeze", "other"),
    ("No significant weather anomaly reported for the next 48 hours", "other")
]

class WeatherClassifier:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1)
        texts, labels = zip(*_TRAINING_CORPUS)
        X = self.vectorizer.fit_transform(texts)
        self.clf = LogisticRegression(max_iter=200, C=1.5)
        self.clf.fit(X, labels)

    def classify(self, text: str) -> Tuple[str, float, str]:
        """
        Classifies weather text into a disaster category.
        Returns: (category, confidence, severity)
        """
        cleaned = text.lower()

        # Phase 1: Rule-based keyword matching with priority scoring
        best_cat = None
        best_score = 0.0
        best_sev = "MODERATE"

        for cat, meta in CATEGORY_RULES.items():
            matched_count = 0
            for kw in meta["keywords"]:
                if re.search(r'\b' + re.escape(kw) + r'\b', cleaned):
                    matched_count += 1
            
            if matched_count > 0:
                score = matched_count * meta["weight"]
                if score > best_score:
                    best_score = score
                    target_cat = meta.get("category_alias", cat)
                    best_cat = target_cat
                    best_sev = meta["severity"]

        if best_cat and best_score >= 1.5:
            confidence = min(0.98, 0.70 + (best_score * 0.08))
            return best_cat, round(confidence, 2), best_sev

        # Phase 2: Machine Learning Model fallback
        try:
            X_test = self.vectorizer.transform([cleaned])
            pred_cat = self.clf.predict(X_test)[0]
            probs = self.clf.predict_proba(X_test)[0]
            confidence = float(max(probs))

            # Determine severity based on predicted category
            sev = "MODERATE"
            if pred_cat in ["flood"]:
                sev = "CRITICAL"
            elif pred_cat in ["thunderstorm", "heatwave"]:
                sev = "SEVERE"
            elif pred_cat in ["fog"]:
                sev = "ADVISORY"

            return pred_cat, round(max(0.60, confidence), 2), sev
        except Exception:
            return "rainfall", 0.65, "MODERATE"

classifier = WeatherClassifier()
