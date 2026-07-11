import React, { useState, useEffect } from "react";
import { X, MapPin, Navigation } from "lucide-react";

export default function CoordinateDialog({ open, onClose, onPlace, mouseLatLng }) {
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  // Pre-fill with current mouse position on the map when dialog opens
  useEffect(() => {
    if (open && mouseLatLng) {
      setLat(mouseLatLng.lat.toFixed(6));
      setLng(mouseLatLng.lng.toFixed(6));
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) return;
    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) return;
    onPlace({ lat: latNum, lng: lngNum });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-[340px] max-w-[90vw] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 bg-gradient-to-r from-red-500 to-orange-500">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-white" />
            <span className="text-sm font-bold text-white">Location Coordinates</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            وہ کوآرڈینیٹس درج کریں جہاں آپ نقشہ کا کونا لگنا چاہتے ہیں۔
          </p>

          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide block mb-1">
              Latitude (Lat)
            </label>
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="32.288900"
              autoFocus
              required
              className="w-full h-9 px-3 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide block mb-1">
              Longitude (Lng)
            </label>
            <input
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="72.352500"
              required
              className="w-full h-9 px-3 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400"
            />
          </div>

          <button
            type="submit"
            className="w-full h-9 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-bold flex items-center justify-center gap-1.5 hover:shadow-lg transition-all"
          >
            <MapPin className="w-4 h-4" />
            Place Map Here
          </button>
        </form>
      </div>
    </div>
  );
}