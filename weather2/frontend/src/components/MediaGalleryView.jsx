import React, { useState } from 'react';
import { Film, Image as ImageIcon, ExternalLink, Play, Eye, Filter } from 'lucide-react';

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

export default function MediaGalleryView({ events, onOpenMedia }) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Extract all media items linked to their parent event
  const allMediaItems = [];
  events.forEach(ev => {
    if (ev.media_urls && ev.media_urls.length > 0) {
      ev.media_urls.forEach(url => {
        allMediaItems.push({
          url,
          event: ev
        });
      });
    }
  });

  const filteredItems = allMediaItems.filter(item => {
    if (selectedCategory === 'all') return true;
    return item.event.category === selectedCategory;
  });

  return (
    <div className="h-full bg-[#07090e] border border-[#1c2538] flex flex-col tactical-box overflow-hidden font-mono min-h-[460px]">
      {/* Gallery Header & Filters */}
      <div className="border-b border-[#1c2538] p-3 bg-[#0a0e17] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-100">
            VISUAL INCIDENT INTEL // SATELLITE & CITIZEN MEDIA WALL
          </span>
          <span className="px-1.5 py-0.2 bg-zinc-800 text-[10px] text-cyan-300 border border-zinc-700 font-bold">
            {filteredItems.length} MEDIA CAPTURES
          </span>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1 flex-wrap text-[10px]">
          {['all', 'flood', 'rainfall', 'thunderstorm', 'heatwave', 'strong_wind'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 border uppercase tracking-wider font-bold transition-all ${
                selectedCategory === cat
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Media Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredItems.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-zinc-600">
            [ NO VISUAL CAPTURES FOR SELECTED CATEGORY ]
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredItems.map((item, idx) => {
              const isVideo = item.url.endsWith('.mp4') || item.url.endsWith('.webm');
              const catColor = CATEGORY_COLORS[item.event.category] || '#64748b';

              return (
                <div
                  key={`${item.url}-${idx}`}
                  className="group bg-[#0d121c] border border-[#1c2538] hover:border-cyan-500 transition-all flex flex-col overflow-hidden text-xs cursor-pointer shadow-lg hover:shadow-tactical-glow-cyan"
                  onClick={() => onOpenMedia(item)}
                >
                  {/* Thumbnail / Video Container */}
                  <div className="relative w-full h-44 bg-black overflow-hidden flex items-center justify-center">
                    {isVideo ? (
                      <>
                        <video
                          src={item.url}
                          muted
                          loop
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-none bg-black/80 border border-cyan-500 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                            <Play className="w-5 h-5 fill-cyan-400 ml-0.5" />
                          </div>
                        </div>
                        <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/80 border border-cyan-500 text-[10px] text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Film className="w-3 h-3" />
                          <span>VIDEO</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <img
                          src={item.url}
                          alt={item.event.raw_text}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/80 border border-emerald-500 text-[10px] text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          <span>PHOTO</span>
                        </span>
                      </>
                    )}

                    {/* Category Overlay Tag */}
                    <span
                      className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: '#07090eeb',
                        color: catColor,
                        border: `1px solid ${catColor}`
                      }}
                    >
                      {item.event.category}
                    </span>
                  </div>

                  {/* Metadata Row */}
                  <div className="p-2.5 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                        <span className="font-bold text-zinc-100 uppercase">
                          {item.event.city || 'LOCATION'}, {item.event.state || 'INDIA'}
                        </span>
                        <span className="text-zinc-500">
                          {item.event.source_name ? item.event.source_name.toUpperCase() : 'FEED'}
                        </span>
                      </div>
                      <p className="text-zinc-300 text-[11px] line-clamp-2 leading-snug">
                        {item.event.raw_text}
                      </p>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-2 border-t border-[#182133] flex items-center justify-between text-[10px]">
                      <span className="text-cyan-400 group-hover:underline flex items-center gap-1 font-bold">
                        <Eye className="w-3 h-3" />
                        <span>INSPECT MEDIA</span>
                      </span>

                      {item.event.source_url && (
                        <a
                          href={item.event.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-zinc-400 hover:text-cyan-300 transition-colors"
                        >
                          <span>SOURCE</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
