import React from 'react';
import { 
  Zap, 
  Waves, 
  CloudRain, 
  Sun, 
  CloudFog, 
  Wind, 
  Compass, 
  Layers
} from 'lucide-react';

export default function CategoryBar({ 
  selectedCategory, 
  onSelectCategory, 
  hazardSummary 
}) {
  const categories = [
    { id: 'all', label: 'ALL HAZARDS', icon: Layers, color: 'text-slate-200' },
    { id: 'thunderstorm', label: 'THUNDERSTORM', icon: Zap, color: 'text-purple-400' },
    { id: 'flooding', label: 'FLOODING', icon: Waves, color: 'text-cyan-400' },
    { id: 'rainfall', label: 'HEAVY RAIN', icon: CloudRain, color: 'text-blue-400' },
    { id: 'heatwave', label: 'HEATWAVE', icon: Sun, color: 'text-amber-400' },
    { id: 'fog', label: 'DENSE FOG', icon: CloudFog, color: 'text-slate-300' },
    { id: 'dust storm', label: 'DUST STORM', icon: Compass, color: 'text-yellow-500' },
    { id: 'strong wind', label: 'STRONG WIND', icon: Wind, color: 'text-teal-400' }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto mb-5">
      <div className="tactical-box p-3 bg-[#0a0e17] border border-[#1e293b]">
        <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider mb-2.5 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-cyan-400"></span>
            <span>PRIORITIZE BY DISASTER CATEGORY // PAN-INDIA INCIDENT CLASSIFIER</span>
          </div>
          <span className="text-[11px] text-cyan-400 font-mono">
            {selectedCategory === 'all' ? 'MONITORING ALL 7 CATEGORIES' : `ACTIVE CATEGORY: ${selectedCategory.toUpperCase()}`}
          </span>
        </div>

        {/* Hazard Category Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            const count = cat.id === 'all' 
              ? Object.values(hazardSummary || {}).reduce((acc, c) => acc + (c.places_count || 0), 0)
              : hazardSummary?.[cat.id]?.places_count || 0;

            const elevated = hazardSummary?.[cat.id]?.elevated_count || 0;

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`p-2 border text-left flex flex-col justify-between transition-all relative ${
                  isSelected
                    ? 'bg-cyan-950/60 border-cyan-400 text-slate-100 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                    : 'bg-[#0e1420] border-[#1c2538] text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Icon className={`w-3.5 h-3.5 ${cat.color}`} />
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 border ${
                    isSelected 
                      ? 'bg-cyan-500 text-black border-cyan-400' 
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}>
                    {count}
                  </span>
                </div>

                <div className="font-bold text-[11px] uppercase tracking-wider truncate">
                  {cat.label}
                </div>

                {elevated > 0 && (
                  <div className="mt-1 text-[9px] text-red-400 font-mono font-bold flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse"></span>
                    <span>{elevated} ELEVATED</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
