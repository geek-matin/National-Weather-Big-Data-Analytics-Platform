import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  MapPin, 
  Clock, 
  Layers, 
  ShieldCheck, 
  AlertTriangle, 
  Radio, 
  RefreshCw,
  Zap,
  Waves,
  Sun,
  CloudFog,
  Wind,
  Compass,
  CloudRain
} from 'lucide-react';

export default function TacticalRadarMap({ activePlace, onSelectPlace }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  const [mapCategory, setMapCategory] = useState('all');
  const [incidents, setIncidents] = useState([]);
  const [systemLastUpdated, setSystemLastUpdated] = useState('');
  const [systemHumanTime, setSystemHumanTime] = useState('Updated just now');
  const [loading, setLoading] = useState(false);

  const categoryConfig = {
    all: { label: 'ALL REPORTS', icon: Layers, color: '#38bdf8', glyph: '🌐' },
    thunderstorm: { label: 'THUNDERSTORM', icon: Zap, color: '#c084fc', glyph: '⚡' },
    flooding: { label: 'FLOODING', icon: Waves, color: '#06b6d4', glyph: '🌊' },
    rainfall: { label: 'HEAVY RAIN', icon: CloudRain, color: '#60a5fa', glyph: '🌧️' },
    heatwave: { label: 'HEATWAVE', icon: Sun, color: '#fbbf24', glyph: '☀️' },
    fog: { label: 'DENSE FOG', icon: CloudFog, color: '#cbd5e1', glyph: '🌫️' },
    'dust storm': { label: 'DUST STORM', icon: Compass, color: '#f59e0b', glyph: '🌪️' },
    'strong wind': { label: 'STRONG WIND', icon: Wind, color: '#2dd4bf', glyph: '💨' }
  };

  // Fetch categorized map reports
  const fetchMapReports = async (cat = 'all') => {
    setLoading(true);
    try {
      let url = '/api/map/incidents';
      if (cat !== 'all') {
        url += `?category=${encodeURIComponent(cat)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.incidents || []);
        setSystemLastUpdated(data.system_last_updated || new Date().toLocaleString());
        setSystemHumanTime(data.system_last_updated_human || 'Updated just now');
      }
    } catch (err) {
      console.error('Error fetching map incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapReports(mapCategory);
  }, [mapCategory]);

  // Initialize and maintain Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [22.5937, 78.9629], // Geographic center of India
        zoom: 5,
        zoomControl: false,
        attributionControl: false
      });

      // Dark tactical Carto basemap
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapInstanceRef.current = map;

      // Force tile invalidation to guarantee zero grey tiles
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }

    const map = mapInstanceRef.current;
    map.invalidateSize();

    // Center map on activePlace if provided
    if (activePlace && activePlace.latitude && activePlace.longitude) {
      map.flyTo([activePlace.latitude, activePlace.longitude], 7, {
        duration: 1.0
      });
    }

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Plot all categorized incident markers on the map
    incidents.forEach((inc) => {
      const cat = inc.category?.toLowerCase() || 'rainfall';
      const conf = categoryConfig[cat] || categoryConfig.rainfall;
      const color = conf.color;
      const glyph = conf.glyph;
      const isSelected = inc.place_id === activePlace?.place_id;

      // Custom animated radar DivIcon with category glyph
      const iconHtml = `
        <div class="radar-blip" style="color: ${color}; position: relative; cursor: pointer;">
          <div class="radar-blip-pulse" style="border-color: ${color};"></div>
          <div class="radar-blip-core" style="background-color: ${color}; border-color: ${isSelected ? '#ffffff' : color}; display: flex; align-items: center; justify-content: center; font-size: 10px; width: 18px; height: 18px;">
            <span style="line-height: 1;">${glyph}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-radar-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([inc.latitude, inc.longitude], { icon: customIcon }).addTo(map);

      // Stylized Tactical Popup displaying exact timestamps and category
      const popupContent = `
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; padding: 6px; min-width: 220px; color: #e2e8f0; background: #0d111a; border: 1px solid #1c2538;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid #27354d; padding-bottom: 4px;">
            <span style="color: ${color}; font-weight: bold; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em;">
              ${glyph} ${inc.category.toUpperCase()}
            </span>
            <span style="font-size: 9px; padding: 1px 4px; background: rgba(6,182,212,0.2); border: 1px solid rgba(6,182,212,0.4); color: #38bdf8;">
              ${inc.risk_level}
            </span>
          </div>

          <div style="font-weight: bold; font-size: 13px; color: #f8fafc; margin-bottom: 2px;">
            ${inc.name}
          </div>
          <div style="font-size: 10px; color: #94a3b8; margin-bottom: 6px;">
            ${inc.district}, ${inc.state}
          </div>

          ${inc.title ? `<div style="font-size: 10px; color: #cbd5e1; margin-bottom: 6px; font-style: italic;">"${inc.title}"</div>` : ''}

          <!-- EXACT TIMESTAMP DISPLAY -->
          <div style="background: #06080e; border: 1px solid #1e293b; padding: 4px 6px; margin-bottom: 6px; font-size: 10px;">
            <div style="color: #38bdf8; font-weight: bold;">
              🕒 LAST UPDATED:
            </div>
            <div style="color: #cbd5e1; font-family: monospace;">
              ${inc.last_updated_at || 'Just now'} IST
            </div>
          </div>

          <!-- SENSOR INDICATORS -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 10px; margin-bottom: 8px; color: #94a3b8; background: #06080e; padding: 5px; border: 1px solid #1c2538;">
            ${inc.temperature_c !== null && inc.temperature_c !== undefined ? `<div>Temp: <span style="color: #fbbf24; font-weight: bold;">${typeof inc.temperature_c === 'number' ? inc.temperature_c.toFixed(1) : inc.temperature_c}°C</span></div>` : ''}
            ${inc.humidity_pct !== null && inc.humidity_pct !== undefined ? `<div>Humidity: <span style="color: #38bdf8; font-weight: bold;">${Math.round(inc.humidity_pct)}%</span></div>` : ''}
            ${inc.precipitation_mm !== null && inc.precipitation_mm !== undefined ? `<div>Precip: <span style="color: #60a5fa; font-weight: bold;">${typeof inc.precipitation_mm === 'number' ? inc.precipitation_mm.toFixed(1) : inc.precipitation_mm} mm</span></div>` : ''}
            ${inc.air_quality_index !== null && inc.air_quality_index !== undefined ? `<div>Air Quality: <span style="color: #34d399; font-weight: bold;">${inc.air_quality_index} AQI</span></div>` : ''}
            ${inc.rainfall_mm !== null && inc.rainfall_mm !== undefined ? `<div>6h Rain: <span style="color: #38bdf8; font-weight: bold;">${inc.rainfall_mm} mm</span></div>` : ''}
            <div>Risk Score: <span style="color: #f59e0b; font-weight: bold;">${inc.risk_score}/100</span></div>
          </div>

          <button 
            id="btn-inspect-${inc.place_id}" 
            style="background: #06b6d4; color: #000000; font-weight: bold; border: none; padding: 5px 8px; width: 100%; cursor: pointer; text-transform: uppercase; font-size: 10px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.05em;"
          >
            [ ↗ INSPECT FULL TELEMETRY ]
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-inspect-${inc.place_id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectPlace(inc.place_id);
          };
        }
      });

      markersRef.current.push(marker);
    });

  }, [incidents, activePlace]);

  return (
    <div className="tactical-box p-4 bg-[#0a0e17] border border-[#1e293b] w-full max-w-7xl mx-auto space-y-3">
      {/* ────────────────── TOP SYSTEM STATUS & TIME BAR ────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#1e293b] pb-3 gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
          <MapPin className="w-4 h-4" />
          <span>GEOSPATIAL RADAR // PAN-INDIA CATEGORIZED INCIDENT MAP</span>
        </div>

        {/* System Last Updated Timestamp Badge */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0e1420] border border-cyan-500/40 text-cyan-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>SYSTEM LAST UPDATED:</span>
            <span className="font-bold text-slate-100">{systemLastUpdated || '2026-09-05 05:35:35'} IST</span>
            <span className="text-[10px] text-cyan-400 font-bold ml-1">({systemHumanTime})</span>
          </div>

          <div className="px-2.5 py-1 bg-[#0e1420] border border-[#1c2538] text-slate-300">
            <span>REPORTS ON RADAR:</span> <span className="font-bold text-cyan-400">{incidents.length}</span>
          </div>
        </div>
      </div>

      {/* ────────────────── IN-MAP CATEGORY FILTER TABS ────────────────── */}
      <div className="flex items-center flex-wrap gap-1.5 text-xs bg-[#06080e] p-1.5 border border-[#1c2538]">
        <span className="text-[11px] font-bold text-slate-400 uppercase font-mono px-2">
          FILTER BY CATEGORY:
        </span>
        {Object.entries(categoryConfig).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const isSelected = mapCategory === key;
          const count = key === 'all' ? incidents.length : incidents.filter(i => i.category === key).length;

          return (
            <button
              key={key}
              onClick={() => setMapCategory(key)}
              className={`px-2.5 py-1 text-xs font-bold uppercase transition-colors flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-cyan-500 text-black border border-cyan-400'
                  : 'bg-[#0d111a] border border-[#1c2538] text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{cfg.glyph}</span>
              <span>{cfg.label}</span>
            </button>
          );
        })}
      </div>

      {/* ────────────────── LEAFLET MAP CONTAINER ────────────────── */}
      <div className="relative border border-[#1c2538] bg-[#07080c] overflow-hidden">
        <div 
          ref={mapContainerRef} 
          className="w-full h-[560px] bg-[#07080c]"
          style={{ minHeight: '560px' }}
        />

        {/* Floating Category Legend Overlay */}
        <div className="absolute bottom-4 left-4 z-[400] bg-[#090d16]/90 backdrop-blur-md border border-[#1c2538] p-2.5 text-[10px] font-mono shadow-2xl space-y-1">
          <div className="font-bold text-slate-300 uppercase mb-1 border-b border-slate-800 pb-1 flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>INCIDENT CATEGORIES</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <div className="flex items-center gap-1.5 text-purple-300">
              <span>⚡</span> <span>THUNDERSTORM</span>
            </div>
            <div className="flex items-center gap-1.5 text-cyan-300">
              <span>🌊</span> <span>FLOODING</span>
            </div>
            <div className="flex items-center gap-1.5 text-blue-300">
              <span>🌧️</span> <span>HEAVY RAIN</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-300">
              <span>☀️</span> <span>HEATWAVE</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span>🌫️</span> <span>DENSE FOG</span>
            </div>
            <div className="flex items-center gap-1.5 text-yellow-300">
              <span>🌪️</span> <span>DUST STORM</span>
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────── BOTTOM TELEMETRY FOOTER ────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
        <div>
          ACTIVE FOCUS: <span className="text-cyan-400 font-bold">{activePlace?.name || 'MUMBAI'}</span> // LAT {activePlace?.latitude?.toFixed(4)}, LON {activePlace?.longitude?.toFixed(4)}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span>CLICK ANY BLIP TO INSPECT STATION METRICS & EXACT TIMESTAMPS</span>
        </div>
      </div>
    </div>
  );
}
