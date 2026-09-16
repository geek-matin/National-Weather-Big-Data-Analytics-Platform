import re
import time
import logging
from typing import Optional, Tuple, Dict, Any
import requests

logger = logging.getLogger("imd.ner_geocoder")

# Comprehensive Gazetteer of Indian Meteorological Stations, Major Districts and Metropolises
INDIAN_CITIES: Dict[str, Dict[str, Any]] = {
    # Metros & Key Regional Hubs
    "mumbai": {"state": "Maharashtra", "lat": 19.0760, "lon": 72.8777},
    "bombay": {"state": "Maharashtra", "lat": 19.0760, "lon": 72.8777},
    "delhi": {"state": "Delhi", "lat": 28.6139, "lon": 77.2090},
    "new delhi": {"state": "Delhi", "lat": 28.6139, "lon": 77.2090},
    "bengaluru": {"state": "Karnataka", "lat": 12.9716, "lon": 77.5946},
    "bangalore": {"state": "Karnataka", "lat": 12.9716, "lon": 77.5946},
    "chennai": {"state": "Tamil Nadu", "lat": 13.0827, "lon": 80.2707},
    "madras": {"state": "Tamil Nadu", "lat": 13.0827, "lon": 80.2707},
    "kolkata": {"state": "West Bengal", "lat": 22.5726, "lon": 88.3639},
    "calcutta": {"state": "West Bengal", "lat": 22.5726, "lon": 88.3639},
    "hyderabad": {"state": "Telangana", "lat": 17.3850, "lon": 78.4867},
    "ahmedabad": {"state": "Gujarat", "lat": 23.0225, "lon": 72.5714},
    "pune": {"state": "Maharashtra", "lat": 18.5204, "lon": 73.8567},
    "jaipur": {"state": "Rajasthan", "lat": 26.9124, "lon": 75.7873},
    "lucknow": {"state": "Uttar Pradesh", "lat": 26.8467, "lon": 80.9462},
    "surat": {"state": "Gujarat", "lat": 21.1702, "lon": 72.8311},
    "patna": {"state": "Bihar", "lat": 25.5941, "lon": 85.1376},
    "bhopal": {"state": "Madhya Pradesh", "lat": 23.2599, "lon": 77.4126},
    "nagpur": {"state": "Maharashtra", "lat": 21.1458, "lon": 79.0882},
    "visakhapatnam": {"state": "Andhra Pradesh", "lat": 17.6868, "lon": 83.2185},
    "vizag": {"state": "Andhra Pradesh", "lat": 17.6868, "lon": 83.2185},
    "kanpur": {"state": "Uttar Pradesh", "lat": 26.4499, "lon": 80.3319},
    "thane": {"state": "Maharashtra", "lat": 19.2183, "lon": 72.9781},
    "indore": {"state": "Madhya Pradesh", "lat": 22.7196, "lon": 75.8577},
    "vadodara": {"state": "Gujarat", "lat": 22.3072, "lon": 73.1812},
    "ghaziabad": {"state": "Uttar Pradesh", "lat": 28.6692, "lon": 77.4538},
    "ludhiana": {"state": "Punjab", "lat": 30.9010, "lon": 75.8573},
    "coimbatore": {"state": "Tamil Nadu", "lat": 11.0168, "lon": 76.9558},
    "kochi": {"state": "Kerala", "lat": 9.9312, "lon": 76.2673},
    "cochin": {"state": "Kerala", "lat": 9.9312, "lon": 76.2673},
    "thiruvananthapuram": {"state": "Kerala", "lat": 8.5241, "lon": 76.9366},
    "trivandrum": {"state": "Kerala", "lat": 8.5241, "lon": 76.9366},
    "bhubaneswar": {"state": "Odisha", "lat": 20.2961, "lon": 85.8245},
    "guwahati": {"state": "Assam", "lat": 26.1445, "lon": 91.7362},
    "chandigarh": {"state": "Chandigarh", "lat": 30.7333, "lon": 76.7794},
    "dehradun": {"state": "Uttarakhand", "lat": 30.3165, "lon": 78.0322},
    "shimla": {"state": "Himachal Pradesh", "lat": 31.1048, "lon": 77.1734},
    "srinagar": {"state": "Jammu & Kashmir", "lat": 34.0837, "lon": 74.7973},
    "jammu": {"state": "Jammu & Kashmir", "lat": 32.7266, "lon": 74.8570},
    "ranchi": {"state": "Jharkhand", "lat": 23.3441, "lon": 85.3096},
    "raipur": {"state": "Chhattisgarh", "lat": 21.2514, "lon": 81.6296},
    "varanasi": {"state": "Uttar Pradesh", "lat": 25.3176, "lon": 82.9739},
    "amritsar": {"state": "Punjab", "lat": 31.6340, "lon": 74.8723},
    "jodhpur": {"state": "Rajasthan", "lat": 26.2389, "lon": 73.0243},
    "udaipur": {"state": "Rajasthan", "lat": 24.5854, "lon": 73.7125},
    "jaisalmer": {"state": "Rajasthan", "lat": 26.9157, "lon": 70.9083},
    "gwalior": {"state": "Madhya Pradesh", "lat": 26.2183, "lon": 78.1828},
    "vijayawada": {"state": "Andhra Pradesh", "lat": 16.5062, "lon": 80.6480},
    "madurai": {"state": "Tamil Nadu", "lat": 9.9252, "lon": 78.1198},
    "mysore": {"state": "Karnataka", "lat": 12.2958, "lon": 76.6394},
    "mysuru": {"state": "Karnataka", "lat": 12.2958, "lon": 76.6394},
    "mangalore": {"state": "Karnataka", "lat": 12.9141, "lon": 74.8560},
    "mangaluru": {"state": "Karnataka", "lat": 12.9141, "lon": 74.8560},
    "noida": {"state": "Uttar Pradesh", "lat": 28.5355, "lon": 77.3910},
    "gurgaon": {"state": "Haryana", "lat": 28.4595, "lon": 77.0266},
    "gurugram": {"state": "Haryana", "lat": 28.4595, "lon": 77.0266},
    "faridabad": {"state": "Haryana", "lat": 28.4089, "lon": 77.3178},
    "navi mumbai": {"state": "Maharashtra", "lat": 19.0330, "lon": 73.0297},
    "agra": {"state": "Uttar Pradesh", "lat": 27.1767, "lon": 78.0081},
    "nashik": {"state": "Maharashtra", "lat": 19.9975, "lon": 73.7898},
    "rajkot": {"state": "Gujarat", "lat": 22.3039, "lon": 70.8022},
    "allahabad": {"state": "Uttar Pradesh", "lat": 25.4358, "lon": 81.8463},
    "prayagraj": {"state": "Uttar Pradesh", "lat": 25.4358, "lon": 81.8463},
    "jamshedpur": {"state": "Jharkhand", "lat": 22.8046, "lon": 86.2029},
    "cuttack": {"state": "Odisha", "lat": 20.4625, "lon": 85.8830},
    "puri": {"state": "Odisha", "lat": 19.8135, "lon": 85.8312},
    "shillong": {"state": "Meghalaya", "lat": 25.5788, "lon": 91.8933},
    "imphal": {"state": "Manipur", "lat": 24.8170, "lon": 93.9368},
    "agartala": {"state": "Tripura", "lat": 23.8315, "lon": 91.2868},
    "aizawl": {"state": "Mizoram", "lat": 23.7271, "lon": 92.7176},
    "kohima": {"state": "Nagaland", "lat": 25.6751, "lon": 94.1086},
    "itanagar": {"state": "Arunachal Pradesh", "lat": 27.0844, "lon": 93.6053},
    "gangtok": {"state": "Sikkim", "lat": 27.3389, "lon": 88.6065},
    "panaji": {"state": "Goa", "lat": 15.4909, "lon": 73.8278},
    "goa": {"state": "Goa", "lat": 15.2993, "lon": 74.1240},
    "port blair": {"state": "Andaman and Nicobar", "lat": 11.6234, "lon": 92.7265},
    "siliguri": {"state": "West Bengal", "lat": 26.7271, "lon": 88.3953},
    "darjeeling": {"state": "West Bengal", "lat": 27.0410, "lon": 88.2663},
    "haridwar": {"state": "Uttarakhand", "lat": 29.9457, "lon": 78.1642},
    "rishikesh": {"state": "Uttarakhand", "lat": 30.0869, "lon": 78.2676},
    "dharamsala": {"state": "Himachal Pradesh", "lat": 32.2190, "lon": 76.3234},
    "manali": {"state": "Himachal Pradesh", "lat": 32.2432, "lon": 77.1892},
    "kullu": {"state": "Himachal Pradesh", "lat": 31.9579, "lon": 77.1095},
    "leh": {"state": "Ladakh", "lat": 34.1526, "lon": 77.5771},
    "ladakh": {"state": "Ladakh", "lat": 34.1526, "lon": 77.5771},
}

# Add key localities for high-risk metro areas (e.g. Dadar in Mumbai, Velachery in Chennai)
LOCALITIES: Dict[str, str] = {
    "dadar": "mumbai",
    "andheri": "mumbai",
    "bandra": "mumbai",
    "kurla": "mumbai",
    "borivali": "mumbai",
    "chembur": "mumbai",
    "dharavi": "mumbai",
    "colaba": "mumbai",
    "connaught place": "delhi",
    "rohini": "delhi",
    "dwarka": "delhi",
    "saket": "delhi",
    "velachery": "chennai",
    "tambaram": "chennai",
    "t nagar": "chennai",
    "guindy": "chennai",
    "indiranagar": "bengaluru",
    "koramangala": "bengaluru",
    "whitefield": "bengaluru",
    "hitec city": "hyderabad",
    "gachibowli": "hyderabad",
    "salt lake": "kolkata",
    "howrah": "kolkata",
    "park street": "kolkata",
    "hinjawadi": "pune",
    "kothrud": "pune",
    "shivajinagar": "pune"
}

# Nominatim Cache to strictly obey 1 req/sec and avoid rate-limiting
_nominatim_cache: Dict[str, Optional[Tuple[float, float, str]]] = {}
_last_nominatim_call = 0.0

def extract_location(text: str) -> Tuple[Optional[str], Optional[str], Optional[float], Optional[float]]:
    """
    Extracts Indian city, state, latitude, and longitude from text using:
    1. Localities mapping (e.g. 'Dadar' -> Mumbai)
    2. Indian Cities Gazetteer (instant O(1) matching)
    3. Nominatim OpenStreetMap fallback with local caching
    """
    cleaned = text.lower()

    # Step 1: Check known localities first
    for loc, mapped_city in LOCALITIES.items():
        if re.search(r'\b' + re.escape(loc) + r'\b', cleaned):
            info = INDIAN_CITIES[mapped_city]
            return mapped_city.title(), info["state"], info["lat"], info["lon"]

    # Step 2: Check Indian Cities Gazetteer
    for city, info in INDIAN_CITIES.items():
        # Match word boundaries to prevent substring collisions (e.g. 'in' inside 'rain')
        if re.search(r'\b' + re.escape(city) + r'\b', cleaned):
            return city.title(), info["state"], info["lat"], info["lon"]

    # Step 3: Check Indian State mentions
    for city, info in INDIAN_CITIES.items():
        state_name = info["state"].lower()
        if re.search(r'\b' + re.escape(state_name) + r'\b', cleaned):
            return city.title(), info["state"], info["lat"], info["lon"]

    # Step 4: Nominatim fallback for candidate capitalised words (if needed)
    candidate_match = re.search(r'in\s+([A-Z][a-zA-Z]+)', text)
    if candidate_match:
        candidate = candidate_match.group(1).lower()
        coords = _geocode_nominatim(candidate)
        if coords:
            lat, lon, state = coords
            return candidate.title(), state, lat, lon

    # Default fallback: central India (Nagpur) with lower confidence if no match found
    return "India (Regional)", "National", 20.5937, 78.9629

def _geocode_nominatim(place_name: str) -> Optional[Tuple[float, float, str]]:
    """Geocode via OpenStreetMap Nominatim with caching and rate-limiting."""
    global _last_nominatim_call
    if place_name in _nominatim_cache:
        return _nominatim_cache[place_name]

    # Rate-limit 1 req/sec
    now = time.time()
    elapsed = now - _last_nominatim_call
    if elapsed < 1.1:
        time.sleep(1.1 - elapsed)
    _last_nominatim_call = time.time()

    try:
        url = "https://nominatim.openstreetmap.org/search"
        headers = {"User-Agent": "IMD-BigData-CrisisMonitor/1.0 (sih2026@imd.gov.in)"}
        params = {"q": f"{place_name}, India", "format": "json", "limit": 1}
        resp = requests.get(url, params=params, headers=headers, timeout=3.0)
        if resp.status_code == 200 and resp.json():
            data = resp.json()[0]
            lat = float(data["lat"])
            lon = float(data["lon"])
            state = "India"
            _nominatim_cache[place_name] = (lat, lon, state)
            return (lat, lon, state)
    except Exception as e:
        logger.warning(f"Nominatim lookup failed for '{place_name}': {e}")

    _nominatim_cache[place_name] = None
    return None
