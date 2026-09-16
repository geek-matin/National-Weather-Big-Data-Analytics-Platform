import React, { useState, useEffect, useRef } from 'react';
import TacticalHeader from './components/TacticalHeader';
import EmergencyAlertBanner from './components/EmergencyAlertBanner';
import TacticalMap from './components/TacticalMap';
import LiveFeedPanel from './components/LiveFeedPanel';
import MediaGalleryView from './components/MediaGalleryView';
import MediaLightboxModal from './components/MediaLightboxModal';
import StatsPanel from './components/StatsPanel';
import CitizenReportModal from './components/CitizenReportModal';
import AdminModerationPanel from './components/AdminModerationPanel';

// Determine API Host (Localhost port 8000 by default)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE = API_BASE.replace(/^http/, 'ws');

export default function App() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [stats, setStats] = useState(null);
  const [categoryStats, setCategoryStats] = useState([]);
  const [regionStats, setRegionStats] = useState([]);
  const [timelineStats, setTimelineStats] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  // View Mode: 'map' | 'media' | 'nomap'
  const [viewMode, setViewMode] = useState('map');

  // Media Lightbox
  const [activeMediaItem, setActiveMediaItem] = useState(null);

  // Auto-sync status
  const [syncStatus, setSyncStatus] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isModerationModalOpen, setIsModerationModalOpen] = useState(false);
  const [selectedEventForReview, setSelectedEventForReview] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const wsRef = useRef(null);

  // Initial Data Fetch
  const fetchAllData = async () => {
    try {
      // 1. Fetch Events
      const eventsRes = await fetch(`${API_BASE}/events?limit=80`);
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData);
        if (eventsData.length > 0 && !selectedEvent) {
          setSelectedEvent(eventsData[0]);
        }
      }

      // 2. Fetch Summary Stats
      const statsRes = await fetch(`${API_BASE}/stats/summary`);
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      // 3. Fetch Category Stats
      const catRes = await fetch(`${API_BASE}/stats/by-category`);
      if (catRes.ok) {
        setCategoryStats(await catRes.json());
      }

      // 4. Fetch Regional Stats
      const regRes = await fetch(`${API_BASE}/stats/by-region`);
      if (regRes.ok) {
        setRegionStats(await regRes.json());
      }

      // 5. Fetch Timeline Stats
      const timeRes = await fetch(`${API_BASE}/stats/timeline`);
      if (timeRes.ok) {
        setTimelineStats(await timeRes.json());
      }

      // 6. Fetch Active Alerts
      const alertsRes = await fetch(`${API_BASE}/alerts`);
      if (alertsRes.ok) {
        setAlerts(await alertsRes.json());
      }

      // 7. Fetch Scheduler Status
      const syncRes = await fetch(`${API_BASE}/ingestion/status`);
      if (syncRes.ok) {
        setSyncStatus(await syncRes.json());
      }
    } catch (err) {
      console.warn("Telemetry API sync:", err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // WebSocket Live Stream Connection
  useEffect(() => {
    let ws = null;
    let reconnectTimer = null;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket(`${WS_BASE}/events/stream`);

        ws.onopen = () => {
          setIsConnected(true);
          console.log("[IMD] WebSocket connected to real-time event stream.");
        };

        ws.onmessage = (event) => {
          try {
            const incomingEvent = JSON.parse(event.data);
            setEvents(prev => {
              const exists = prev.some(e => e.id === incomingEvent.id);
              if (exists) return prev;
              return [incomingEvent, ...prev];
            });
            setStats(prev => prev ? { ...prev, total_events: prev.total_events + 1 } : prev);
          } catch (e) {
            console.error("Failed to parse incoming WebSocket message:", e);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          reconnectTimer = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = () => {
          setIsConnected(false);
        };

        wsRef.current = ws;
      } catch (err) {
        setIsConnected(false);
        reconnectTimer = setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  // Trigger Manual Ingestion Sync Cycle (Immediate Multi-Source Pull)
  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(`${API_BASE}/ingestion/sync`, { method: 'POST' });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (e) {
      console.error("Manual sync failed:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Trigger Synthetic Ingestion Event (for Demo/Judging)
  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch(`${API_BASE}/simulate`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.event) {
          setEvents(prev => [data.event, ...prev]);
          setSelectedEvent(data.event);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulating(false);
    }
  };

  // Submit Citizen Field Report
  const handleSubmitCitizenReport = async (reportData) => {
    const res = await fetch(`${API_BASE}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Citizen report submission failed');
    }
    await fetchAllData();
  };

  // Moderate Event Override
  const handleModerateEvent = async (eventId, isVerified) => {
    const res = await fetch(`${API_BASE}/admin/moderate/${eventId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_verified: isVerified })
    });
    if (res.ok) {
      const updated = await res.json();
      setEvents(prev => prev.map(e => e.id === eventId ? updated : e));
      if (selectedEvent?.id === eventId) {
        setSelectedEvent(updated);
      }
    }
  };

  // Dismiss Active Alert
  const handleDismissAlert = async (alertId) => {
    try {
      await fetch(`${API_BASE}/alerts/${alertId}/dismiss`, { method: 'POST' });
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenModerationWithEvent = (ev) => {
    setSelectedEventForReview(ev);
    setIsModerationModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#07080c] text-zinc-100 flex flex-col selection:bg-cyan-500 selection:text-black font-mono">
      {/* 1. Tactical Header with Viewport Selector & Auto-Sync Status */}
      <TacticalHeader
        onOpenReport={() => setIsReportModalOpen(true)}
        onOpenModeration={() => {
          setSelectedEventForReview(selectedEvent);
          setIsModerationModalOpen(true);
        }}
        onSimulate={handleSimulate}
        isSimulating={isSimulating}
        onSyncNow={handleSyncNow}
        isSyncing={isSyncing}
        syncStatus={syncStatus}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        stats={stats}
        isConnected={isConnected}
      />

      {/* 2. Emergency Active Alert Ribbon (if clusters exist) */}
      <EmergencyAlertBanner
        alerts={alerts}
        onDismiss={handleDismissAlert}
      />

      {/* 3. Main Command Center Layout */}
      <main className="flex-1 p-3 space-y-3 max-w-[1720px] mx-auto w-full">
        {/* Dynamic Viewport depending on viewMode (Map vs Media vs No-Map) */}
        {viewMode === 'map' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[520px]">
            {/* Tactical Geospatial Map (7 cols) */}
            <div className="lg:col-span-7 h-[500px] lg:h-auto">
              <TacticalMap
                events={events}
                selectedEvent={selectedEvent}
                onSelectEvent={setSelectedEvent}
              />
            </div>

            {/* Live Ingestion Feed (5 cols) */}
            <div className="lg:col-span-5 h-[500px] lg:h-auto">
              <LiveFeedPanel
                events={events}
                selectedEvent={selectedEvent}
                onSelectEvent={setSelectedEvent}
                onOpenModerationWithEvent={handleOpenModerationWithEvent}
                onOpenMedia={setActiveMediaItem}
              />
            </div>
          </div>
        )}

        {viewMode === 'media' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[520px]">
            {/* Visual Media & Satellite Intel Wall (7 cols) */}
            <div className="lg:col-span-7 h-[520px] lg:h-auto">
              <MediaGalleryView
                events={events}
                onOpenMedia={setActiveMediaItem}
              />
            </div>

            {/* Live Ingestion Feed (5 cols) */}
            <div className="lg:col-span-5 h-[520px] lg:h-auto">
              <LiveFeedPanel
                events={events}
                selectedEvent={selectedEvent}
                onSelectEvent={setSelectedEvent}
                onOpenModerationWithEvent={handleOpenModerationWithEvent}
                onOpenMedia={setActiveMediaItem}
              />
            </div>
          </div>
        )}

        {viewMode === 'nomap' && (
          <div className="w-full min-h-[520px]">
            {/* Full-width Expanded Live Feed (No Map at all) */}
            <div className="h-[640px]">
              <LiveFeedPanel
                events={events}
                selectedEvent={selectedEvent}
                onSelectEvent={setSelectedEvent}
                onOpenModerationWithEvent={handleOpenModerationWithEvent}
                onOpenMedia={setActiveMediaItem}
              />
            </div>
          </div>
        )}

        {/* Bottom Section: Big Data Telemetry & Analytics HUD */}
        <div className="w-full">
          <StatsPanel
            categoryStats={categoryStats}
            timelineStats={timelineStats}
            regionStats={regionStats}
          />
        </div>
      </main>

      {/* Modals */}
      <CitizenReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmitReport={handleSubmitCitizenReport}
      />

      <AdminModerationPanel
        isOpen={isModerationModalOpen}
        onClose={() => setIsModerationModalOpen(false)}
        events={events}
        selectedEventForReview={selectedEventForReview}
        onModerateEvent={handleModerateEvent}
      />

      {/* Fullscreen Tactical Media Lightbox */}
      <MediaLightboxModal
        mediaItem={activeMediaItem}
        onClose={() => setActiveMediaItem(null)}
      />
    </div>
  );
}
