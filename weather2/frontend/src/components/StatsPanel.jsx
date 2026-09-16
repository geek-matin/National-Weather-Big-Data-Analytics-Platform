import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid
} from 'recharts';
import { BarChart3, TrendingUp, MapPin, Activity } from 'lucide-react';

export default function StatsPanel({ categoryStats, timelineStats, regionStats }) {
  // Custom Tactical Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0b1019] border border-[#2d3b55] p-2 text-xs font-mono shadow-2xl">
          <p className="text-cyan-400 font-bold uppercase mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={`item-${index}`} className="text-zinc-300">
              {entry.name}: <span className="font-bold text-white">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* Chart 1: Disaster Events by Category */}
      <div className="bg-[#090d14] border border-[#1c2538] p-3 tactical-box flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-[#1c2538] pb-1.5 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold font-mono tracking-wider text-zinc-100 uppercase">
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>DISASTER CATEGORIES</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">DISTRIBUTION %</span>
        </div>

        <div className="h-44 w-full">
          {categoryStats && categoryStats.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryStats} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#161f30" vertical={false} />
                <XAxis
                  dataKey="category"
                  stroke="#525e75"
                  fontSize={10}
                  fontFamily="JetBrains Mono"
                  tickFormatter={(val) => val.slice(0, 5).toUpperCase()}
                />
                <YAxis stroke="#525e75" fontSize={10} fontFamily="JetBrains Mono" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#06b6d4" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs font-mono text-zinc-600">
              [ NO CATEGORICAL DATA ]
            </div>
          )}
        </div>
      </div>

      {/* Chart 2: Time-Series Incident Frequency */}
      <div className="bg-[#090d14] border border-[#1c2538] p-3 tactical-box flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-[#1c2538] pb-1.5 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold font-mono tracking-wider text-zinc-100 uppercase">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>TEMPORAL INTENSITY</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">INCIDENT FREQ</span>
        </div>

        <div className="h-44 w-full">
          {timelineStats && timelineStats.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineStats} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="tacticalCyanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 2" stroke="#161f30" vertical={false} />
                <XAxis dataKey="time_label" stroke="#525e75" fontSize={10} fontFamily="JetBrains Mono" />
                <YAxis stroke="#525e75" fontSize={10} fontFamily="JetBrains Mono" />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="event_count" stroke="#10b981" strokeWidth={1.5} fillOpacity={1} fill="url(#tacticalCyanGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs font-mono text-zinc-600">
              [ NO TIMELINE SAMPLES ]
            </div>
          )}
        </div>
      </div>

      {/* Ranked Region List */}
      <div className="bg-[#090d14] border border-[#1c2538] p-3 tactical-box flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-[#1c2538] pb-1.5 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold font-mono tracking-wider text-zinc-100 uppercase">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>REGIONAL SEVERITY MATRIX</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">TOP SECTORS</span>
        </div>

        <div className="h-44 overflow-y-auto space-y-1.5 text-xs font-mono pr-1">
          {regionStats && regionStats.length > 0 ? (
            regionStats.map((reg, idx) => (
              <div
                key={reg.state || idx}
                className="flex items-center justify-between p-1.5 bg-[#0e131e] border border-[#1a2336] text-[11px]"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-zinc-500 text-[10px] font-bold">0{idx + 1}</span>
                  <span className="text-zinc-200 font-semibold truncate uppercase">{reg.state}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-zinc-400 text-[10px]">
                    {reg.verified} VERIFIED
                  </span>
                  <span className="px-1.5 py-0.2 bg-zinc-800 border border-zinc-700 text-cyan-300 font-bold text-[10px]">
                    {reg.count}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex items-center justify-center text-xs font-mono text-zinc-600">
              [ NO REGIONAL LOGS ]
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
