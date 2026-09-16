import React, { useState, useEffect } from 'react';
import { Camera, Video, ShieldCheck, ExternalLink, Play, Eye } from 'lucide-react';

export default function MediaGallery({ onOpenLightbox, refreshTrigger }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function fetchReports() {
      setLoading(true);
      try {
        const res = await fetch('/api/reports');
        const data = await res.json();
        setReports(data.reports || []);
      } catch (err) {
        console.error('Failed to fetch media reports:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, [refreshTrigger]);

  const filteredReports = reports.filter((r) => {
    if (!r.media_url) return false;
    if (filter === 'video') return r.media_url.endsWith('.mp4');
    if (filter === 'photo') return !r.media_url.endsWith('.mp4');
    return true;
  });

  return (
    <div className="tactical-box p-5 bg-[#0a0e17] border border-[#1e293b] w-full max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1e293b] pb-3 mb-4 gap-2">
        <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
          <Camera className="w-4 h-4" />
          <span>SATELLITE, RADAR & DISASTER MEDIA WALL // VERIFIED CITIZEN FEED</span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#06080e] p-1 border border-[#1c2538] text-[11px]">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-0.5 uppercase font-bold transition-colors ${
              filter === 'all' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ALL INTEL ({reports.filter(r => r.media_url).length})
          </button>
          <button
            onClick={() => setFilter('photo')}
            className={`px-2 py-0.5 uppercase font-bold transition-colors ${
              filter === 'photo' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            PHOTOS
          </button>
          <button
            onClick={() => setFilter('video')}
            className={`px-2 py-0.5 uppercase font-bold transition-colors ${
              filter === 'video' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            VIDEOS / RADAR
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500 font-mono animate-pulse">
          LOADING SATELLITE & GROUND TELEMETRY MEDIA...
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">
          No verified media items available in this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReports.map((item) => {
            const isVideo = item.media_url?.endsWith('.mp4');

            return (
              <div 
                key={item.id}
                className="bg-[#0e1420] border border-[#1c2538] hover:border-cyan-500/60 transition-all flex flex-col justify-between group"
              >
                {/* Media Preview Container */}
                <div 
                  onClick={() => onOpenLightbox(item)}
                  className="relative aspect-video bg-black overflow-hidden cursor-pointer border-b border-[#1c2538]"
                >
                  {isVideo ? (
                    <video
                      src={item.media_url}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                  ) : (
                    <img
                      src={item.media_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  )}

                  {/* Badges Over Media */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-black/80 backdrop-blur-sm border border-slate-700 text-slate-200 uppercase flex items-center gap-1">
                      {isVideo ? <Video className="w-3 h-3 text-cyan-400" /> : <Camera className="w-3 h-3 text-cyan-400" />}
                      {isVideo ? 'VIDEO RADAR LOOP' : 'ACTUAL PHOTO'}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 uppercase">
                      {item.event_type}
                    </span>
                  </div>

                  <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 text-[10px] text-slate-300 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="w-3 h-3 text-cyan-400" />
                    <span>INSPECT FULLSCREEN</span>
                  </div>
                </div>

                {/* Report Content */}
                <div className="p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{item.user_name}</span>
                    </div>
                    <span className="text-cyan-400 font-mono text-[11px] font-bold">
                      AUTHENTICITY: {Math.round(item.authenticity_score)}%
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-100 text-sm line-clamp-1">
                    {item.title}
                  </h3>

                  <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Real-Time Tagged Weather Metrics */}
                  {(item.temperature_c != null || item.precipitation_mm != null || item.air_quality_index != null) && (
                    <div className="grid grid-cols-4 gap-1.5 py-1.5 px-2 bg-[#080b12] border border-slate-800 text-[10px] font-mono">
                      <div className="text-center">
                        <span className="text-slate-500 block text-[8px]">TEMP</span>
                        <span className="text-amber-300 font-bold">{item.temperature_c ? `${item.temperature_c.toFixed(1)}°C` : 'N/A'}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-slate-500 block text-[8px]">HUMIDITY</span>
                        <span className="text-cyan-300 font-bold">{item.humidity_pct ? `${Math.round(item.humidity_pct)}%` : 'N/A'}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-slate-500 block text-[8px]">PRECIP</span>
                        <span className="text-blue-300 font-bold">{item.precipitation_mm ? `${item.precipitation_mm.toFixed(1)} mm` : '0 mm'}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-slate-500 block text-[8px]">AIR QUAL</span>
                        <span className="text-emerald-400 font-bold">{item.air_quality_index ? `${item.air_quality_index} AQI` : '65 AQI'}</span>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {item.place_name ? `📍 ${item.place_name} // ` : ''}{item.submitted_at}
                    </span>

                    {item.source_url && (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 px-2 py-0.5 hover:bg-cyan-950/30 transition-colors"
                      >
                        <span>↗ SOURCE BULLETIN</span>
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
  );
}
