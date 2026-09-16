import React, { useState } from 'react';
import { X, Shield, Check, AlertOctagon, RefreshCw, UserCheck } from 'lucide-react';

export default function AdminModerationPanel({
  isOpen,
  onClose,
  events = [],
  selectedEventForReview,
  onModerateEvent
}) {
  const [activeEvent, setActiveEvent] = useState(selectedEventForReview || null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Sync if selected event prop changes
  React.useEffect(() => {
    if (selectedEventForReview) {
      setActiveEvent(selectedEventForReview);
    } else if (events.length > 0 && !activeEvent) {
      setActiveEvent(events[0]);
    }
  }, [selectedEventForReview, events]);

  if (!isOpen) return null;

  const handleAction = async (isVerified) => {
    if (!activeEvent) return;
    setIsProcessing(true);
    try {
      if (onModerateEvent) {
        await onModerateEvent(activeEvent.id, isVerified);
      }
      setActiveEvent(prev => prev ? { ...prev, is_verified: isVerified, trust_score: isVerified ? 0.95 : 0.15 } : null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm font-mono">
      <div className="bg-[#0b0f17] border border-[#2d3b55] w-full max-w-2xl p-5 shadow-2xl relative tactical-box text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1c2538] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold tracking-wider uppercase text-zinc-100 font-mono">
              OPERATOR COMMAND // HUMAN-IN-THE-LOOP MODERATION
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-zinc-400 mb-3 leading-relaxed">
          As mandated for IMD disaster operations, automated ML credibility ratings can be audited and overridden by duty meteorologists before emergency escalation.
        </p>

        {activeEvent ? (
          <div className="space-y-4">
            {/* Selected Incident Telemetry Card */}
            <div className="p-3 bg-[#111724] border border-[#1e2a40] space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-[#1c2538] pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-cyan-400 uppercase">
                    [{activeEvent.city || 'LOCATION'}]
                  </span>
                  <span className="text-zinc-400 text-[10px]">
                    SOURCE: {activeEvent.source_name ? activeEvent.source_name.toUpperCase() : 'UNKNOWN'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-400">ML TRUST SCORE:</span>
                  <span className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-amber-400 font-bold text-[11px]">
                    {Math.round((activeEvent.trust_score || 0.5) * 100)}%
                  </span>
                </div>
              </div>

              <p className="text-zinc-200 leading-relaxed text-xs font-mono">
                {activeEvent.raw_text}
              </p>

              <div className="grid grid-cols-3 gap-2 text-[10px] text-zinc-400 pt-2 border-t border-[#182133]">
                <div>CATEGORY: <span className="text-white uppercase font-bold">{activeEvent.category}</span></div>
                <div>CONFIDENCE: <span className="text-emerald-400">{Math.round((activeEvent.category_confidence || 0.85) * 100)}%</span></div>
                <div>STATUS: <span className={activeEvent.is_verified ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                  {activeEvent.is_verified ? 'VERIFIED' : 'UNCONFIRMED'}
                </span></div>
              </div>
            </div>

            {/* Operator Decision Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleAction(false)}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-950/70 hover:bg-red-900 border border-red-500/70 text-red-300 uppercase tracking-wider text-xs transition-all disabled:opacity-50 font-mono"
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>FLAG AS UNVERIFIED / RUMOR</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction(true)}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold uppercase tracking-wider text-xs transition-all disabled:opacity-50 font-mono"
              >
                <Check className="w-3.5 h-3.5" />
                <span>OVERRIDE & APPROVE AS VERIFIED</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-zinc-500 font-mono">
            [ NO INCIDENTS REQUIRING OPERATOR AUDIT ]
          </div>
        )}
      </div>
    </div>
  );
}
