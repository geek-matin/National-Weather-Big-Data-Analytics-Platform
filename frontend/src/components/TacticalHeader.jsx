import React from 'react';
import { RefreshCw, Radio, Database, ShieldAlert, Clock, Layers } from 'lucide-react';

export default function TacticalHeader({
  syncTelemetry,
  onTriggerSync,
  isSyncing,
  activeView,
  setActiveView,
  onOpenReportModal,
  selectedCategory
}) {
  const formatCountdown = (seconds) => {
    if (!seconds && seconds !== 0) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <header className="border-b border-[#1c2538] bg-[#090d16] sticky top-0 z-40 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand & Live Ingestion Status */}
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-cyan-400 rounded-none shadow-[0_0_8px_#06b6d4]"></div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-widest text-slate-100 uppercase">
                IMD // NATIONAL WEATHER & DISASTER TELEMETRY COMMAND
              </h1>
              <span className="text-[10px] bg-red-950/60 text-red-400 border border-red-500/50 px-1.5 py-0.2 font-mono font-bold animate-pulse">
                LIVE TELEMETRY
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <span>PAN-INDIA NETWORK: 56 STATIONS</span>
              <span>•</span>
              <span className="text-cyan-400 font-mono">WMO LIVE API SYNC: ACTIVE</span>
              <span>•</span>
              <span className="text-slate-500 uppercase">{selectedCategory.toUpperCase()} MODE</span>
            </div>
          </div>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-1.5 bg-[#06080e] p-1 border border-[#1c2538] text-xs flex-wrap">
          <button
            onClick={() => setActiveView('layout')}
            className={`px-3 py-1 font-bold uppercase transition-colors ${
              activeView === 'layout'
                ? 'bg-cyan-500 text-black shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            [ ⚡ HAZARD TELEMETRY ]
          </button>
          <button
            onClick={() => setActiveView('map')}
            className={`px-3 py-1 font-bold uppercase transition-colors ${
              activeView === 'map'
                ? 'bg-cyan-500 text-black shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            [ 🗺️ SURVEILLANCE MAP ]
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`px-3 py-1 font-bold uppercase transition-colors ${
              activeView === 'history'
                ? 'bg-cyan-500 text-black shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            [ 📜 HISTORICAL ARCHIVE ]
          </button>
          <button
            onClick={() => setActiveView('social_wall')}
            className={`flex items-center gap-1 px-3 py-1 font-bold uppercase transition-colors ${
              activeView === 'social_wall'
                ? 'bg-cyan-500 text-black shadow-sm'
                : 'text-cyan-400 hover:text-cyan-200 hover:bg-cyan-950/40 border border-cyan-500/40'
            }`}
          >
            <Radio className="w-3 h-3 animate-pulse text-red-400" />
            <span>[ 📡 SOCIAL WALL ]</span>
          </button>
        </div>

        {/* Automated Sync Controller & Citizen Submission */}
        <div className="flex items-center gap-2.5">
          <div className="text-[11px] text-slate-400 hidden lg:flex flex-col items-end">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>NEXT LIVE SYNC:</span>
              <span className="font-mono font-bold text-cyan-300">
                {formatCountdown(syncTelemetry?.next_sync_countdown_seconds)}
              </span>
            </div>
            <span className="text-[10px] text-slate-500">
              {syncTelemetry?.last_synced_human || 'Updated just now'}
            </span>
          </div>

          <button
            onClick={onTriggerSync}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 border text-xs font-bold transition-colors ${
              isSyncing
                ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300 cursor-not-allowed'
                : 'bg-[#0e1420] border-[#1c2538] text-slate-300 hover:border-cyan-500 hover:text-cyan-400'
            }`}
            title="Trigger immediate live multi-source synchronization"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{isSyncing ? 'FETCHING LIVE...' : 'SYNC SOURCES'}</span>
          </button>

          <button
            onClick={onOpenReportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 border border-red-500/50 hover:bg-red-900/50 text-red-300 text-xs font-bold transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            <span>SUBMIT REPORT</span>
          </button>
        </div>
      </div>
    </header>
  );
}
