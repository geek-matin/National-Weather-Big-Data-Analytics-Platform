import asyncio
import random
import argparse
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List

logger = logging.getLogger("imd.synthetic_gen")

# Authentic Indian Meteorological scenarios
WEATHER_SCENARIOS = [
    # Rainfall & Monsoons
    {
        "template": "Continuous heavy rainfall in {city}, {state}. Local drains overflowing and traffic moving slowly along arterial roads. #IMD #MonsoonAlert",
        "category": "rainfall",
        "source": "synthetic",
        "author": "@metro_weather_in",
        "has_media": True,
        "is_sensational": False
    },
    {
        "template": "IMD records 85mm rainfall in past 6 hours across {city}, {state}. Low-lying roads experiencing slow movement. #IMD #RainfallUpdate",
        "category": "rainfall",
        "source": "synthetic",
        "author": "@india_rain_tracker",
        "has_media": False,
        "is_sensational": False
    },
    # Floods & Waterlogging
    {
        "template": "Severe urban waterlogging reported near central junction in {city}. Knee-deep water entered shops and bus depots. NDRF alerted. #FloodAlert #IMD",
        "category": "flood",
        "source": "synthetic",
        "author": "@citizen_watch_in",
        "has_media": True,
        "is_sensational": False
    },
    {
        "template": "River overflowing above danger level near {city}, {state}. Administration orders evacuation of riverside hutments. #FloodRelief #IMD",
        "category": "flood",
        "source": "synthetic",
        "author": "@disaster_monitor_in",
        "has_media": True,
        "is_sensational": False
    },
    # Thunderstorms & Lightning
    {
        "template": "Violent thunderstorm with frequent lightning strikes rocking {city} right now! High alert advised for those outdoors. #Thunderstorm #IMD",
        "category": "thunderstorm",
        "source": "synthetic",
        "author": "@storm_radar_in",
        "has_media": True,
        "is_sensational": False
    },
    {
        "template": "Sudden hailstorm and squall in {city}, {state}. Tree branches snapped on highway. #ThunderstormAlert #IMD",
        "category": "thunderstorm",
        "source": "synthetic",
        "author": "@commuter_daily",
        "has_media": False,
        "is_sensational": False
    },
    # Heatwaves
    {
        "template": "Scorching heatwave in {city}, {state} as daytime temperature touches 46.2°C. IMD issues Orange Alert. Avoid direct afternoon sun! #Heatwave #IMD",
        "category": "heatwave",
        "source": "synthetic",
        "author": "@weather_station_imd",
        "has_media": False,
        "is_sensational": False
    },
    {
        "template": "Severe heat wave conditions persisting over {city}. Blistering loo winds reported since 11 AM. #HeatwaveAlert #IMD",
        "category": "heatwave",
        "source": "synthetic",
        "author": "@regional_met_centre",
        "has_media": False,
        "is_sensational": False
    },
    # Fog & Smog
    {
        "template": "Dense fog envelops {city}, {state}. Visibility dropped below 30 meters at international airport. Flights delayed. #FogAlert #IMD",
        "category": "fog",
        "source": "synthetic",
        "author": "@aviation_radar_in",
        "has_media": True,
        "is_sensational": False
    },
    # Dust Storms
    {
        "template": "Massive blinding dust storm sweeping across {city}, {state}. Day turns to twilight, visibility zero! #DustStorm #IMD",
        "category": "dust_storm",
        "source": "synthetic",
        "author": "@desert_pulse",
        "has_media": True,
        "is_sensational": False
    },
    # Strong Wind / Cyclone
    {
        "template": "Destructive gale winds up to 85 kmph pounding coastal {city}, {state}. Tin roofs blown away, power lines disrupted. #CycloneAlert #IMD",
        "category": "strong_wind",
        "source": "synthetic",
        "author": "@coastal_guard_news",
        "has_media": True,
        "is_sensational": False
    },
    # Intentionally Sensationalist / Fake News Examples (To test Fake Detection)
    {
        "template": "APOCALYPSE NOW IN {city}!!! THE WHOLE CITY IS DROWNING AND GOVT IS LYING ABOUT THE CASUALTIES RUN FOR YOUR LIVES IMMEDIATELY!!!!! #FakeRumor",
        "category": "flood",
        "source": "synthetic",
        "author": "@panic_broadcast99",
        "has_media": False,
        "is_sensational": True
    },
    {
        "template": "UNBELIEVABLE CATASTROPHE IN {city} SECRET COVERUP TSUNAMI WAVE HEADING THIS WAY DON'T TRUST OFFICIAL FORECASTS!!!!!!",
        "category": "strong_wind",
        "source": "synthetic",
        "author": "@conspiracy_central",
        "has_media": False,
        "is_sensational": True
    }
]

LOCATIONS = [
    {"city": "Mumbai", "state": "Maharashtra", "lat": 19.0760, "lon": 72.8777},
    {"city": "Delhi", "state": "Delhi", "lat": 28.6139, "lon": 77.2090},
    {"city": "Bengaluru", "state": "Karnataka", "lat": 12.9716, "lon": 77.5946},
    {"city": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lon": 80.2707},
    {"city": "Kolkata", "state": "West Bengal", "lat": 22.5726, "lon": 88.3639},
    {"city": "Hyderabad", "state": "Telangana", "lat": 17.3850, "lon": 78.4867},
    {"city": "Ahmedabad", "state": "Gujarat", "lat": 23.0225, "lon": 72.5714},
    {"city": "Pune", "state": "Maharashtra", "lat": 18.5204, "lon": 73.8567},
    {"city": "Jaipur", "state": "Rajasthan", "lat": 26.9124, "lon": 75.7873},
    {"city": "Lucknow", "state": "Uttar Pradesh", "lat": 26.8467, "lon": 80.9462},
    {"city": "Patna", "state": "Bihar", "lat": 25.5941, "lon": 85.1376},
    {"city": "Bhopal", "state": "Madhya Pradesh", "lat": 23.2599, "lon": 77.4126},
    {"city": "Bhubaneswar", "state": "Odisha", "lat": 20.2961, "lon": 85.8245},
    {"city": "Guwahati", "state": "Assam", "lat": 26.1445, "lon": 91.7362},
    {"city": "Kochi", "state": "Kerala", "lat": 9.9312, "lon": 76.2673},
    {"city": "Visakhapatnam", "state": "Andhra Pradesh", "lat": 17.6868, "lon": 83.2185},
    {"city": "Dehradun", "state": "Uttarakhand", "lat": 30.3165, "lon": 78.0322},
    {"city": "Shimla", "state": "Himachal Pradesh", "lat": 31.1048, "lon": 77.1734},
    {"city": "Srinagar", "state": "Jammu & Kashmir", "lat": 34.0837, "lon": 74.7973},
    {"city": "Ranchi", "state": "Jharkhand", "lat": 23.3441, "lon": 85.3096}
]

# Track recent event texts to inject intentional duplicates
_recent_generated: List[Dict[str, Any]] = []

CATEGORY_MEDIA_MAP = {
    "flood": [
        "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1519692933481-e162a57d6721?auto=format&fit=crop&w=1200&q=80"
    ],
    "rainfall": [
        "https://images.unsplash.com/photo-1519692933481-e162a57d6721?auto=format&fit=crop&w=1200&q=80",
        "https://assets.mixkit.co/videos/preview/mixkit-heavy-rain-falling-on-the-water-of-a-lake-1601-large.mp4"
    ],
    "thunderstorm": [
        "https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?auto=format&fit=crop&w=1200&q=80",
        "https://assets.mixkit.co/videos/preview/mixkit-lightning-in-the-clouds-of-a-storm-41481-large.mp4"
    ],
    "heatwave": [
        "https://images.unsplash.com/photo-1504370805625-d32c54b16100?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?auto=format&fit=crop&w=1200&q=80"
    ],
    "strong_wind": [
        "https://images.unsplash.com/photo-1527482797697-8795b05a13fe?auto=format&fit=crop&w=1200&q=80",
        "https://assets.mixkit.co/videos/preview/mixkit-palm-trees-in-a-violent-tropical-storm-41484-large.mp4"
    ],
    "fog": [
        "https://images.unsplash.com/photo-1485236715568-ddc5ee6ca227?auto=format&fit=crop&w=1200&q=80"
    ],
    "dust_storm": [
        "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80"
    ]
}

def generate_synthetic_event() -> Dict[str, Any]:
    """Generates a realistic synthetic meteorological event with noise and test scenarios."""
    global _recent_generated

    # 15% chance to generate a duplicate of a recent event to test deduplication
    if _recent_generated and random.random() < 0.15:
        target = random.choice(_recent_generated)
        duplicate_text = target["raw_text"]
        if random.random() < 0.5:
            duplicate_text = duplicate_text.replace("traffic moving slowly", "vehicles stranded in water")
        
        return {
            "source_name": "synthetic",
            "raw_text": duplicate_text,
            "city": target["city"],
            "state": target["state"],
            "latitude": target["latitude"],
            "longitude": target["longitude"],
            "author_handle": f"@rep_{random.randint(100, 999)}",
            "media_urls": target.get("media_urls", []),
            "source_url": target.get("source_url", "https://mausam.imd.gov.in/radar"),
            "posted_at": datetime.now(timezone.utc).isoformat()
        }

    loc = random.choice(LOCATIONS)
    scenario = random.choice(WEATHER_SCENARIOS)

    raw_text = scenario["template"].format(city=loc["city"], state=loc["state"])
    cat = scenario["category"]
    
    # Select category-specific actual photo/video
    media_pool = CATEGORY_MEDIA_MAP.get(cat, ["https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=800"])
    media_urls = [random.choice(media_pool)] if scenario["has_media"] or random.random() < 0.70 else []

    # Category and city specific source URL
    city_slug = loc["city"].lower()
    source_urls = [
        f"https://mausam.imd.gov.in/imd_latest/contents/all_india_forcast_bulletin.xml",
        f"https://reddit.com/r/{city_slug}/comments/weather_alert_{random.randint(1000, 9999)}",
        f"https://ndma.gov.in/Alerts/{city_slug}_emergency",
        f"https://news.google.com/search?q={city_slug}+weather+imd"
    ]
    source_url = random.choice(source_urls)

    event_payload = {
        "source_name": scenario["source"],
        "raw_text": raw_text,
        "city": loc["city"],
        "state": loc["state"],
        "latitude": loc["lat"],
        "longitude": loc["lon"],
        "author_handle": scenario["author"],
        "media_urls": media_urls,
        "source_url": source_url,
        "posted_at": datetime.now(timezone.utc).isoformat()
    }

    _recent_generated.append(event_payload)
    if len(_recent_generated) > 20:
        _recent_generated.pop(0)

    return event_payload

async def run_generator(interval_sec: float = 3.0, count: int = 100):
    """Generates and streams synthetic events into the bus for demo purposes."""
    from weather2.backend.bus import bus
    from weather2.backend.database import SessionLocal
    from weather2.ml.processor import process_raw_event

    print(f"[*] Starting Synthetic Ingestion Generator ({interval_sec}s interval, {count} events)...")
    await bus.initialize()

    for i in range(count):
        payload = generate_synthetic_event()
        db = SessionLocal()
        try:
            event = process_raw_event(payload, db)
            if event:
                event_dict = {
                    "id": event.id,
                    "source_id": event.source_id,
                    "source_name": payload.get("source_name", "synthetic"),
                    "raw_text": event.raw_text,
                    "hashtags": event.hashtags or [],
                    "city": event.city,
                    "state": event.state,
                    "latitude": event.latitude,
                    "longitude": event.longitude,
                    "category": event.category,
                    "category_confidence": event.category_confidence,
                    "trust_score": event.trust_score,
                    "is_verified": event.is_verified,
                    "is_duplicate_of": event.is_duplicate_of,
                    "media_urls": event.media_urls or [],
                    "author_handle": event.author_handle,
                    "severity": event.severity,
                    "posted_at": event.posted_at.isoformat() if event.posted_at else None,
                    "ingested_at": event.ingested_at.isoformat() if event.ingested_at else None,
                }
                await bus.broadcast_enriched(event_dict)
                print(f"[{i+1}/{count}] Emitted: {event.category.upper()} in {event.city} | Trust: {event.trust_score} | Duplicate: {bool(event.is_duplicate_of)}")
        finally:
            db.close()

        await asyncio.sleep(interval_sec)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="IMD Synthetic Big Data Ingestion Generator")
    parser.add_argument("--interval", type=float, default=2.5, help="Interval in seconds between events")
    parser.add_argument("--count", type=int, default=50, help="Total number of events to generate")
    args = parser.parse_args()
    asyncio.run(run_generator(args.interval, args.count))
