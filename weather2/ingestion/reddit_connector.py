import os
import time
import logging
from typing import List, Dict, Any
from weather2.backend.config import settings

logger = logging.getLogger("imd.reddit_connector")

# Target Indian Subreddits
TARGET_SUBREDDITS = ["india", "mumbai", "delhi", "bangalore", "chennai", "kolkata", "hyderabad", "pune"]
WEATHER_KEYWORDS = ["rain", "rainfall", "flood", "waterlogging", "heatwave", "thunderstorm", "monsoon", "imd", "weather", "cyclone"]

# Realistic Reddit mock samples for graceful fallback when credentials are not supplied
REDDIT_MOCK_SAMPLES = [
    {
        "title": "Severe waterlogging near Hindmata, Dadar. BEST buses being diverted. Stay safe everyone! #IMD",
        "author": "u/mumbaikar_99",
        "subreddit": "mumbai",
        "url": "https://reddit.com/r/mumbai/comments/sample1"
    },
    {
        "title": "Delhi heatwave hits 45.8 degrees today in Najafgarh. Unbearable afternoon loo winds. #IMD",
        "author": "u/delhi_capital",
        "subreddit": "delhi",
        "url": "https://reddit.com/r/delhi/comments/sample2"
    },
    {
        "title": "Sudden hailstorm in Whitefield, Bengaluru! Wind speed is crazy, trees fallen near ITPL.",
        "author": "u/techie_blore",
        "subreddit": "bangalore",
        "url": "https://reddit.com/r/bangalore/comments/sample3"
    },
    {
        "title": "Continuous heavy downpour in Chennai since last night. Velachery lake overflowing alert.",
        "author": "u/chennai_express",
        "subreddit": "chennai",
        "url": "https://reddit.com/r/chennai/comments/sample4"
    }
]

class RedditConnector:
    def __init__(self):
        self.praw_client = None
        if settings.REDDIT_CLIENT_ID and settings.REDDIT_CLIENT_SECRET:
            try:
                import praw
                self.praw_client = praw.Reddit(
                    client_id=settings.REDDIT_CLIENT_ID,
                    client_secret=settings.REDDIT_CLIENT_SECRET,
                    user_agent=settings.REDDIT_USER_AGENT
                )
                logger.info("Reddit PRAW connector initialized successfully.")
            except Exception as e:
                logger.warning(f"Failed to initialize PRAW: {e}; falling back to mock mode.")
        else:
            logger.info("Reddit credentials not configured; using offline simulated connector.")

    def fetch_weather_posts(self, limit_per_sub: int = 5) -> List[Dict[str, Any]]:
        """Fetches recent posts matching weather keywords across Indian subreddits."""
        events = []

        if self.praw_client:
            try:
                for sub_name in TARGET_SUBREDDITS:
                    sub = self.praw_client.subreddit(sub_name)
                    for post in sub.new(limit=limit_per_sub):
                        text = f"{post.title} {post.selftext}"
                        if any(kw in text.lower() for kw in WEATHER_KEYWORDS):
                            events.append({
                                "source_name": "reddit",
                                "raw_text": f"[{sub_name.upper()}] {post.title} {post.selftext[:180]}",
                                "author_handle": f"u/{post.author.name if post.author else 'deleted'}",
                                "source_url": post.url or f"https://reddit.com/r/{sub_name}",
                                "media_urls": [post.url] if post.url.endswith(('.jpg', '.png', '.mp4')) else ["https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800"],
                                "city": sub_name.title() if sub_name in ["mumbai", "delhi", "chennai", "kolkata", "pune"] else None
                            })
                return events
            except Exception as e:
                logger.error(f"Reddit API fetch error: {e}")

        # Fallback simulated Reddit items
        for sample in REDDIT_MOCK_SAMPLES:
            events.append({
                "source_name": "reddit",
                "raw_text": f"[{sample['subreddit'].upper()}] {sample['title']}",
                "author_handle": sample["author"],
                "source_url": sample["url"],
                "media_urls": ["https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800"],
                "city": sample["subreddit"].title()
            })
        return events

reddit_connector = RedditConnector()
