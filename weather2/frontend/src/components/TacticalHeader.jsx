import React, { useState, useEffect } from 'react';
import {
  Shield, Radio, Activity, PlusCircle, Zap, Sliders,
  RefreshCw, Map, Film, FileText, CheckCircle2
} from 'lucide-react';

export default function TacticalHeader({
  onOpenReport,
  onOpenModeration,
  onSimulate,
  isSimulating,
  onSyncNow,
  isSyncing,
  syncStatus,
  viewMode,
  onChangeViewMode,
  stats,
  isConnected
}) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatIST = (date) => {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const formatUTC = (date) => {
    return date.toISOString().slice(11, 19) + 'Z';
  };

  return (
    <header className="border-b border-[#1c2538] bg-[#090c13] px-4 py-2.5 select-none font-mono">
      {/* Top Row: System Identity & Live Clocks */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-2 border-b border-[#141b29]">
        {/* Left: Branding & Node Info */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400 font-bold text-lg shadow-tactical-glow-cyan">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-widest text-zinc-100 uppercase">
                IMD DISASTER INTELLIGENCE PLATFORM
              </span>
              <span className="px-1.5 py-0.2 text-[10px] tracking-wider bg-red-950/80 border border-red-500/60 text-red-400 font-semibold">
                CRISIS NODE 26069
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 tracking-wider flex items-center gap-3">
              <span>MINISTRY OF EARTH SCIENCES (MoES)</span>
              <span className="text-zinc-600">//</span>
              <span className="text-cyan-400 font-mono">STATION ID: IN-DEL-01</span>
            </div>
          </div>
        </div>

        {/* Center: Live Telemetry Status & Scheduler Beacon */}
        <div className="flex items-center gap-4 text-[11px] flex-wrap">
          {/* Stream Beacon */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#0f141f] border border-[#1c2538]">
            <span className={`w-2 h-2 rounded-none ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-zinc-400">STREAM:</span>
            <span className={isConnected ? "text-emerald-400 font-bold" : "text-red-400"}>
              {isConnected ? "LIVE WS" : "OFFLINE"}
            </span>
          </div>

          {/* Automated Daily Sync Indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#0f141f] border border-[#1c2538]">
            <span className="w-2 h-2 bg-cyan-400 animate-pulse" />
            <span className="text-zinc-400">AUTO-SYNC:</span>
            <span className="text-cyan-300 font-bold">
              {syncStatus?.scheduler_active ? `EVERY ${syncStatus.sync_interval_hours || 6}H (ACTIVE)` : 'ACTIVE'}
            </span>
          </div>

          {/* Clocks */}
          <div className="hidden sm:flex items-center gap-2 px-2 py-1 bg-[#0f141f] border border-[#1c2538]">
            <span className="text-zinc-400">IST:</span>
            <span className="text-zinc-100 font-bold">{formatIST(currentTime)}</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400">UTC:</span>
            <span className="text-zinc-300">{formatUTC(currentTime)}</span>
          </div>
        </div>

        {/* Right: Operational Trigger Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Manual Sync Now Button */}
          <button
            onClick={onSyncNow}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-cyan-300 transition-all active:scale-95 disabled:opacity-50"
            title="Poll RSS, Reddit and multi-sources immediately"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? "SYNCING..." : "SYNC ALL SOURCES"}</span>
          </button>

          {/* Simulate Event Button */}
          <button
            onClick={onSimulate}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/70 text-cyan-300 transition-all hover:shadow-tactical-glow-cyan active:scale-95 disabled:opacity-50"
            title="Inject simulated live weather incident"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>{isSimulating ? "INJECTING..." : "SIMULATE INGESTION"}</span>
          </button>

          {/* Citizen Report Button */}
          <button
            onClick={onOpenReport}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/70 text-emerald-300 transition-all hover:shadow-tactical-glow-green active:scale-95"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>CITIZEN REPORT</span>
          </button>

          {/* Moderation Button */}
          <button
            onClick={onOpenModeration}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 transition-all active:scale-95"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>MODERATION</span>
          </button>
        </div>
      </div>

      {/* Bottom Row: Display Mode Selector (Map vs Media Gallery vs Full Feed) */}
      <div className="pt-2 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1 bg-[#06080d] p-1 border border-[#1a2232]">
          <span className="text-[10px] text-zinc-500 px-2 uppercase font-bold tracking-wider">
            PRIMARY VIEWPORT:
          </span>
          <button
            onClick={() => onChangeViewMode('map')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs uppercase tracking-wider font-bold transition-all ${
              viewMode === 'map'
                ? 'bg-cyan-950 border border-cyan-500 text-cyan-300 shadow-tactical-glow-cyan'
                : 'bg-transparent text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>RADAR MAP + FEED</span>
          </button>

          <button
            onClick={() => onChangeViewMode('media')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs uppercase tracking-wider font-bold transition-all ${
              viewMode === 'media'
                ? 'bg-purple-950 border border-purple-500 text-purple-300 shadow-lg'
                : 'bg-transparent text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>SATELLITE & MEDIA INTEL (PHOTOS/VIDEOS)</span>
          </button>

          <button
            onClick={() => onChangeViewMode('nomap')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs uppercase tracking-wider font-bold transition-all ${
              viewMode === 'nomap'
                ? 'bg-emerald-950 border border-emerald-500 text-emerald-300 shadow-tactical-glow-green'
                : 'bg-transparent text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>EXPANDED LOGS & MEDIA [NO MAP]</span>
          </button>
        </div>

        <div className="text-[11px] text-zinc-500 hidden md:flex items-center gap-2">
          <span>MONITORED REGIONS: <strong className="text-zinc-300">{stats?.cities_monitored || 18} CITIES</strong></span>
          <span className="text-zinc-700">|</span>
          <span>HIGH THREAT: <strong className="text-red-400">{stats?.high_threat_events || 0}</strong></span>
        </div>
      </div>
    </header>
  );
}
