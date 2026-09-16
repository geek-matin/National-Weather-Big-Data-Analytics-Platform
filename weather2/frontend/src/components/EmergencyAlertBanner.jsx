import React from 'react';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';

export default function EmergencyAlertBanner({ alerts, onDismiss }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="border-b border-red-800 bg-[#160a0e] px-4 py-2 text-xs font-mono">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 flex-1 overflow-x-auto">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-600 text-black font-bold tracking-wider uppercase animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>ACTIVE CRISIS ALERT</span>
          </div>

          <div className="flex items-center gap-4 text-red-300 tracking-wide overflow-x-auto whitespace-nowrap">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center gap-2 border-r border-red-900/60 pr-4">
                <span className="font-semibold text-zinc-100 uppercase">
                  [{alert.region}]
                </span>
                <span>{alert.title}</span>
                <span className="px-1.5 py-0.2 bg-red-950 border border-red-700/80 text-[10px] text-red-400 font-bold">
                  {alert.event_count} REPORTS
                </span>
                <button
                  onClick={() => onDismiss(alert.id)}
                  className="text-zinc-500 hover:text-red-300 ml-1 p-0.5"
                  title="Acknowledge / Dismiss"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[11px] text-red-400 tracking-widest hidden lg:block">
          // DISASTER CLUSTERING PROTOCOL ENGAGED //
        </div>
      </div>
    </div>
  );
}
