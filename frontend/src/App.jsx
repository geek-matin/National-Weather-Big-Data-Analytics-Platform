import React, { useState, useEffect } from 'react';
import TacticalHeader from './components/TacticalHeader';
import CategoryBar from './components/CategoryBar';
import PlaceSearch from './components/PlaceSearch';
import LayoutCard from './components/LayoutCard';
import TacticalRadarMap from './components/TacticalRadarMap';
import HistoricalQuery from './components/HistoricalQuery';
import MediaGallery from './components/MediaGallery';
import MediaLightbox from './components/MediaLightbox';
import CitizenReportModal from './components/CitizenReportModal';
import SocialWallPage from './components/SocialWallPage';

export default function App() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [hazardSummary, setHazardSummary] = useState(null);
  const [activePlaceId, setActivePlaceId] = useState('in_mum_001');
  const [telemetry, setTelemetry] = useState(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(true);
  const [activeView, setActiveView] = useState('layout'); // 'layout', 'map', 'history'
  const [syncTelemetry, setSyncTelemetry] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [lightboxItem, setLightboxItem] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [categoryPlaces, setCategoryPlaces] = useState([]);
  const [reportRefreshKey, setReportRefreshKey] = useState(0);

  // Fetch hazard categories summary
  const fetchHazardSummary = async () => {
    try {
      const res = await fetch('/api/hazards/summary');
      if (res.ok) {
        const data = await res.json();
        setHazardSummary(data);
      }
    } catch (err) {
      console.error('Failed to fetch hazard summary:', err);
    }
  };

  // Fetch telemetry for active place
  const fetchTelemetry = async (placeId) => {
    setLoadingTelemetry(true);
    try {
      const res = await fetch(`/api/places/${placeId}/layout-telemetry`);
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data);
      }
    } catch (err) {
      console.error('Failed to fetch layout telemetry:', err);
    } finally {
      setLoadingTelemetry(false);
    }
  };

  // Fetch sync scheduler telemetry
  const fetchSyncStatus = async () => {
    try {
      const res = await fetch('/api/sync/status');
      if (res.ok) {
        const data = await res.json();
        setSyncTelemetry(data);
      }
    } catch (err) {
      console.error('Failed to fetch sync status:', err);
    }
  };

  // Handle category change: fetch places for category and pick top risk place
  const handleSelectCategory = async (catId) => {
    setSelectedCategory(catId);
    if (catId === 'all') {
      setCategoryPlaces([]);
      return;
    }

    try {
      const res = await fetch(`/api/hazards/${encodeURIComponent(catId)}/places`);
      if (res.ok) {
        const data = await res.json();
        const places = data.places || [];
        setCategoryPlaces(places);
        if (places.length > 0) {
          // Auto-select highest risk place in this category
          setActivePlaceId(places[0].place_id);
          setToastMessage(`ACTIVE CATEGORY FILTER: ${catId.toUpperCase()} (${places.length} LOCATIONS)`);
          setTimeout(() => setToastMessage(''), 3500);
        }
      }
    } catch (err) {
      console.error('Failed to fetch places for category:', err);
    }
  };

  useEffect(() => {
    fetchHazardSummary();
    fetchSyncStatus();
    const interval = setInterval(() => {
      fetchSyncStatus();
      fetchHazardSummary();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchTelemetry(activePlaceId);
  }, [activePlaceId]);

  // Handle manual sync trigger
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setToastMessage('FETCHING LIVE METEOROLOGICAL OBSERVATIONS ACROSS INDIA...');
    try {
      const res = await fetch('/api/sync/trigger', { method: 'POST' });
      const data = await res.json();
      setToastMessage(data.message || 'LIVE INGESTION COMPLETED');
      setTimeout(() => {
        fetchTelemetry(activePlaceId);
        fetchHazardSummary();
        fetchSyncStatus();
        setIsSyncing(false);
        setTimeout(() => setToastMessage(''), 4000);
      }, 2500);
    } catch (err) {
      console.error('Sync failed:', err);
      setIsSyncing(false);
      setToastMessage('SYNC FAILED. CHECK LOGS.');
      setTimeout(() => setToastMessage(''), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080c] text-[#e2e8f0] flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Tactical Header */}
      <TacticalHeader
        syncTelemetry={syncTelemetry}
        onTriggerSync={handleTriggerSync}
        isSyncing={isSyncing}
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        selectedCategory={selectedCategory}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-cyan-950 border-b border-cyan-500/50 text-cyan-300 text-xs py-1.5 px-4 text-center font-mono font-bold tracking-wider animate-pulse sticky top-[57px] z-30">
          [SYSTEM NOTIFICATION] {toastMessage}
        </div>
      )}

      {/* Main Command Console Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {/* Category-First Hero Navigation Bar (For Telemetry/Map/History views) */}
        {activeView !== 'social_wall' && (
          <>
            <CategoryBar
              selectedCategory={selectedCategory}
              onSelectCategory={handleSelectCategory}
              hazardSummary={hazardSummary}
            />

            <PlaceSearch
              currentPlaceId={activePlaceId}
              onSelectPlace={(pid) => setActivePlaceId(pid)}
              selectedCategory={selectedCategory}
              onSelectCategory={handleSelectCategory}
            />

            {/* If category is filtered, show quick location switcher pills */}
            {selectedCategory !== 'all' && categoryPlaces.length > 0 && (
              <div className="w-full max-w-4xl mx-auto mb-5 p-2 bg-[#0a0e17] border border-[#1e293b] flex items-center flex-wrap gap-2 text-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase font-mono mr-1">
                  LOCATIONS UNDER {selectedCategory.toUpperCase()} ({categoryPlaces.length}):
                </span>
                {categoryPlaces.map((cp) => (
                  <button
                    key={cp.place_id}
                    onClick={() => setActivePlaceId(cp.place_id)}
                    className={`px-2 py-1 text-xs border font-mono transition-colors ${
                      activePlaceId === cp.place_id
                        ? 'bg-cyan-500 text-black font-bold border-cyan-400'
                        : 'bg-[#0e1420] border-[#1c2538] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {cp.name} <span className="text-[10px] text-slate-400">({cp.risk_score}/100)</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* View Switcher Routing */}
        {activeView === 'social_wall' && (
          <div className="flex-1 w-full">
            <SocialWallPage
              onOpenReportModal={() => setIsReportModalOpen(true)}
            />
          </div>
        )}

        {activeView === 'layout' && (
          <div className="flex-1 flex flex-col items-center justify-center">
            {loadingTelemetry ? (
              <div className="py-24 text-center text-xs text-slate-500 font-mono animate-pulse">
                POLLING REAL-TIME OPEN-METEO, CWC GAUGE & IMD METEOROLOGICAL TELEMETRY...
              </div>
            ) : (
              <LayoutCard
                telemetry={telemetry}
                onOpenMap={() => setActiveView('map')}
              />
            )}
          </div>
        )}

        {activeView === 'map' && (
          <div className="flex-1">
            <TacticalRadarMap
              activePlace={telemetry?.header}
              onSelectPlace={(pid) => {
                setActivePlaceId(pid);
                setActiveView('layout');
              }}
            />
          </div>
        )}

        {activeView === 'history' && (
          <div className="flex-1 space-y-8">
            <HistoricalQuery
              currentPlaceId={activePlaceId}
              onSelectPlace={(pid) => {
                setActivePlaceId(pid);
              }}
            />
            <MediaGallery
              onOpenLightbox={(item) => setLightboxItem(item)}
              refreshTrigger={reportRefreshKey}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <CitizenReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        activePlace={telemetry?.header}
        onReportSubmitted={() => {
          fetchTelemetry(activePlaceId);
          fetchHazardSummary();
          setReportRefreshKey((prev) => prev + 1);
          setToastMessage('CITIZEN REPORT PROCESSED & VERIFIED BY ML ENGINE');
          setTimeout(() => setToastMessage(''), 4000);
        }}
      />

      <MediaLightbox
        item={lightboxItem}
        onClose={() => setLightboxItem(null)}
      />

      {/* Tactical Status Footer */}
      <footer className="border-t border-[#1c2538] bg-[#090d16] py-3 px-4 text-[11px] text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
            <span>LIVE DATA: OPEN-METEO WMO API // IMD AWS NETWORK // CWC RIVER GAUGES // NASA GPM</span>
          </div>
          <div>
            <span>SYSTEM: NATIONAL WEATHER BIG DATA ANALYTICS PLATFORM // SIH-26069</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
