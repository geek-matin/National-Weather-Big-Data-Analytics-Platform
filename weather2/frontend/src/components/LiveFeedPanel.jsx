import React, { useState } from 'react';
import {
  Search, Radio, CheckCircle, AlertOctagon, Copy, MapPin,
  ExternalLink, ShieldCheck, Film, Image as ImageIcon, Play
} from 'lucide-react';

const CATEGORY_COLORS = {
  rainfall: '#06b6d4',
  flood: '#ef4444',
  thunderstorm: '#a855f7',
  heatwave: '#f97316',
  fog: '#94a3b8',
  dust_storm: '#eab308',
  strong_wind: '#3b82f6',
  other: '#64748b'
};

export default function LiveFeedPanel({
  events,
  selectedEvent,
  onSelectEvent,
  onOpenModerationWithEvent,
  onOpenMedia
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // all | verified | media_only | alerts

  const filteredEvents = events.filter(ev => {
    if (filterMode === 'verified' && !ev.is_verified) return false;
    if (filterMode === 'media_only' && (!ev.media_urls || ev.media_urls.length === 0)) return false;
    if (filterMode === 'alerts' && !['flood', 'cyclone', 'thunderstorm'].includes(ev.category)) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (ev.raw_text && ev.raw_text.toLowerCase().includes(q)) ||
      (ev.city && ev.city.toLowerCase().includes(q)) ||
      (ev.category && ev.category.toLowerCase().includes(q)) ||
      (ev.author_handle && ev.author_handle.toLowerCase().includes(q))
    );
  });

  const getSourceDomainLabel = (url, fallback) => {
    if (!url) return fallback ? fallback.toUpperCase() : 'SOURCE';
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace('www.', '');
    } catch {
      return fallback ? fallback.toUpperCase() : 'SOURCE';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#090d14] border border-[#1c2538] tactical-box">
      {/* Panel Header */}
      <div className="border-b border-[#1c2538] px-3 py-2 flex items-center justify-between bg-[#0b1019]">
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="text-xs font-bold tracking-widest text-zinc-100 uppercase">
            LIVE CRISIS INGESTION FEED
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
          <span className="px-1.5 py-0.2 bg-zinc-800 border border-zinc-700 font-mono text-cyan-300">
            {filteredEvents.length} INCIDENTS
          </span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="p-2 border-b border-[#1c2538] bg-[#07090e] space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="SEARCH INCIDENT LOGS, CITIES, TAGS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0e131d] border border-[#1c2538] text-xs font-mono pl-8 pr-3 py-1.5 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="grid grid-cols-4 gap-1 text-[10px] font-mono">
          <button
            onClick={() => setFilterMode('all')}
            className={`py-1 border uppercase tracking-wider ${
              filterMode === 'all'
                ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 font-bold'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ALL
          </button>
          <button
            onClick={() => setFilterMode('verified')}
            className={`py-1 border uppercase tracking-wider ${
              filterMode === 'verified'
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            VERIFIED
          </button>
          <button
            onClick={() => setFilterMode('media_only')}
            className={`py-1 border uppercase tracking-wider ${
              filterMode === 'media_only'
                ? 'bg-purple-950/60 border-purple-500 text-purple-300 font-bold'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            WITH MEDIA
          </button>
          <button
            onClick={() => setFilterMode('alerts')}
            className={`py-1 border uppercase tracking-wider ${
              filterMode === 'alerts'
                ? 'bg-red-950/60 border-red-500 text-red-300 font-bold'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ALERTS
          </button>
        </div>
      </div>

      {/* Scrolling Incident Cards List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-zinc-600">
            [ NO INCIDENTS MATCHING CRITERIA ]
          </div>
        ) : (
          filteredEvents.map(ev => {
            const isSelected = selectedEvent?.id === ev.id;
            const catColor = CATEGORY_COLORS[ev.category] || '#64748b';
            const trustPercent = Math.round((ev.trust_score || 0.5) * 100);
            const primaryMedia = ev.media_urls && ev.media_urls.length > 0 ? ev.media_urls[0] : null;
            const isVideo = primaryMedia && (primaryMedia.endsWith('.mp4') || primaryMedia.endsWith('.webm'));

            return (
              <div
                key={ev.id}
                onClick={() => onSelectEvent(ev)}
                className={`p-2.5 border transition-all cursor-pointer select-none text-xs font-mono ${
                  isSelected
                    ? 'bg-[#101726] border-cyan-500 shadow-tactical-glow-cyan'
                    : 'bg-[#0d121c] border-[#1c2538] hover:border-[#2f3d59] hover:bg-[#111724]'
                }`}
              >
                {/* Header Row: City, Category, Verification */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-bold text-zinc-100 uppercase truncate">
                      {ev.city || 'REGIONAL INDIA'}
                    </span>
                    {ev.state && (
                      <span className="text-[10px] text-zinc-500 uppercase truncate">
                        ({ev.state})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className="px-1.5 py-0.2 text-[9px] uppercase font-bold tracking-wider"
                      style={{
                        backgroundColor: `${catColor}20`,
                        color: catColor,
                        border: `1px solid ${catColor}`
                      }}
                    >
                      {ev.category}
                    </span>
                  </div>
                </div>

                {/* Media Preview (Photo / Video Clip) */}
                {primaryMedia && (
                  <div
                    className="relative w-full h-28 bg-black border border-[#1e2738] mb-2 overflow-hidden group/media rounded-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenMedia) onOpenMedia({ url: primaryMedia, event: ev });
                    }}
                  >
                    {isVideo ? (
                      <>
                        <video
                          src={primaryMedia}
                          muted
                          loop
                          className="w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-none bg-black/80 border border-cyan-500 flex items-center justify-center text-cyan-400">
                            <Play className="w-4 h-4 fill-cyan-400 ml-0.5" />
                          </div>
                        </div>
                        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.2 bg-black/90 border border-cyan-500 text-[9px] text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Film className="w-2.5 h-2.5" />
                          <span>VIDEO RADAR</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <img
                          src={primaryMedia}
                          alt="Incident Report Photo"
                          className="w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-200"
                          loading="lazy"
                        />
                        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.2 bg-black/90 border border-emerald-500 text-[9px] text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-1">
                          <ImageIcon className="w-2.5 h-2.5" />
                          <span>ACTUAL PHOTO</span>
                        </span>
                      </>
                    )}
                    <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.2 bg-black/90 text-[9px] text-zinc-300 border border-zinc-700 font-mono">
                      [ CLICK TO EXPAND INTEL ]
                    </span>
                  </div>
                )}

                {/* Raw Event Text */}
                <p className="text-zinc-300 text-[11px] leading-snug mb-2 font-mono line-clamp-3">
                  {ev.raw_text}
                </p>

                {/* Duplicate Notification Pill (if flagged by Deduplication Engine) */}
                {ev.is_duplicate_of && (
                  <div className="flex items-center gap-1 mb-2 px-1.5 py-0.5 bg-amber-950/40 border border-amber-600/60 text-[10px] text-amber-300">
                    <Copy className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="truncate">NEAR-DUPLICATE CLUSTER // LINKED TO CANONICAL</span>
                  </div>
                )}

                {/* Clickable Source Link Pill */}
                {ev.source_url && (
                  <div className="mb-2">
                    <a
                      href={ev.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#121927] hover:bg-[#182338] border border-[#27354d] hover:border-cyan-500 text-[10px] text-cyan-300 transition-colors uppercase font-bold tracking-wider"
                    >
                      <span>SOURCE: {getSourceDomainLabel(ev.source_url, ev.source_name)}</span>
                      <ExternalLink className="w-3 h-3 text-cyan-400" />
                    </a>
                  </div>
                )}

                {/* Footer Telemetry Row */}
                <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1.5 border-t border-[#182133]">
                  <div className="flex items-center gap-2">
                    <span className="px-1 py-0.2 bg-zinc-900 border border-zinc-800 text-zinc-400">
                      {ev.source_name ? ev.source_name.toUpperCase() : 'UNKNOWN'}
                    </span>
                    <span className="text-zinc-600 font-mono">
                      {ev.posted_at ? new Date(ev.posted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'NOW'}
                    </span>
                  </div>

                  {/* Verification & Trust Level */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-500">TRUST:</span>
                      <span className={trustPercent >= 70 ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                        {trustPercent}%
                      </span>
                    </div>

                    {ev.is_verified ? (
                      <span className="flex items-center gap-0.5 text-emerald-400 font-bold">
                        <ShieldCheck className="w-3 h-3" />
                        <span>VERIFIED</span>
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenModerationWithEvent(ev);
                        }}
                        className="text-amber-400 hover:text-amber-300 underline text-[10px]"
                      >
                        [REVIEW]
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
