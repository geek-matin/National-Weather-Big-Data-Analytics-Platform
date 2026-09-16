import React, { useState } from 'react';
import { X, Navigation, Send, Camera, CheckCircle, AlertTriangle } from 'lucide-react';

export default function CitizenReportModal({ isOpen, onClose, onSubmitReport }) {
  const [formData, setFormData] = useState({
    reporter_name: '',
    raw_text: '',
    category: 'rainfall',
    city: '',
    state: '',
    latitude: '',
    longitude: '',
    photo_url: ''
  });
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    setErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setFormData(prev => ({
          ...prev,
          latitude: Number(pos.coords.latitude.toFixed(5)),
          longitude: Number(pos.coords.longitude.toFixed(5))
        }));
      },
      (err) => {
        setIsLocating(false);
        setErrorMsg('Unable to retrieve location. Please check browser permissions.');
      },
      { timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.raw_text.trim()) {
      setErrorMsg('Incident description is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await onSubmitReport({
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null
      });
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        onClose();
        setFormData({
          reporter_name: '',
          raw_text: '',
          category: 'rainfall',
          city: '',
          state: '',
          latitude: '',
          longitude: '',
          photo_url: ''
        });
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || 'Submission failed. Please verify connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#0b0f17] border border-[#2d3b55] w-full max-w-lg p-5 shadow-2xl relative tactical-box text-zinc-100 font-mono">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#1c2538] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold">⚡</span>
            <span className="text-sm font-bold tracking-wider uppercase">
              SUBMIT CITIZEN CRISIS TELEMETRY
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitSuccess ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <div className="text-sm font-bold text-emerald-400 tracking-wider uppercase">
              INCIDENT DISPATCHED TO IMD STREAMING BUS
            </div>
            <p className="text-xs text-zinc-400">
              Your field report has been queued for real-time ML verification and deduplication.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {errorMsg && (
              <div className="p-2 bg-red-950/60 border border-red-500/60 text-red-300 text-[11px] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Reporter Name & Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-zinc-400 tracking-wider mb-1 uppercase">
                  REPORTER IDENTIFIER (OR ANONYMOUS)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Citizen Ward 12"
                  value={formData.reporter_name}
                  onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                  className="w-full bg-[#121824] border border-[#202b3f] px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 tracking-wider mb-1 uppercase">
                  DISASTER CATEGORY
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-[#121824] border border-[#202b3f] px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-cyan-500 uppercase font-mono"
                >
                  <option value="rainfall">RAINFALL / MONSOON</option>
                  <option value="flood">FLOOD / WATERLOGGING</option>
                  <option value="thunderstorm">THUNDERSTORM / LIGHTNING</option>
                  <option value="heatwave">HEATWAVE / EXTREME TEMP</option>
                  <option value="strong_wind">CYCLONE / STRONG WIND</option>
                  <option value="dust_storm">DUST STORM</option>
                  <option value="fog">DENSE FOG / SMOG</option>
                  <option value="other">OTHER INCIDENT</option>
                </select>
              </div>
            </div>

            {/* Incident Description */}
            <div>
              <label className="block text-[10px] text-zinc-400 tracking-wider mb-1 uppercase">
                INCIDENT DESCRIPTION & OBSERVED CONDITIONS *
              </label>
              <textarea
                rows={3}
                placeholder="State exact observations, water levels, road blocks, fallen trees... (Include #IMD tags if applicable)"
                value={formData.raw_text}
                onChange={(e) => setFormData({ ...formData, raw_text: e.target.value })}
                className="w-full bg-[#121824] border border-[#202b3f] p-2.5 text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono text-xs leading-relaxed"
                required
              />
            </div>

            {/* Geolocation Section */}
            <div className="bg-[#0d131f] border border-[#1c263a] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider">
                  GEOSPATIAL COORDINATES
                </span>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isLocating}
                  className="flex items-center gap-1 px-2 py-0.5 bg-cyan-950 border border-cyan-500 text-cyan-300 hover:bg-cyan-900 transition-all text-[10px] uppercase font-bold"
                >
                  <Navigation className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? 'LOCKING GPS...' : 'LOCK GPS NOW'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Latitude (e.g. 19.0760)"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full bg-[#121824] border border-[#202b3f] px-2.5 py-1 text-zinc-200 focus:outline-none focus:border-cyan-500 text-[11px]"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Longitude (e.g. 72.8777)"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full bg-[#121824] border border-[#202b3f] px-2.5 py-1 text-zinc-200 focus:outline-none focus:border-cyan-500 text-[11px]"
                  />
                </div>
              </div>
            </div>

            {/* Photo Attachment URL */}
            <div>
              <label className="block text-[10px] text-zinc-400 tracking-wider mb-1 uppercase">
                PHOTO EVIDENCE URL (OPTIONAL - INCREASES TRUST SCORE)
              </label>
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-zinc-500 shrink-0" />
                <input
                  type="url"
                  placeholder="https://... (Image link of the incident scene)"
                  value={formData.photo_url}
                  onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                  className="w-full bg-[#121824] border border-[#202b3f] px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2 border-t border-[#1c2538] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 border border-zinc-700 text-zinc-400 hover:text-zinc-200 uppercase tracking-wider text-xs"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold uppercase tracking-wider transition-all disabled:opacity-50 text-xs shadow-tactical-glow-green"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'DISPATCHING...' : 'TRANSMIT REPORT'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
