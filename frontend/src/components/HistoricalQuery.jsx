import React, { useState, useEffect } from 'react';
import { Database, Filter, Calendar, MapPin, TrendingUp, Search, ChevronRight } from 'lucide-react';

export default function HistoricalQuery({ onSelectPlace, currentPlaceId }) {
  const [period, setPeriod] = useState('last_month');
  const [minRainfall, setMinRainfall] = useState(50);
  const [selectedState, setSelectedState] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [placeTrend, setPlaceTrend] = useState([]);

  // Fetch heavy rain queries
  useEffect(() => {
    async function fetchHistoricalData() {
      setLoading(true);
      try {
        let url = `/api/history/query?period=${period}&min_rainfall=${minRainfall}`;
        if (selectedState) {
          url += `&state=${encodeURIComponent(selectedState)}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        setResults(data.results || []);
      } catch (err) {
        console.error('Failed to fetch historical query:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistoricalData();
  }, [period, minRainfall, selectedState]);

  // Fetch single place trend
  useEffect(() => {
    if (!currentPlaceId) return;
    async function fetchTrend() {
      try {
        const res = await fetch(`/api/places/${currentPlaceId}/history?days=30`);
        const data = await res.json();
        setPlaceTrend(data.trend || []);
      } catch (err) {
        console.error('Failed to fetch place trend:', err);
      }
    }
    fetchTrend();
  }, [currentPlaceId]);

  const periods = [
    { id: 'last_week', label: 'LAST 7 DAYS' },
    { id: 'last_month', label: 'LAST 30 DAYS' },
    { id: 'monsoon', label: 'MONSOON SEASON' },
    { id: 'last_year', label: 'PAST 12 MONTHS' }
  ];

  const states = [
    'All States',
    'Maharashtra',
    'Meghalaya',
    'Kerala',
    'Assam',
    'Uttarakhand',
    'West Bengal',
    'Karnataka',
    'Tamil Nadu',
    'Gujarat'
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* ────────────────── 1. QUERY BUILDER CARD ────────────────── */}
      <div className="tactical-box p-5 bg-[#0a0e17] border border-[#1e293b]">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-3 mb-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
            <Database className="w-4 h-4" />
            <span>HISTORICAL BIG DATA QUERY ENGINE // TIME-SERIES ARCHIVE</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {results.length} PLACES QUALIFIED
          </span>
        </div>

        {/* Natural Language Prompt & Presets */}
        <div className="text-xs text-slate-300 mb-3 font-semibold">
          QUESTION: <span className="text-cyan-300">"Where did it rain heavily in India over the selected timeframe?"</span>
        </div>

        {/* Period Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`p-2 border text-xs font-bold uppercase transition-colors ${
                period === p.id
                  ? 'bg-cyan-500 text-black border-cyan-400 shadow-sm'
                  : 'bg-[#0e1420] border-[#1c2538] text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Query Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#1e293b] text-xs">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span>MINIMUM RAINFALL THRESHOLD:</span>
              <span className="font-bold text-cyan-400 font-mono">{minRainfall} mm</span>
            </div>
            <input
              type="range"
              min="20"
              max="200"
              step="10"
              value={minRainfall}
              onChange={(e) => setMinRainfall(Number(e.target.value))}
              className="w-full accent-cyan-400 bg-slate-800 h-1.5 cursor-pointer"
            />
          </div>

          <div>
            <div className="text-slate-400 mb-1.5">FILTER BY INDIAN STATE:</div>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value === 'All States' ? '' : e.target.value)}
              className="w-full bg-[#0e1420] border border-[#1c2538] text-slate-200 p-1.5 focus:outline-none focus:border-cyan-500 text-xs font-mono"
            >
              {states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ────────────────── 2. RANKED QUERY RESULTS TABLE ────────────────── */}
      <div className="tactical-box p-5 bg-[#0a0e17] border border-[#1e293b]">
        <div className="text-[11px] font-bold tracking-widest text-slate-400 uppercase mb-3 flex items-center justify-between">
          <span>QUERY RESULTS // RANKED BY MAX RECORDED PRECIPITATION</span>
          <span className="text-[10px] text-cyan-400">CLICK ANY ROW TO INSPECT TELEMETRY</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 font-mono animate-pulse">
            SCANNING TIME-SERIES READINGS IN ARCHIVE...
          </div>
        ) : results.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No locations recorded &gt; {minRainfall} mm precipitation during this window.
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#1c2538]">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#07090f] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1c2538]">
                <tr>
                  <th className="py-2 px-3 text-center">#</th>
                  <th className="py-2 px-3">Location</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">State / District</th>
                  <th className="py-2 px-3 text-right">Max Rain</th>
                  <th className="py-2 px-3 text-right">Avg Rain</th>
                  <th className="py-2 px-3 text-center">Readings</th>
                  <th className="py-2 px-3 text-right">Latest Peak</th>
                  <th className="py-2 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c2538]">
                {results.map((r, idx) => (
                  <tr 
                    key={r.place_id} 
                    onClick={() => onSelectPlace(r.place_id)}
                    className={`cursor-pointer hover:bg-slate-800/40 transition-colors ${
                      r.place_id === currentPlaceId ? 'bg-cyan-950/40 border-l-2 border-cyan-400' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center font-bold text-slate-500 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-200">
                      {r.name}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 border border-slate-700 text-slate-400">
                        {r.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {r.district}, {r.state}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold font-mono text-cyan-300">
                      {r.max_rainfall_mm} mm
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                      {r.avg_rainfall_mm} mm
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                      {r.heavy_rain_readings_count}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400 text-[11px] font-mono">
                      {r.latest_heavy_rain_time?.split(' ')[0] || 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button className="text-cyan-400 hover:text-cyan-200 text-xs font-bold flex items-center justify-center gap-0.5">
                        <span>VIEW</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ────────────────── 3. PLACE 30-DAY TIME-SERIES CHART ────────────────── */}
      {placeTrend.length > 0 && (
        <div className="tactical-box p-5 bg-[#0a0e17] border border-[#1e293b]">
          <div className="text-[11px] font-bold tracking-widest text-slate-400 uppercase mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>SELECTED LOCATION HISTORICAL READINGS // 30-DAY LOG</span>
            </span>
            <span className="text-cyan-400 font-mono text-xs font-bold">
              {placeTrend[0]?.source_name || 'IMD Network'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs">
            {placeTrend.slice(0, 12).map((pt, i) => (
              <div key={i} className="p-2 bg-[#0e1420] border border-[#1c2538] flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 font-mono">{pt.date}</span>
                <span className="font-bold text-cyan-300 text-sm my-1 font-mono">{pt.max_rainfall} mm</span>
                <span className="text-[10px] text-slate-500">Avg: {pt.avg_rainfall} mm</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
