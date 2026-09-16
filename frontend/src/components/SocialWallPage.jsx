import React, { useState, useEffect, useRef } from 'react';
import {
  Radio, Film, Map, RefreshCw, Zap, ShieldAlert,
  Activity, Layers, Eye, CheckCircle, Wifi, WifiOff
} from 'lucide-react';

import LiveFeedPanel from './social/LiveFeedPanel';
import MediaGalleryView from './social/MediaGalleryView';
import StatsPanel from './social/StatsPanel';
import EmergencyAlertBanner from './social/EmergencyAlertBanner';
import AdminModerationPanel from './social/AdminModerationPanel';
import MediaLightboxModal from './social/MediaLightboxModal';
import TacticalSocialMap from './social/TacticalSocialMap';

export default function SocialWallPage({ onOpenReportModal }) {
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
  const [isSimulating, setIsSimulating] = useState(false);

  // Moderation state
  const [isModerationModalOpen, setIsModerationModalOpen] = useState(false);
  const [selectedEventForReview, setSelectedEventForReview] = useState(null);

  const wsRef = useRef(null);

  // Initial Data Fetch
  const fetchAllData = async () => {
    try {
      // 1. Fetch Events
      const eventsRes = await fetch('/events?limit=80');
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData);
        if (eventsData.length > 0 && !selectedEvent) {
          setSelectedEvent(eventsData[0]);
        }
      }

      // 2. Fetch Summary Stats
      const statsRes = await fetch('/stats/summary');
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      // 3. Fetch Category Stats
      const catRes = await fetch('/stats/by-category');
      if (catRes.ok) {
        setCategoryStats(await catRes.json());
      }

      // 4. Fetch Regional Stats
      const regRes = await fetch('/stats/by-region');
      if (regRes.ok) {
        setRegionStats(await regRes.json());
      }

      // 5. Fetch Timeline Stats
      const timeRes = await fetch('/stats/timeline');
      if (timeRes.ok) {
        setTimelineStats(await timeRes.json());
      }

      // 6. Fetch Active Alerts
      const alertsRes = await fetch('/alerts');
      if (alertsRes.ok) {
        setAlerts(await alertsRes.json());
      }

      // 7. Fetch Scheduler Status
      const syncRes = await fetch('/ingestion/status');
      if (syncRes.ok) {
        setSyncStatus(await syncRes.json());
      }
    } catch (err) {
      console.warn("Social Wall API sync:", err);
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
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/events/stream`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsConnected(true);
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
          reconnectTimer = setTimeout(connectWebSocket, 4000);
        };

        ws.onerror = () => {
          setIsConnected(false);
        };

        wsRef.current = ws;
      } catch (err) {
        setIsConnected(false);
        reconnectTimer = setTimeout(connectWebSocket, 4000);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  // Trigger Manual Ingestion Sync Cycle
  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/ingestion/sync', { method: 'POST' });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (e) {
      console.error("Manual sync failed:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Trigger Synthetic Ingestion Event (Demo Simulation)
  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/simulate', { method: 'POST' });
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

  // Moderate Event Override
  const handleModerateEvent = async (eventId, isVerified) => {
    const res = await fetch(`/admin/moderate/${eventId}`, {
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
      await fetch(`/alerts/${alertId}/dismiss`, { method: 'POST' });
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
    <div className="w-full space-y-4 font-mono text-zinc-100">
      {/* 1. Tactical Social Wall Sub-Header Bar */}
      <div className="p-3 bg-[#0a0e17] border border-[#1c2538] flex flex-wrap items-center justify-between gap-3">
        {/* Left: View Mode Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#06080e] p-1 border border-[#1c2538] text-xs">
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1 font-bold uppercase transition-colors ${
                viewMode === 'map'
                  ? 'bg-cyan-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>MAP & FEED</span>
            </button>
            <button
              onClick={() => setViewMode('media')}
              className={`flex items-center gap-1.5 px-3 py-1 font-bold uppercase transition-colors ${
                viewMode === 'media'
                  ? 'bg-cyan-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>MEDIA INTEL WALL</span>
            </button>
            <button
              onClick={() => setViewMode('nomap')}
              className={`flex items-center gap-1.5 px-3 py-1 font-bold uppercase transition-colors ${
                viewMode === 'nomap'
                  ? 'bg-cyan-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>EXPANDED STREAM</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-zinc-400 pl-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>{events.length} TOTAL INCIDENTS</span>
          </div>
        </div>

        {/* Right: Operations & Stream Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* WebSocket Status Indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#0e131d] border border-[#1c2538] text-[10px]">
            {isConnected ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-bold">STREAM: LIVE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-amber-400" />
                <span className="text-amber-400 font-bold">STREAM: POLLING</span>
              </>
            )}
          </div>

          {/* Simulate Event Button */}
          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs border uppercase tracking-wider font-bold transition-all ${
              isSimulating
                ? 'bg-amber-950/40 border-amber-500 text-amber-300 cursor-not-allowed'
                : 'bg-[#121927] hover:bg-[#182338] border-cyan-500/50 hover:border-cyan-400 text-cyan-300'
            }`}
            title="Generate and push synthetic disaster incident into pipeline"
          >
            <Zap className={`w-3.5 h-3.5 ${isSimulating ? 'animate-bounce text-amber-400' : 'text-cyan-400'}`} />
            <span>{isSimulating ? 'SIMULATING...' : 'SIMULATE EVENT'}</span>
          </button>

          {/* Multi-source Sync Button */}
          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs border uppercase tracking-wider font-bold transition-all ${
              isSyncing
                ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300 cursor-not-allowed'
                : 'bg-[#0e1420] border-[#1c2538] hover:border-cyan-500 text-slate-300 hover:text-cyan-400'
            }`}
            title="Trigger multi-source pull (RSS, Reddit, Open Data)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{isSyncing ? 'SYNCING...' : 'SYNC FEEDS'}</span>
          </button>

          {/* Moderation Button */}
          <button
            onClick={() => {
              setSelectedEventForReview(selectedEvent || (events.length > 0 ? events[0] : null));
              setIsModerationModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-amber-950/40 border border-amber-500/60 hover:bg-amber-900/40 text-amber-300 uppercase tracking-wider font-bold transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>MODERATION</span>
          </button>
        </div>
      </div>

      {/* 2. Emergency Active Alert Ribbon */}
      <EmergencyAlertBanner
        alerts={alerts}
        onDismiss={handleDismissAlert}
      />

      {/* 3. Main Command Center Layout */}
      <div>
        {/* Mode A: Map & Feed */}
        {viewMode === 'map' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[520px]">
            <div className="lg:col-span-7 h-[500px] lg:h-auto min-h-[500px]">
              <TacticalSocialMap
                events={events}
                selectedEvent={selectedEvent}
                onSelectEvent={setSelectedEvent}
              />
            </div>
            <div className="lg:col-span-5 h-[500px] lg:h-auto min-h-[500px]">
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

        {/* Mode B: Visual Media Intel Wall & Feed */}
        {viewMode === 'media' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[520px]">
            <div className="lg:col-span-7 h-[520px] lg:h-auto min-h-[520px]">
              <MediaGalleryView
                events={events}
                onOpenMedia={setActiveMediaItem}
              />
            </div>
            <div className="lg:col-span-5 h-[520px] lg:h-auto min-h-[520px]">
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

        {/* Mode C: Full Expanded Stream */}
        {viewMode === 'nomap' && (
          <div className="w-full min-h-[520px]">
            <div className="min-h-[600px]">
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
      </div>

      {/* 4. Bottom Section: Big Data Telemetry & Analytics HUD */}
      <div className="w-full pt-2">
        <StatsPanel
          categoryStats={categoryStats}
          timelineStats={timelineStats}
          regionStats={regionStats}
        />
      </div>

      {/* 5. Modals */}
      <AdminModerationPanel
        isOpen={isModerationModalOpen}
        onClose={() => setIsModerationModalOpen(false)}
        events={events}
        selectedEventForReview={selectedEventForReview}
        onModerateEvent={handleModerateEvent}
      />

      <MediaLightboxModal
        mediaItem={activeMediaItem}
        onClose={() => setActiveMediaItem(null)}
      />
    </div>
  );
}
