import React from 'react';
import { 
  AlertTriangle, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  ExternalLink,
  ChevronRight,
  Radio
} from 'lucide-react';

export default function LayoutCard({ telemetry, onOpenMap }) {
  if (!telemetry) return null;

  const {
    header,
    current_risk,
    key_indicators,
    source_comparison_table,
    source_consensus,
    risk_timeline,
    data_sources
  } = telemetry;

  const getRiskColor = (level) => {
    switch (level?.toUpperCase()) {
      case 'SEVERE':
        return 'text-red-500 border-red-500/60 bg-red-950/30';
      case 'HIGH':
        return 'text-orange-500 border-orange-500/60 bg-orange-950/30';
      case 'MODERATE':
        return 'text-amber-400 border-amber-400/50 bg-amber-950/20';
      default:
        return 'text-emerald-400 border-emerald-400/50 bg-emerald-950/20';
    }
  };

  const getTimelineIcon = (status) => {
    switch (status?.toUpperCase()) {
      case 'SEVERE':
        return '🔴';
      case 'HIGH':
        return '🟠';
      case 'MODERATE':
        return '🟡';
      default:
        return '🟢';
    }
  };

  return (
    <div className="tactical-box w-full max-w-2xl mx-auto bg-[#0a0e17] border border-[#1e293b] p-6 shadow-2xl">
      {/* ────────────────── 1. HEADER ────────────────── */}
      <div className="border-b border-[#1e293b] pb-4 mb-5">
        <div className="flex items-center justify-between text-xs tracking-wider uppercase mb-1">
          <div className="flex items-center gap-2 font-bold text-cyan-400 text-sm">
            <span>{header.hazard_icon || '🌧️'}</span>
            <span>{header.hazard_type}</span>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-0.5 bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>● {header.status}</span>
          </div>
        </div>

        <div className="flex items-baseline justify-between mt-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
              {header.place_name}
              <span className="text-xs font-normal text-slate-400 uppercase border border-slate-700 px-1.5 py-0.5 font-mono">
                {header.type || 'STATION'} // {header.state}
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 text-xs">
          <button 
            onClick={onOpenMap}
            className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 border border-cyan-500/40 bg-cyan-950/20 hover:bg-cyan-900/30 px-3 py-1 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5" />
            [ 📍 VIEW SURVEILLANCE RADAR ]
          </button>
          <div className="text-slate-400 flex items-center gap-1 text-[11px] font-mono">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>{header.updated_label || 'Live Telemetry Active'}</span>
          </div>
        </div>
      </div>

      {/* ────────────────── 2. CURRENT RISK ────────────────── */}
      <div className="border-b border-[#1e293b] pb-5 mb-5">
        <div className="text-[11px] font-bold tracking-widest text-slate-400 uppercase mb-3">
          CURRENT RISK TELEMETRY
        </div>

        <div className="flex flex-col items-center justify-center py-2 text-center">
          <span className={`text-2xl font-black tracking-widest px-5 py-1 border ${getRiskColor(current_risk.level)}`}>
            {current_risk.level}
          </span>
          <div className="text-sm font-semibold text-slate-300 mt-2 font-mono">
            Disaster Risk Score: <span className="text-cyan-400 font-bold">{current_risk.score}</span> / {current_risk.max_score || 100}
          </div>

          {/* Dynamic ASCII Progress Meter */}
          <div className="mt-3 font-mono text-base tracking-[0.15em] text-cyan-400 bg-[#06080e] px-4 py-1.5 border border-[#1c2538] select-all shadow-inner">
            {current_risk.ascii_bar}
          </div>
        </div>

        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-300 bg-amber-950/30 border border-amber-500/30 px-3 py-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{current_risk.warning_notice}</span>
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-300 flex flex-col items-center gap-1 font-mono">
          <div>
            System Confidence: <span className="font-bold text-cyan-400">{current_risk.system_confidence}</span>
          </div>
          <div className="text-slate-400 text-[11px]">
            {current_risk.consensus_summary}
          </div>
        </div>
      </div>

      {/* ────────────────── 3. KEY SENSOR INDICATORS ────────────────── */}
      <div className="border-b border-[#1e293b] pb-5 mb-5">
        <div className="text-[11px] font-bold tracking-widest text-slate-400 uppercase mb-3 flex items-center justify-between">
          <span>KEY SENSOR METEOROLOGICAL INDICATORS</span>
          <span className="text-[10px] text-cyan-400 font-mono">REAL-TIME INGESTION</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          {/* Temperature */}
          {key_indicators.temperature && (
            <div className="p-2.5 bg-[#0e1420] border border-[#1c2538] flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <span>🌡️</span>
                <span>Temperature</span>
              </div>
              <span className="font-bold font-mono text-amber-300 text-sm mt-1">
                {key_indicators.temperature.value}
              </span>
            </div>
          )}

          {/* Relative Humidity */}
          {key_indicators.humidity && (
            <div className="p-2.5 bg-[#0e1420] border border-[#1c2538] flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <span>💧</span>
                <span>Humidity</span>
              </div>
              <span className="font-bold font-mono text-cyan-300 text-sm mt-1">
                {key_indicators.humidity.value}
              </span>
            </div>
          )}

          {/* Precipitation Rate */}
          {key_indicators.precipitation && (
            <div className="p-2.5 bg-[#0e1420] border border-[#1c2538] flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <span>🌧️</span>
                <span>Precipitation</span>
              </div>
              <span className="font-bold font-mono text-blue-300 text-sm mt-1">
                {key_indicators.precipitation.value}
              </span>
            </div>
          )}

          {/* Air Quality (AQI) */}
          {key_indicators.air_quality && (
            <div className="p-2.5 bg-[#0e1420] border border-[#1c2538] flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <span>🍃</span>
                <span>Air Quality</span>
              </div>
              <span className="font-bold font-mono text-emerald-400 text-sm mt-1 truncate" title={key_indicators.air_quality.value}>
                {key_indicators.air_quality.value}
              </span>
            </div>
          )}

          {/* 6h Rainfall */}
          {key_indicators.rainfall && (
            <div className="p-2.5 bg-[#0e1420] border border-[#1c2538] flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <span>{key_indicators.rainfall.icon}</span>
                <span>6h Rainfall</span>
              </div>
              <span className="font-bold font-mono text-cyan-300 text-sm mt-1">
                {key_indicators.rainfall.value}
              </span>
            </div>
          )}

          {/* Soil Saturation */}
          {key_indicators.soil_saturation && (
            <div className="p-2.5 bg-[#0e1420] border border-[#1c2538] flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <span>{key_indicators.soil_saturation.icon}</span>
                <span>Soil Sat</span>
              </div>
              <span className="font-bold font-mono text-cyan-300 text-sm mt-1">
                {key_indicators.soil_saturation.value}
              </span>
            </div>
          )}

          {/* Water Level */}
          {key_indicators.water_level && (
            <div className="p-2.5 bg-[#0e1420] border border-[#1c2538] flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <span>{key_indicators.water_level.icon}</span>
                <span>Water Level</span>
              </div>
              <span className="font-bold font-mono text-cyan-300 text-sm mt-1">
                {key_indicators.water_level.value}
              </span>
            </div>
          )}

          {/* Wind Speed */}
          {key_indicators.wind && (
            <div className="p-2.5 bg-[#0e1420] border border-[#1c2538] flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <span>{key_indicators.wind.icon}</span>
                <span>Wind Speed</span>
              </div>
              <span className="font-bold font-mono text-cyan-300 text-sm mt-1">
                {key_indicators.wind.value}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ────────────────── 4. MULTI-SOURCE COMPARISON TABLE ────────────────── */}
      <div className="border-b border-[#1e293b] pb-5 mb-5">
        <div className="text-[11px] font-bold tracking-widest text-slate-400 uppercase mb-3 flex items-center justify-between">
          <span>SOURCE COMPARISON // CROSS-VALIDATION MATRIX</span>
          <span className="text-[10px] text-cyan-400 font-mono">DYNAMIC GOLD BLEND</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border border-[#1c2538]">
            <thead className="bg-[#07090f] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1c2538]">
              <tr>
                <th className="py-2 px-3">Indicator</th>
                <th className="py-2 px-3 text-center">Source A</th>
                <th className="py-2 px-3 text-center">Source B</th>
                <th className="py-2 px-3 text-center">Source C</th>
                <th className="py-2 px-3 text-center text-cyan-400 bg-cyan-950/20 font-bold border-l border-[#1c2538]">
                  SYSTEM
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2538]">
              {source_comparison_table.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-2 px-3 font-semibold text-slate-300">{row.indicator}</td>
                  <td className="py-2 px-3 text-center text-slate-400 font-mono">{row.source_a}</td>
                  <td className="py-2 px-3 text-center text-slate-400 font-mono">{row.source_b}</td>
                  <td className="py-2 px-3 text-center text-slate-400 font-mono">{row.source_c}</td>
                  <td className="py-2 px-3 text-center font-bold text-cyan-300 bg-cyan-950/20 border-l border-[#1c2538] font-mono">
                    {row.system}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ────────────────── 5. SOURCE CONSENSUS ────────────────── */}
      <div className="border-b border-[#1e293b] pb-5 mb-5">
        <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-amber-400 uppercase mb-3">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>INDEPENDENT SOURCE CONSENSUS</span>
        </div>

        <div className="bg-[#0e1420] border border-[#1c2538] p-3 space-y-1.5 text-xs">
          {source_consensus.breakdown.map((line, idx) => (
            <div key={idx} className="text-slate-300 font-medium flex items-center justify-between">
              <span>{line}</span>
              {idx === 0 && (
                <span className="text-[10px] text-orange-400 border border-orange-500/40 px-1.5 py-0.2 bg-orange-950/30 font-mono">
                  MAJORITY
                </span>
              )}
            </div>
          ))}
          <div className="border-t border-slate-800 pt-2 mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-400">Consensus Agreement:</span>
            <span className="font-bold text-cyan-400 text-sm font-mono">{source_consensus.agreement_pct}%</span>
          </div>
        </div>
      </div>

      {/* ────────────────── 6. DYNAMIC RISK TIMELINE ────────────────── */}
      <div className="border-b border-[#1e293b] pb-5 mb-5">
        <div className="text-[11px] font-bold tracking-widest text-slate-400 uppercase mb-3">
          HAZARD RISK TIMELINE // 24-HOUR FORECAST TREND
        </div>

        <div className="grid grid-cols-5 gap-2 text-center text-xs">
          {risk_timeline.map((step, idx) => (
            <div key={idx} className="p-2 bg-[#0e1420] border border-[#1c2538] flex flex-col items-center justify-between">
              <span className="text-slate-400 font-bold text-[11px] font-mono">{step.time}</span>
              <span className="text-base my-1">{step.icon || getTimelineIcon(step.status)}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                step.status === 'SEVERE' ? 'text-red-400' :
                step.status === 'HIGH' ? 'text-orange-400' :
                step.status === 'MODERATE' ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {step.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ────────────────── 7. DATA SOURCES & AUTHENTICITY ────────────────── */}
      <div>
        <div className="text-[11px] font-bold tracking-widest text-slate-400 uppercase mb-3">
          DATA SOURCES & AUTHENTICITY METERS
        </div>

        <div className="space-y-3">
          {data_sources.map((src, idx) => (
            <div 
              key={idx} 
              className={`p-3 bg-[#0e1420] border transition-colors ${
                src.status === 'STANDBY' ? 'border-slate-800 bg-slate-900/30' : 'border-[#1c2538]'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200">{src.code}</span>
                  <span className="text-slate-500 text-[11px]">({src.name})</span>
                </div>
                <span className={`text-[11px] font-mono ${src.status === 'ACTIVE' ? 'text-cyan-400' : 'text-slate-500'}`}>
                  {src.time_label}
                </span>
              </div>

              {src.verified ? (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>● Verified authenticated telemetry</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-2">
                  <span>● Uncalibrated auxiliary telemetry</span>
                </div>
              )}

              {/* Dynamic Authenticity Progress Bar */}
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 text-[11px]">Authenticity</span>
                <span className="tracking-[0.12em] text-cyan-400 bg-[#06080e] px-2 py-0.5 border border-slate-800">
                  {src.ascii_bar}
                </span>
                <span className="font-bold text-slate-200">{Math.round(src.authenticity_score)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
