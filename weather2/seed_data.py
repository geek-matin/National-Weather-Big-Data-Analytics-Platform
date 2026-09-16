import uuid
from datetime import datetime, timezone, timedelta
from weather2.backend.database import engine, Base, SessionLocal
from weather2.backend.models import Event, Source, Alert

HISTORICAL_DATASET = [
    # Mumbai Monsoons & Floods
    {
        "city": "Mumbai", "state": "Maharashtra", "lat": 19.0760, "lon": 72.8777,
        "raw_text": "Extremely heavy rainfall of 214mm recorded in Colaba over 24 hours. Local train services on Central line suspended due to submerged tracks at Kurla and Sion. #IMD #MumbaiRains #FloodWarning",
        "hashtags": ["IMD", "MumbaiRains", "FloodWarning"],
        "category": "flood", "confidence": 0.98, "trust": 0.96, "verified": True,
        "source": "rss_imd", "author": "@imd_mumbai", "severity": "CRITICAL",
        "source_url": "https://mausam.imd.gov.in/imd_latest/contents/all_india_forcast_bulletin.xml",
        "media": [
            "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1200&q=80",
            "https://assets.mixkit.co/videos/preview/mixkit-heavy-rain-falling-on-the-water-of-a-lake-1601-large.mp4"
        ]
    },
    {
        "city": "Mumbai", "state": "Maharashtra", "lat": 19.0178, "lon": 72.8478,
        "raw_text": "Waterlogging 3 feet deep at Dadar TT circle and Hindmata. Municipal pumping stations running at max capacity. #MumbaiRains #IMD",
        "hashtags": ["MumbaiRains", "IMD"],
        "category": "flood", "confidence": 0.94, "trust": 0.88, "verified": True,
        "source": "citizen_report", "author": "citizen:mumbaikar_99", "severity": "SEVERE",
        "source_url": "https://reddit.com/r/mumbai/comments/1e_dadar_waterlogging_update",
        "media": [
            "https://images.unsplash.com/photo-1519692933481-e162a57d6721?auto=format&fit=crop&w=1200&q=80"
        ]
    },
    {
        "city": "Mumbai", "state": "Maharashtra", "lat": 19.1136, "lon": 72.8697,
        "raw_text": "Traffic halted on Western Express Highway near Andheri flyover due to localized waterlogging and fallen tree branches. #TrafficUpdate",
        "hashtags": ["TrafficUpdate"],
        "category": "rainfall", "confidence": 0.89, "trust": 0.78, "verified": True,
        "source": "reddit", "author": "u/bombay_commuter", "severity": "MODERATE",
        "source_url": "https://reddit.com/r/mumbai/comments/1f_weh_andheri_traffic_standstill",
        "media": [
            "https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=1200&q=80"
        ]
    },

    # Delhi Heatwave, Smog & Fog
    {
        "city": "Delhi", "state": "Delhi", "lat": 28.6139, "lon": 77.2090,
        "raw_text": "Severe heat wave conditions prevail in Delhi NCR with maximum temperature reaching 47.4°C at Najafgarh observatory. Red Alert issued by IMD. #Heatwave #DelhiWeather #IMD",
        "hashtags": ["Heatwave", "DelhiWeather", "IMD"],
        "category": "heatwave", "confidence": 0.99, "trust": 0.98, "verified": True,
        "source": "rss_imd", "author": "@imd_newdelhi", "severity": "CRITICAL",
        "source_url": "https://mausam.imd.gov.in/imd_latest/contents/heatwave_red_alert_delhi.xml",
        "media": [
            "https://images.unsplash.com/photo-1504370805625-d32c54b16100?auto=format&fit=crop&w=1200&q=80"
        ]
    },
    {
        "city": "Delhi", "state": "Delhi", "lat": 28.5562, "lon": 77.1000,
        "raw_text": "Dense winter fog envelops IGI Airport. Runway Visual Range (RVR) drops to 50 meters, causing CAT-III ILS diversion of 18 domestic and international flights. #FogDisruption #IMD",
        "hashtags": ["FogDisruption", "IMD"],
        "category": "fog", "confidence": 0.96, "trust": 0.94, "verified": True,
        "source": "news_ndma", "author": "@aviation_news_in", "severity": "ADVISORY",
        "source_url": "https://ndma.gov.in/Alerts/igi_airport_fog_advisory",
        "media": [
            "https://images.unsplash.com/photo-1485236715568-ddc5ee6ca227?auto=format&fit=crop&w=1200&q=80"
        ]
    },
    {
        "city": "Noida", "state": "Uttar Pradesh", "lat": 28.5355, "lon": 77.3910,
        "raw_text": "Blistering afternoon loo winds in Sector 62. Temperatures cross 46 degrees Celsius, streets deserted as advisory warns against heat exhaustion. #Heatwave",
        "hashtags": ["Heatwave"],
        "category": "heatwave", "confidence": 0.92, "trust": 0.82, "verified": True,
        "source": "citizen_report", "author": "citizen:amit_sharma", "severity": "SEVERE",
        "source_url": "https://reddit.com/r/delhi/comments/1h_noida_extreme_heat_warning",
        "media": [
            "https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?auto=format&fit=crop&w=1200&q=80"
        ]
    },

    # Chennai & Coastal Tamil Nadu (Cyclone Michaung / Heavy Rain)
    {
        "city": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lon": 80.2707,
        "raw_text": "Cyclone Michaung aftermath: Adyar and Cooum rivers surge above danger thresholds. Velachery, Mudichur and Tambaram residential pockets inundated. NDRF boats deployed. #ChennaiFloods #IMD",
        "hashtags": ["ChennaiFloods", "IMD"],
        "category": "flood", "confidence": 0.98, "trust": 0.97, "verified": True,
        "source": "rss_imd", "author": "@imd_chennai", "severity": "CRITICAL",
        "source_url": "https://mausam.imd.gov.in/imd_latest/contents/cyclone_michaung_bulletin.pdf",
        "media": [
            "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1200&q=80",
            "https://assets.mixkit.co/videos/preview/mixkit-palm-trees-in-a-violent-tropical-storm-41484-large.mp4"
        ]
    },
    {
        "city": "Chennai", "state": "Tamil Nadu", "lat": 12.9229, "lon": 80.1275,
        "raw_text": "Gale force squall up to 75 kmph accompanied by persistent torrential rain along East Coast Road. Fallen trees block traffic. #CycloneAlert",
        "hashtags": ["CycloneAlert"],
        "category": "strong_wind", "confidence": 0.93, "trust": 0.85, "verified": True,
        "source": "reddit", "author": "u/chennaite_88", "severity": "SEVERE",
        "source_url": "https://reddit.com/r/chennai/comments/1c_ecr_cyclone_damage_photos",
        "media": [
            "https://images.unsplash.com/photo-1527482797697-8795b05a13fe?auto=format&fit=crop&w=1200&q=80"
        ]
    },

    # Bengaluru Waterlogging & Thunderstorm
    {
        "city": "Bengaluru", "state": "Karnataka", "lat": 12.9716, "lon": 77.5946,
        "raw_text": "Severe cloudburst-like rain over Bellandur and Outer Ring Road tech corridor. Knee-level flooding at Ecospace underpass. Tractors deployed to ferry techies. #BengaluruRains #IMD",
        "hashtags": ["BengaluruRains", "IMD"],
        "category": "flood", "confidence": 0.95, "trust": 0.92, "verified": True,
        "source": "news_ndma", "author": "@bangalore_times", "severity": "SEVERE",
        "source_url": "https://ndma.gov.in/Alerts/bengaluru_bellandur_waterlogging",
        "media": [
            "https://images.unsplash.com/photo-1519692933481-e162a57d6721?auto=format&fit=crop&w=1200&q=80"
        ]
    },
    {
        "city": "Bengaluru", "state": "Karnataka", "lat": 12.9698, "lon": 77.7499,
        "raw_text": "Intense evening thunderstorm with lightning strikes across Whitefield and Indiranagar. Power substations tripped in eastern zones. #BangaloreWeather",
        "hashtags": ["BangaloreWeather"],
        "category": "thunderstorm", "confidence": 0.91, "trust": 0.84, "verified": True,
        "source": "citizen_report", "author": "citizen:praveen_k", "severity": "MODERATE",
        "source_url": "https://reddit.com/r/bangalore/comments/1k_whitefield_thunderstorm_live",
        "media": [
            "https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?auto=format&fit=crop&w=1200&q=80",
            "https://assets.mixkit.co/videos/preview/mixkit-lightning-in-the-clouds-of-a-storm-41481-large.mp4"
        ]
    },

    # Kolkata & Odisha (Cyclone / Thunderstorm)
    {
        "city": "Bhubaneswar", "state": "Odisha", "lat": 20.2961, "lon": 85.8245,
        "raw_text": "Very severe cyclonic storm brewing over West-Central Bay of Bengal. Wind speeds anticipated to reach 130 kmph during coastal landfall near Puri. Red Alert declared. #CycloneWarning #IMD",
        "hashtags": ["CycloneWarning", "IMD"],
        "category": "strong_wind", "confidence": 0.98, "trust": 0.97, "verified": True,
        "source": "rss_imd", "author": "@imd_bhubaneswar", "severity": "CRITICAL",
        "source_url": "https://mausam.imd.gov.in/imd_latest/contents/bay_of_bengal_cyclone_warning.xml",
        "media": [
            "https://images.unsplash.com/photo-1527482797697-8795b05a13fe?auto=format&fit=crop&w=1200&q=80",
            "https://assets.mixkit.co/videos/preview/mixkit-palm-trees-in-a-violent-tropical-storm-41484-large.mp4"
        ]
    },
    {
        "city": "Kolkata", "state": "West Bengal", "lat": 22.5726, "lon": 88.3639,
        "raw_text": "Kalbaishakhi (Nor'wester) squall slams Kolkata with 80 kmph wind gusts and intense lightning. Metro rail overhead wire snapped near Central station. #Kalbaishakhi #IMD",
        "hashtags": ["Kalbaishakhi", "IMD"],
        "category": "thunderstorm", "confidence": 0.94, "trust": 0.91, "verified": True,
        "source": "news_ndma", "author": "@kolkata_pulse", "severity": "SEVERE",
        "source_url": "https://ndma.gov.in/Alerts/kolkata_norwester_advisory",
        "media": [
            "https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?auto=format&fit=crop&w=1200&q=80"
        ]
    },

    # Rajasthan Dust Storm & Desert Heat
    {
        "city": "Jodhpur", "state": "Rajasthan", "lat": 26.2389, "lon": 73.0243,
        "raw_text": "Massive sandstorm (Andhi) sweeps through western desert sectors. Blinding dust reduces visibility to under 100 meters within 10 minutes. #DustStorm #IMD",
        "hashtags": ["DustStorm", "IMD"],
        "category": "dust_storm", "confidence": 0.96, "trust": 0.89, "verified": True,
        "source": "rss_imd", "author": "@imd_jaipur", "severity": "MODERATE",
        "source_url": "https://mausam.imd.gov.in/imd_latest/contents/rajasthan_duststorm_advisory.xml",
        "media": [
            "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80"
        ]
    },
    {
        "city": "Jaipur", "state": "Rajasthan", "lat": 26.9124, "lon": 75.7873,
        "raw_text": "Maximum temperature in Churu and Phalodi touches 48.6°C. Severe heatwave alert active for next 72 hours across Marwar and Shekhawati belts. #Heatwave #IMD",
        "hashtags": ["Heatwave", "IMD"],
        "category": "heatwave", "confidence": 0.97, "trust": 0.95, "verified": True,
        "source": "rss_imd", "author": "@imd_jaipur", "severity": "CRITICAL",
        "source_url": "https://mausam.imd.gov.in/imd_latest/contents/phalodi_extreme_temperature.xml",
        "media": [
            "https://images.unsplash.com/photo-1504370805625-d32c54b16100?auto=format&fit=crop&w=1200&q=80"
        ]
    },

    # Assam & Northeast Brahmaputra Floods
    {
        "city": "Guwahati", "state": "Assam", "lat": 26.1445, "lon": 91.7362,
        "raw_text": "Brahmaputra river flows 1.4 meters above danger mark at Neamatighat. Over 45,000 residents affected across 18 revenue circles. Relief camps opened. #AssamFloods #IMD",
        "hashtags": ["AssamFloods", "IMD"],
        "category": "flood", "confidence": 0.97, "trust": 0.96, "verified": True,
        "source": "news_ndma", "author": "@assam_sdrf", "severity": "CRITICAL",
        "source_url": "https://ndma.gov.in/Alerts/assam_brahmaputra_flood_bulletin",
        "media": [
            "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1200&q=80"
        ]
    },

    # Kerala Heavy Monsoon & Landslide Alert
    {
        "city": "Kochi", "state": "Kerala", "lat": 9.9312, "lon": 76.2673,
        "raw_text": "Red alert declared for Wayanad and Idukki districts due to extremely heavy localized monsoon downpours exceeding 200mm. High landslide vulnerability advisory. #KeralaRains #IMD",
        "hashtags": ["KeralaRains", "IMD"],
        "category": "rainfall", "confidence": 0.97, "trust": 0.96, "verified": True,
        "source": "rss_imd", "author": "@imd_thiruvananthapuram", "severity": "CRITICAL",
        "source_url": "https://mausam.imd.gov.in/imd_latest/contents/kerala_landslide_warning.xml",
        "media": [
            "https://images.unsplash.com/photo-1519692933481-e162a57d6721?auto=format&fit=crop&w=1200&q=80",
            "https://assets.mixkit.co/videos/preview/mixkit-heavy-rain-falling-on-the-water-of-a-lake-1601-large.mp4"
        ]
    },

    # Unverified / Rumor Example (to show Fake Detection in action on the dashboard)
    {
        "city": "Mumbai", "state": "Maharashtra", "lat": 19.0760, "lon": 72.8777,
        "raw_text": "UNVERIFIED RUMOR: Massive tsunami wave approaching Marine Drive right now run for your lives don't trust the authorities secret coverup happening!!!!!! #FakeRumor",
        "hashtags": ["FakeRumor"],
        "category": "flood", "confidence": 0.65, "trust": 0.18, "verified": False,
        "source": "synthetic", "author": "@panic_rumor99", "severity": "CRITICAL",
        "source_url": "https://twitter.com/panic_rumor99/status/unverified_claim_4920",
        "media": [
            "https://images.unsplash.com/photo-1519692933481-e162a57d6721?auto=format&fit=crop&w=1200&q=80"
        ]
    }
]

def seed_database():
    """Populates historical meteorological records and active disaster alerts."""
    print("[*] Initializing Database Tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Pre-seed sources
        sources_map = {}
        for s_name, weight in [
            ("rss_imd", 0.95),
            ("news_ndma", 0.90),
            ("citizen_report", 0.70),
            ("reddit", 0.60),
            ("synthetic", 0.50)
        ]:
            src = db.query(Source).filter(Source.name == s_name).first()
            if not src:
                src = Source(name=s_name, trust_weight=weight)
                db.add(src)
                db.flush()
            sources_map[s_name] = src.id

        # Insert historical events (Clear existing to update schema with source_url and media)
        db.query(Event).delete()
        now = datetime.now(timezone.utc)
        print(f"[*] Seeding {len(HISTORICAL_DATASET)} Benchmark Weather & Disaster Records with Photos, Videos & Source URLs...")

        for idx, item in enumerate(HISTORICAL_DATASET):
            time_offset = timedelta(minutes=idx * 20)
            event_time = now - time_offset

            ev = Event(
                id=str(uuid.uuid4()),
                source_id=sources_map.get(item["source"], 1),
                raw_text=item["raw_text"],
                hashtags=item["hashtags"],
                posted_at=event_time,
                ingested_at=event_time,
                city=item["city"],
                state=item["state"],
                latitude=item["lat"],
                longitude=item["lon"],
                category=item["category"],
                category_confidence=item["confidence"],
                trust_score=item["trust"],
                is_verified=item["verified"],
                media_urls=item["media"],
                source_url=item.get("source_url"),
                author_handle=item["author"],
                severity=item["severity"]
            )
            db.add(ev)

        # Pre-seed Active Alerts for Disaster Management Demonstration
        print("[*] Seeding Active Disaster Alerts...")
        db.query(Alert).delete()
        alert1 = Alert(
            id=str(uuid.uuid4()),
            title="CRITICAL FLOOD ADVISORY: ADYAR & COOUM RIVER OVERFLOW (TAMIL NADU)",
            category="flood",
            region="Chennai",
            event_count=8,
            severity="CRITICAL",
            created_at=now - timedelta(hours=2),
            is_active=True
        )
        alert2 = Alert(
            id=str(uuid.uuid4()),
            title="EXTREME HEATWAVE RED ALERT: RAJASTHAN & DELHI NCR REGIONAL ZONE",
            category="heatwave",
            region="Delhi",
            event_count=6,
            severity="SEVERE",
            created_at=now - timedelta(hours=4),
            is_active=True
        )
        alert3 = Alert(
            id=str(uuid.uuid4()),
            title="CYCLONIC STORM WATCH: BAY OF BENGAL COASTAL SECTOR",
            category="strong_wind",
            region="Bhubaneswar",
            event_count=5,
            severity="CRITICAL",
            created_at=now - timedelta(hours=1),
            is_active=True
        )
        db.add_all([alert1, alert2, alert3])

        db.commit()
        print("[+] Database successfully seeded with rich historical data, photos, videos, and source links!")
    except Exception as e:
        db.rollback()
        print(f"[-] Seeding failed: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
