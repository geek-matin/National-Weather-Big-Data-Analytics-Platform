import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Users, X, AlertTriangle, Zap, Waves, Sun, CloudFog } from 'lucide-react';

export default function PlaceSearch({ 
  currentPlaceId, 
  onSelectPlace, 
  selectedCategory,
  onSelectCategory 
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        let url = `/api/places/search?query=${encodeURIComponent(query.trim())}`;
        if (selectedCategory && selectedCategory !== 'all' && !query.trim()) {
          url += `&category=${encodeURIComponent(selectedCategory)}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        setResults(data.places || []);
        if (query.trim()) setIsOpen(true);
      } catch (err) {
        console.error('Search places error:', err);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, selectedCategory]);

  const getHazardBadge = (hazard) => {
    switch (hazard?.toUpperCase()) {
      case 'THUNDERSTORM':
        return <span className="text-[10px] bg-purple-950/60 border border-purple-500/40 text-purple-300 px-1 font-mono">⚡ THUNDERSTORM</span>;
      case 'FLOODING':
        return <span className="text-[10px] bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 px-1 font-mono">🌊 FLOODING</span>;
      case 'HEATWAVE':
        return <span className="text-[10px] bg-amber-950/60 border border-amber-500/40 text-amber-300 px-1 font-mono">☀️ HEATWAVE</span>;
      case 'FOG':
        return <span className="text-[10px] bg-slate-800 border border-slate-600 text-slate-300 px-1 font-mono">🌫️ DENSE FOG</span>;
      case 'DUST STORM':
        return <span className="text-[10px] bg-yellow-950/60 border border-yellow-500/40 text-yellow-300 px-1 font-mono">🌪️ DUST STORM</span>;
      case 'STRONG WIND':
        return <span className="text-[10px] bg-teal-950/60 border border-teal-500/40 text-teal-300 px-1 font-mono">💨 STRONG WIND</span>;
      default:
        return <span className="text-[10px] bg-blue-950/60 border border-blue-500/40 text-blue-300 px-1 font-mono">🌧️ RAINFALL</span>;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-6" ref={wrapperRef}>
      {/* Category-Prioritized Search Input */}
      <div className="relative">
        <div className="flex items-center bg-[#0d111a] border border-[#1c2538] focus-within:border-cyan-500 px-3.5 py-2.5 text-xs shadow-lg">
          <Search className="w-4 h-4 text-cyan-400 mr-2.5 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (results.length > 0) setIsOpen(true);
            }}
            placeholder="SEARCH BY HAZARD CATEGORY (e.g. 'thunderstorm', 'flooding', 'heatwave', 'fog') OR PLACE NAME..."
            className="w-full bg-transparent text-slate-200 placeholder-slate-500 focus:outline-none font-mono text-xs"
          />
          {query && (
            <button 
              onClick={() => { setQuery(''); setIsOpen(false); }}
              className="text-slate-500 hover:text-slate-300 mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {loading && (
            <span className="text-[10px] text-cyan-400 font-mono animate-pulse">
              FILTERING...
            </span>
          )}
        </div>

        {/* Dropdown Results (Categorized) */}
        {isOpen && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#090d16] border border-[#1c2538] shadow-2xl z-50 max-h-80 overflow-y-auto divide-y divide-slate-800">
            <div className="p-2 bg-[#06080e] text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center justify-between">
              <span>MATCHING STATIONS & HAZARDS ({results.length})</span>
              <span className="text-cyan-400 font-mono">SORTED BY SEVERITY & POPULATION</span>
            </div>
            {results.map((p) => (
              <button
                key={p.place_id}
                onClick={() => {
                  onSelectPlace(p.place_id);
                  setIsOpen(false);
                  setQuery('');
                }}
                className={`w-full text-left p-2.5 flex items-center justify-between hover:bg-slate-800/60 transition-colors text-xs ${
                  p.place_id === currentPlaceId ? 'bg-cyan-950/40 border-l-2 border-cyan-400' : ''
                }`}
              >
                <div>
                  <div className="font-bold text-slate-200 flex items-center gap-2">
                    <span>{p.name}</span>
                    <span className="text-[10px] text-slate-400 uppercase border border-slate-700 px-1">
                      {p.type}
                    </span>
                    {getHazardBadge(p.hazard_type)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {p.district}, {p.state} {p.tehsil ? `// Tehsil: ${p.tehsil}` : ''}
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-400">
                  <div className="font-bold text-cyan-300 font-mono">
                    RISK SCORE: {p.risk_score || 45} / 100
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    POP: {Number(p.population).toLocaleString('en-IN')}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Category Hot-Filter Pills */}
      <div className="flex items-center flex-wrap gap-2 mt-2.5 text-[11px]">
        <span className="text-slate-500 font-bold uppercase mr-1">QUICK HAZARD FILTER:</span>
        <button
          onClick={() => { setQuery('thunderstorm'); }}
          className="px-2 py-0.5 bg-purple-950/40 border border-purple-500/40 hover:bg-purple-900/50 text-purple-300 font-bold transition-colors"
        >
          ⚡ Thunderstorm
        </button>
        <button
          onClick={() => { setQuery('flooding'); }}
          className="px-2 py-0.5 bg-cyan-950/40 border border-cyan-500/40 hover:bg-cyan-900/50 text-cyan-300 font-bold transition-colors"
        >
          🌊 Flooding
        </button>
        <button
          onClick={() => { setQuery('heatwave'); }}
          className="px-2 py-0.5 bg-amber-950/40 border border-amber-500/40 hover:bg-amber-900/50 text-amber-300 font-bold transition-colors"
        >
          ☀️ Heatwave
        </button>
        <button
          onClick={() => { setQuery('fog'); }}
          className="px-2 py-0.5 bg-slate-800 border border-slate-600 hover:bg-slate-700 text-slate-300 font-bold transition-colors"
        >
          🌫️ Dense Fog
        </button>
        <button
          onClick={() => { setQuery('dust storm'); }}
          className="px-2 py-0.5 bg-yellow-950/40 border border-yellow-500/40 hover:bg-yellow-900/50 text-yellow-300 font-bold transition-colors"
        >
          🌪️ Dust Storm
        </button>
      </div>
    </div>
  );
}
