import React from 'react';
import { X, ExternalLink, ShieldCheck, MapPin, Calendar, Film, Image as ImageIcon } from 'lucide-react';

export default function MediaLightboxModal({ mediaItem, onClose }) {
  if (!mediaItem) return null;

  const { url, event } = mediaItem;
  const isVideo = url && (url.endsWith('.mp4') || url.endsWith('.webm'));

  return (
    <div className="fixed inset-0 z-[3000] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md font-mono select-none">
      <div className="bg-[#0b0f17] border border-[#2d3b55] w-full max-w-4xl p-4 shadow-2xl relative tactical-box text-zinc-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#1c2538] pb-3 mb-3">
          <div className="flex items-center gap-2">
            {isVideo ? (
              <Film className="w-4 h-4 text-cyan-400 animate-pulse" />
            ) : (
              <ImageIcon className="w-4 h-4 text-emerald-400" />
            )}
            <span className="text-xs font-bold tracking-wider uppercase text-zinc-100">
              TACTICAL MEDIA INTEL // {isVideo ? 'VIDEO TELEMETRY CAPTURE' : 'HIGH-RES IMAGERY'}
            </span>
            {event?.category && (
              <span className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-[10px] text-cyan-300 uppercase font-bold">
                {event.category}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-1 border border-zinc-800 hover:border-zinc-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Media Container */}
        <div className="flex-1 bg-black border border-[#1c2538] flex items-center justify-center overflow-hidden min-h-[300px] max-h-[520px] relative">
          {isVideo ? (
            <video
              src={url}
              controls
              autoPlay
              loop
              className="max-h-[500px] w-full object-contain"
            />
          ) : (
            <img
              src={url}
              alt="Weather Incident Capture"
              className="max-h-[500px] w-full object-contain"
            />
          )}
        </div>

        {/* Incident Details & Source Link Footer */}
        {event && (
          <div className="mt-3 pt-3 border-t border-[#1c2538] space-y-2 text-xs">
            <p className="text-zinc-300 text-[11px] leading-relaxed">
              {event.raw_text}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-zinc-400 pt-1">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-zinc-300 font-bold uppercase">
                  <MapPin className="w-3 h-3 text-cyan-400" />
                  {event.city || 'LOCATION'}, {event.state || 'INDIA'}
                </span>
                <span>
                  SOURCE: <strong className="text-zinc-200">{event.source_name ? event.source_name.toUpperCase() : 'UNKNOWN'}</strong>
                </span>
                <span>
                  TRUST: <strong className="text-amber-400">{Math.round((event.trust_score || 0.5) * 100)}%</strong>
                </span>
              </div>

              {event.source_url && (
                <a
                  href={event.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500 text-cyan-300 font-bold uppercase tracking-wider transition-all"
                >
                  <span>OPEN ORIGINAL SOURCE BULLETIN</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
