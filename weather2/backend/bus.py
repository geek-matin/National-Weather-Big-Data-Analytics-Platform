import asyncio
import json
import logging
from typing import Callable, List, Dict, Any
from weather2.backend.config import settings

logger = logging.getLogger("imd.bus")

class EventBus:
    """Universal Streaming Message Bus for National Weather Analytics.
    Supports Kafka/Redpanda with automatic in-memory asynchronous broadcast fallback."""

    def __init__(self):
        self.kafka_available = False
        self.producer = None
        self.subscribers: List[asyncio.Queue] = []
        self._raw_queue: asyncio.Queue = asyncio.Queue()
        self._is_running = False

    async def initialize(self):
        # Attempt Kafka connection if aiokafka is installed and broker is responding
        try:
            from aiokafka import AIOKafkaProducer
            producer = AIOKafkaProducer(bootstrap_servers=settings.KAFKA_BROKER)
            await asyncio.wait_for(producer.start(), timeout=2.0)
            self.producer = producer
            self.kafka_available = True
            logger.info(f"Connected to Kafka broker at {settings.KAFKA_BROKER}")
        except Exception:
            self.kafka_available = False
            logger.info("Kafka broker unreachable; using in-process Async Queue streaming bus.")
        self._is_running = True

    async def publish_raw(self, event_data: Dict[str, Any]):
        """Publishes raw weather event into the streaming bus."""
        if self.kafka_available and self.producer:
            try:
                payload = json.dumps(event_data).encode("utf-8")
                await self.producer.send_and_wait(settings.KAFKA_TOPIC, payload)
                return
            except Exception as e:
                logger.warning(f"Kafka publish failed: {e}; falling back to async queue")
        
        # In-process queue
        await self._raw_queue.put(event_data)

    async def get_raw_event(self) -> Dict[str, Any]:
        """Dequeues next raw event for ML processing."""
        return await self._raw_queue.get()

    async def broadcast_enriched(self, event_dict: Dict[str, Any]):
        """Pushes an ML-processed, enriched event to all active WebSocket clients."""
        dead_queues = []
        for q in self.subscribers:
            try:
                q.put_nowait(event_dict)
            except asyncio.QueueFull:
                dead_queues.append(q)
            except Exception:
                dead_queues.append(q)
        
        for dq in dead_queues:
            if dq in self.subscribers:
                self.subscribers.remove(dq)

    def register_subscriber(self) -> asyncio.Queue:
        q = asyncio.Queue(maxsize=100)
        self.subscribers.append(q)
        return q

    def unregister_subscriber(self, q: asyncio.Queue):
        if q in self.subscribers:
            self.subscribers.remove(q)

    async def shutdown(self):
        self._is_running = False
        if self.producer:
            try:
                await self.producer.stop()
            except Exception:
                pass

bus = EventBus()
