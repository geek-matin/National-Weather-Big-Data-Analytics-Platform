import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Crosshair, Layers, Navigation } from 'lucide-react';

const CATEGORY_COLORS = {
  rainfall: '#06b6d4',
  flood: '#ef4444',
  thunderstorm: '#a855f7',
  heatwave: '#f97316',
  fog: '#94a3b8',
  dust_storm: '#eab308',
  strong_wind: '#3b82f6',
  other: '#64748b'
};

export default function TacticalMap({ events, selectedEvent, onSelectEvent }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const [coords, setCoords] = useState({ lat: 20.5937, lon: 78.9629 });
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [21.5, 80.0],
      zoom: 5,
      zoomControl: false,
      attributionControl: false
    });

    // High-contrast Tactical Dark Tile Layer (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    // Reposition zoom controls to top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Track mouse coordinates for edgy HUD crosshair readout
    map.on('mousemove', (e) => {
      setCoords({
        lat: Number(e.latlng.lat.toFixed(4)),
        lon: Number(e.latlng.lng.toFixed(4))
      });
    });

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    const filteredEvents = events.filter(e => {
      if (!e.latitude || !e.longitude) return false;
      if (activeCategoryFilter !== 'all' && e.category !== activeCategoryFilter) return false;
      return true;
    });

    filteredEvents.forEach(ev => {
      const color = CATEGORY_COLORS[ev.category] || '#64748b';
      const isSelected = selectedEvent?.id === ev.id;

      // Custom Tactical Radar Icon
      const customIcon = L.divIcon({
        className: 'radar-blip',
        html: `
          <div style="color: ${color};" class="relative flex items-center justify-center">
            <div class="radar-blip-pulse" style="color: ${color};"></div>
            <div class="w-3.5 h-3.5 rounded-none border-2 border-white" style="background-color: ${color}; box-shadow: 0 0 10px ${color};"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([ev.latitude, ev.longitude], { icon: customIcon });

      // Build popup content with media and source link
      const primaryMedia = ev.media_urls && ev.media_urls.length > 0 ? ev.media_urls[0] : null;
      const isVideo = primaryMedia && (primaryMedia.endsWith('.mp4') || primaryMedia.endsWith('.webm'));

      const popupHtml = `
        <div class="p-2.5 font-mono text-xs max-w-xs text-zinc-100">
          <div class="flex items-center justify-between border-b border-[#2d3b55] pb-1 mb-1.5">
            <span class="font-bold uppercase tracking-wider text-cyan-400">[${ev.city || 'LOCATION'}]</span>
            <span class="px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-widest" style="background-color: ${color}20; color: ${color}; border: 1px solid ${color};">
              ${ev.category}
            </span>
          </div>

          ${primaryMedia ? `
            <div class="w-full h-24 bg-black border border-[#27354d] mb-2 overflow-hidden">
              ${isVideo ? `
                <video src="${primaryMedia}" muted autoplay loop class="w-full h-full object-cover"></video>
              ` : `
                <img src="${primaryMedia}" alt="Incident" class="w-full h-full object-cover" />
              `}
            </div>
          ` : ''}

          <div class="text-zinc-300 text-[11px] leading-relaxed mb-2">
            ${ev.raw_text}
          </div>

          <div class="grid grid-cols-2 gap-1 text-[10px] border-t border-[#1c2538] py-1.5 text-zinc-400">
            <div>SOURCE: <span class="text-zinc-200">${ev.source_name ? ev.source_name.toUpperCase() : 'FEED'}</span></div>
            <div>TRUST: <span class="text-amber-400">${Math.round((ev.trust_score || 0.5) * 100)}%</span></div>
          </div>

          ${ev.source_url ? `
            <div class="pt-1 border-t border-[#1c2538] mt-1">
              <a href="${ev.source_url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center w-full py-1 bg-[#121927] hover:bg-[#192336] border border-cyan-500/60 text-cyan-300 text-[10px] uppercase font-bold tracking-wider">
                OPEN ORIGINAL SOURCE ↗
              </a>
            </div>
          ` : ''}
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => onSelectEvent(ev));
      marker.addTo(markersLayerRef.current);
    });
  }, [events, activeCategoryFilter, selectedEvent]);

  // Pan to selected event if chosen from feed
  useEffect(() => {
    if (selectedEvent?.latitude && selectedEvent?.longitude && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([selectedEvent.latitude, selectedEvent.longitude], 10, {
        duration: 1.2
      });
    }
  }, [selectedEvent]);

  return (
    <div className="relative w-full h-full min-h-[460px] bg-[#07080c] border border-[#1c2538] overflow-hidden tactical-box">
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '460px' }} />

      {/* Top Left: Category Filters HUD */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap gap-1 bg-[#090d14]/90 p-1.5 border border-[#1c2538] backdrop-blur text-[10px]">
        {['all', 'flood', 'rainfall', 'thunderstorm', 'heatwave', 'strong_wind', 'dust_storm', 'fog'].map(cat => {
          const isActive = activeCategoryFilter === cat;
          const color = cat === 'all' ? '#06b6d4' : CATEGORY_COLORS[cat];
          return (
            <button
              key={cat}
              onClick={() => setActiveCategoryFilter(cat)}
              className={`px-2 py-0.5 uppercase tracking-wider font-mono transition-all border ${
                isActive
                  ? 'bg-zinc-800 text-white font-bold'
                  : 'bg-transparent text-zinc-400 border-transparent hover:text-zinc-200'
              }`}
              style={isActive ? { borderColor: color, color: color } : {}}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Bottom Left: Tactical Map Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-[#090d14]/90 border border-[#1c2538] px-3 py-2 text-[10px] font-mono text-zinc-400 backdrop-blur hidden sm:block">
        <div className="text-zinc-200 font-bold mb-1 tracking-wider uppercase flex items-center gap-1.5">
          <Layers className="w-3 h-3 text-cyan-400" />
          <span>RADAR SIGNALS</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-red-500" />
            <span>CRITICAL FLOOD</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-cyan-400" />
            <span>MONSOON RAIN</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-purple-500" />
            <span>THUNDERSTORM</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-orange-500" />
            <span>HEATWAVE</span>
          </div>
        </div>
      </div>

      {/* Bottom Right: Live GPS Crosshair HUD */}
      <div className="absolute bottom-3 right-3 z-[1000] bg-[#090d14]/90 border border-[#1c2538] px-3 py-1.5 text-[10px] font-mono text-zinc-300 flex items-center gap-2 backdrop-blur">
        <Crosshair className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
        <span>CURSOR: {coords.lat}° N, {coords.lon}° E</span>
        <span className="text-zinc-600">|</span>
        <span className="text-emerald-400">GEO_DATUM: WGS84</span>
      </div>
    </div>
  );
}
