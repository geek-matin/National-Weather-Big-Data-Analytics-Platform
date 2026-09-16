import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Upload, 
  CheckCircle2, 
  MapPin, 
  Navigation, 
  Camera, 
  Thermometer, 
  Droplets, 
  CloudRain, 
  Wind, 
  Activity, 
  Image as ImageIcon,
  Loader2,
  Trash2
} from 'lucide-react';

export default function CitizenReportModal({ isOpen, onClose, activePlace, onReportSubmitted }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [userName, setUserName] = useState('');
  const [eventType, setEventType] = useState('rainfall');
  const [mediaUrl, setMediaUrl] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  
  // Geolocation & Detected Place State
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');

  // Image File Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  // Real-Time Weather Tags for user's location
  const [liveWeather, setLiveWeather] = useState({
    temperature_c: 28.0,
    humidity_pct: 75.0,
    precipitation_mm: 0.0,
    air_quality_index: 65,
    aqi_category: 'Moderate'
  });

  const [submitting, setSubmitting] = useState(false);
  const [mlResult, setMlResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (activePlace) {
      setSelectedPlace(activePlace);
      fetchPlaceLiveMetrics(activePlace.place_id || 'in_mum_001');
    }
  }, [activePlace, isOpen]);

  // Fetch real-time weather for the active/detected place
  const fetchPlaceLiveMetrics = async (placeId) => {
    try {
      const res = await fetch(`/api/places/${placeId}/layout-telemetry`);
      if (res.ok) {
        const data = await res.json();
        const ki = data.key_indicators;
        if (ki) {
          setLiveWeather({
            temperature_c: ki.temperature?.raw_value ?? 28.0,
            humidity_pct: ki.humidity?.raw_value ?? 70.0,
            precipitation_mm: ki.precipitation?.raw_value ?? 0.0,
            air_quality_index: ki.air_quality?.raw_value ?? 65,
            aqi_category: ki.air_quality?.category ?? 'Moderate'
          });
        }
      }
    } catch (err) {
      console.error('Error fetching live metrics:', err);
    }
  };

  // 1. Auto-Detect User Location using Browser Geolocation
  const handleAutoDetectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetectingLocation(true);
    setLocationStatus('Accessing GPS sensors...');
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setUserCoords({ lat, lon });
        setLocationStatus(`GPS: ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`);

        try {
          const res = await fetch(`/api/places/nearest?lat=${lat}&lon=${lon}`);
          if (res.ok) {
            const nearestPlace = await res.json();
            setSelectedPlace(nearestPlace);
            setLocationStatus(`Detected: ${nearestPlace.name} (${nearestPlace.distance_km} km away)`);
            await fetchPlaceLiveMetrics(nearestPlace.place_id);
          } else {
            setLocationStatus(`GPS Locked: (${lat.toFixed(3)}, ${lon.toFixed(3)})`);
          }
        } catch (err) {
          console.error('Nearest place lookup error:', err);
          setLocationStatus(`GPS Locked: (${lat.toFixed(3)}, ${lon.toFixed(3)})`);
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsDetectingLocation(false);
        setError('Location permission denied or unavailable. Using default regional station.');
        setLocationStatus('');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // 2. Handle File Attachment / Image Upload
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError('Please attach a valid image (.jpg, .png, .webp) or video file.');
      return;
    }

    setSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);
    setError('');

    // Upload immediately to server
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setMediaUrl(data.media_url);
    } catch (err) {
      console.error('File upload failed, will use local preview:', err);
      // Fallback: convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaUrl(reader.result);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setImagePreview('');
    setMediaUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Please provide both incident title and field description.');
      return;
    }

    setSubmitting(true);
    setError('');
    setMlResult(null);

    try {
      const payload = {
        user_name: userName.trim() || 'Citizen Observer',
        place_id: selectedPlace?.place_id || activePlace?.place_id || 'in_mum_001',
        event_type: eventType,
        title: title.trim(),
        description: description.trim(),
        media_url: mediaUrl.trim() || null,
        source_url: sourceUrl.trim() || null,
        temperature_c: liveWeather.temperature_c,
        humidity_pct: liveWeather.humidity_pct,
        precipitation_mm: liveWeather.precipitation_mm,
        air_quality_index: liveWeather.air_quality_index,
        aqi_category: liveWeather.aqi_category,
        latitude: userCoords?.lat || selectedPlace?.latitude,
        longitude: userCoords?.lon || selectedPlace?.longitude
      };

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Submission failed');
      const data = await res.json();
      setMlResult(data);
      if (onReportSubmitted) onReportSubmitted();
    } catch (err) {
      setError('Error submitting report. Please retry.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="tactical-box w-full max-w-xl bg-[#0a0e17] border border-[#1e293b] p-5 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1 rounded hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="border-b border-[#1e293b] pb-3 mb-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm tracking-wider uppercase">
            <Camera className="w-4 h-4 text-cyan-400" />
            <span>POST WEATHER UPDATE // CITIZEN DISASTER INGESTION</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
            <span>TARGET REGION:</span>
            <span className="text-cyan-300 font-bold font-mono">
              {selectedPlace?.name || activePlace?.name || 'MUMBAI'}
            </span>
            <span className="text-slate-500">
              ({selectedPlace?.district || activePlace?.district}, {selectedPlace?.state || activePlace?.state})
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-2.5 bg-red-950/50 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {mlResult ? (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-[#0e1420] border border-[#1c2538] text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 uppercase">ML AUTHENTICITY EVALUATION:</span>
                <span className={`px-2.5 py-1 font-bold uppercase text-[11px] flex items-center gap-1.5 ${
                  mlResult.ml_evaluation.verdict === 'VERIFIED_GENUINE' 
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/50'
                    : 'bg-red-950/80 text-red-400 border border-red-500/50'
                }`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {mlResult.ml_evaluation.verdict}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <div className="bg-[#07090f] p-2 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Authenticity Score</span>
                  <span className="font-bold text-cyan-400 font-mono text-base">
                    {mlResult.ml_evaluation.authenticity_score}%
                  </span>
                </div>
                <div className="bg-[#07090f] p-2 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Detected Hazard Type</span>
                  <span className="font-bold text-slate-200 uppercase font-mono text-base">
                    {mlResult.event_category}
                  </span>
                </div>
              </div>

              {/* Tagged Live Meteorological Telemetry */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1.5 font-mono">
                  ATTACHED REAL-TIME METEOROLOGICAL TELEMETRY:
                </span>
                <div className="grid grid-cols-4 gap-1.5 text-[11px] font-mono">
                  <div className="bg-[#06080e] p-1.5 border border-slate-800 text-center">
                    <span className="text-slate-500 block text-[9px]">TEMP</span>
                    <span className="text-amber-300 font-bold">{mlResult.weather_telemetry?.temperature_c?.toFixed(1)}°C</span>
                  </div>
                  <div className="bg-[#06080e] p-1.5 border border-slate-800 text-center">
                    <span className="text-slate-500 block text-[9px]">HUMIDITY</span>
                    <span className="text-cyan-300 font-bold">{Math.round(mlResult.weather_telemetry?.humidity_pct)}%</span>
                  </div>
                  <div className="bg-[#06080e] p-1.5 border border-slate-800 text-center">
                    <span className="text-slate-500 block text-[9px]">PRECIP</span>
                    <span className="text-cyan-300 font-bold">{mlResult.weather_telemetry?.precipitation_mm?.toFixed(1)} mm</span>
                  </div>
                  <div className="bg-[#06080e] p-1.5 border border-slate-800 text-center">
                    <span className="text-slate-500 block text-[9px]">AIR QUAL</span>
                    <span className="text-emerald-400 font-bold">{mlResult.weather_telemetry?.air_quality_index} AQI</span>
                  </div>
                </div>
              </div>

              {mlResult.ml_evaluation.anomaly_flags.length > 0 && (
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                    PIPELINE TELEMETRY FLAGS:
                  </span>
                  <div className="space-y-1">
                    {mlResult.ml_evaluation.anomaly_flags.map((flag, idx) => (
                      <div key={idx} className="text-[10px] text-amber-400 font-mono bg-amber-950/20 px-2 py-0.5 border border-amber-500/20">
                        {flag}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setMlResult(null);
                  setTitle('');
                  setDescription('');
                  removeSelectedFile();
                  onClose();
                }}
                className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider"
              >
                Done & View on Feed
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {/* 1. AUTO-DETECT LOCATION BAR */}
            <div className="p-2.5 bg-[#0e1420] border border-[#1c2538] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <div className="text-[11px] font-bold text-slate-200">
                    Location: <span className="text-cyan-300">{selectedPlace?.name || 'Current Region'}</span>
                  </div>
                  {locationStatus && (
                    <div className="text-[10px] text-slate-400 font-mono">{locationStatus}</div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleAutoDetectLocation}
                disabled={isDetectingLocation}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold font-mono transition-colors shrink-0 disabled:opacity-50"
              >
                {isDetectingLocation ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                )}
                <span>AUTO-DETECT MY LOCATION</span>
              </button>
            </div>

            {/* 2. LIVE WEATHER SENSOR TAGS (Precipitation, Humidity, AQI, Temp) */}
            <div className="bg-[#07090f] p-2.5 border border-[#1c2538]">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>REAL-TIME METEOROLOGICAL TELEMETRY TAGGED TO POST:</span>
                <span className="text-emerald-400 font-mono text-[9px] animate-pulse">● LIVE SENSORS ACTIVE</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-[#0e1420] p-1.5 border border-slate-800 flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="text-[9px] text-slate-500 block">TEMP</span>
                    <span className="font-bold text-slate-200 font-mono text-xs">{liveWeather.temperature_c.toFixed(1)}°C</span>
                  </div>
                </div>

                <div className="bg-[#0e1420] p-1.5 border border-slate-800 flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-cyan-400" />
                  <div>
                    <span className="text-[9px] text-slate-500 block">HUMIDITY</span>
                    <span className="font-bold text-slate-200 font-mono text-xs">{Math.round(liveWeather.humidity_pct)}%</span>
                  </div>
                </div>

                <div className="bg-[#0e1420] p-1.5 border border-slate-800 flex items-center gap-2">
                  <CloudRain className="w-4 h-4 text-blue-400" />
                  <div>
                    <span className="text-[9px] text-slate-500 block">PRECIP</span>
                    <span className="font-bold text-slate-200 font-mono text-xs">{liveWeather.precipitation_mm.toFixed(1)} mm</span>
                  </div>
                </div>

                <div className="bg-[#0e1420] p-1.5 border border-slate-800 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-[9px] text-slate-500 block">AIR QUALITY</span>
                    <span className="font-bold text-emerald-400 font-mono text-xs">{liveWeather.air_quality_index} AQI</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reporter Name & Hazard Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold uppercase text-[11px]">
                  Reporter Name / Volunteer Call-Sign
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Inspector Deshmukh / Citizen Observer"
                  className="w-full bg-[#0e1420] border border-[#1c2538] text-slate-200 p-2 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold uppercase text-[11px]">
                  Weather / Hazard Category
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full bg-[#0e1420] border border-[#1c2538] text-slate-200 p-2 focus:outline-none focus:border-cyan-500 font-mono text-xs uppercase"
                >
                  <option value="rainfall">🌧️ Heavy Rainfall</option>
                  <option value="flooding">🌊 Urban Flooding / Waterlogging</option>
                  <option value="thunderstorm">⚡ Severe Thunderstorm & Lightning</option>
                  <option value="heatwave">☀️ Extreme Heatwave</option>
                  <option value="fog">🌫️ Dense Fog Wave</option>
                  <option value="dust storm">🌪️ Dust Storm / Sand Gale</option>
                  <option value="strong wind">💨 High Velocity Gale Wind</option>
                </select>
              </div>
            </div>

            {/* Incident Title */}
            <div>
              <label className="block text-slate-400 mb-1 font-semibold uppercase text-[11px]">
                Incident Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Severe waterlogging at Dadar TT Circle & Mithi River Rise"
                className="w-full bg-[#0e1420] border border-[#1c2538] text-slate-200 p-2 focus:outline-none focus:border-cyan-500 font-mono text-xs"
              />
            </div>

            {/* Field Description */}
            <div>
              <label className="block text-slate-400 mb-1 font-semibold uppercase text-[11px]">
                Detailed Field Observations & Description *
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe weather severity, water depth, traffic blockage, affected roads, rate of precipitation..."
                className="w-full bg-[#0e1420] border border-[#1c2538] text-slate-200 p-2 focus:outline-none focus:border-cyan-500 font-mono text-xs resize-none"
              />
            </div>

            {/* 3. DIRECT IMAGE FILE ATTACHMENT & PREVIEW */}
            <div>
              <label className="block text-slate-400 mb-1 font-semibold uppercase text-[11px]">
                Attach Photo Evidence (Upload from Device or Drag & Drop)
              </label>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,video/mp4"
                className="hidden"
              />

              {imagePreview ? (
                <div className="relative border border-[#1c2538] bg-[#07090f] p-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-14 h-14 object-cover border border-slate-700"
                    />
                    <div>
                      <span className="text-xs text-slate-200 font-medium block truncate max-w-[200px]">
                        {selectedFile?.name || 'Attached Photo'}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {isUploadingImage ? 'UPLOADING...' : 'IMAGE READY'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={removeSelectedFile}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded transition-colors"
                    title="Remove Photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-slate-700 hover:border-cyan-500/80 bg-[#0e1420]/60 p-4 text-center cursor-pointer transition-colors group"
                >
                  <Upload className="w-6 h-6 text-slate-400 group-hover:text-cyan-400 mx-auto mb-1.5 transition-colors" />
                  <span className="text-xs text-slate-300 font-semibold block">
                    Click to browse or drop weather photo
                  </span>
                  <span className="text-[10px] text-slate-500 block font-mono mt-0.5">
                    JPG, PNG, WebP or MP4 (Max 25MB)
                  </span>
                </div>
              )}
            </div>

            {/* Optional URL input fallback */}
            <div>
              <label className="block text-slate-500 mb-1 text-[10px] font-mono">
                OR PASTE DIRECT MEDIA URL (OPTIONAL)
              </label>
              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => {
                  setMediaUrl(e.target.value);
                  if (e.target.value) setImagePreview(e.target.value);
                }}
                placeholder="https://... (photo or .mp4 link)"
                className="w-full bg-[#0e1420] border border-[#1c2538] text-slate-400 p-1.5 focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
              />
            </div>

            {/* Submit Actions */}
            <div className="pt-3 flex items-center justify-between border-t border-[#1e293b]">
              <span className="text-[10px] text-slate-500 font-mono">
                ML fake-detection & sensor consensus active.
              </span>
              <button
                type="submit"
                disabled={submitting || isUploadingImage}
                className="px-5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-red-900/20"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>EVALUATING & POSTING...</span>
                  </>
                ) : (
                  <span>POST WEATHER UPDATE</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

