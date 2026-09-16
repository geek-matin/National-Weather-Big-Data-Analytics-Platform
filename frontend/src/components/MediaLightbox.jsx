import React from 'react';
import { X, ExternalLink, ShieldCheck, ShieldAlert, Calendar, MapPin } from 'lucide-react';

export default function MediaLightbox({ item, onClose }) {
  if (!item) return null;

  const isVideo = item.media_url?.endsWith('.mp4');

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="tactical-box w-full max-w-4xl bg-[#0a0e17] border border-[#1e293b] overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-3 border-b border-[#1c2538] bg-[#07090f]">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <span className="text-cyan-400 font-mono">// TACTICAL MEDIA INSPECTION</span>
            <span>•</span>
            <span className="uppercase text-slate-400">{item.event_type}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Viewport */}
        <div className="relative bg-black flex-1 min-h-[300px] flex items-center justify-center overflow-hidden">
          {isVideo ? (
            <video
              src={item.media_url}
              controls
              autoPlay
              loop
              className="max-h-[60vh] w-auto max-w-full object-contain"
            />
          ) : (
            <img
              src={item.media_url}
              alt={item.title}
              className="max-h-[60vh] w-auto max-w-full object-contain"
            />
          )}
        </div>

        {/* Details Footer */}
        <div className="p-4 bg-[#0d111a] border-t border-[#1c2538] text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-200">{item.user_name}</span>
              <span className="text-[10px] text-cyan-400 font-mono border border-cyan-500/30 px-1.5 py-0.2">
                ML VERIFIED // {Math.round(item.authenticity_score)}%
              </span>
            </div>
            <span className="text-slate-400 font-mono text-[11px]">
              {item.submitted_at}
            </span>
          </div>

          <h2 className="text-sm font-bold text-slate-100">{item.title}</h2>
          <p className="text-slate-300 text-xs leading-relaxed">{item.description}</p>

          {item.source_url && (
            <div className="pt-2 flex justify-end">
              <a
                href={item.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider transition-colors"
              >
                <span>OPEN ORIGINAL SOURCE BULLETIN ↗</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
