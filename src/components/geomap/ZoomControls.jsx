import React from "react";
import { Plus, Minus, Crosshair, MapPin, Waves, Navigation, Eye, EyeOff } from "lucide-react";

// Moga / Outlet icon — matches the Map Editor's outlet tool icon
const MogaIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="9" height="9" rx="1" />
    <path d="M12 7.5h6" />
    <path d="M15 4.5l3.5 3-3.5 3" />
  </svg>
);

export default function ZoomControls({ onZoomIn, onZoomOut, onGPS, gpsActive, onPlaceByCoords, onPlaceByCoordsLower, onEditPatch, editActive, onKhalDraw, khalDrawActive, onKhalEdit, khalEditActive, onMogaDraw, mogaDrawActive, onToggleCanals, canalsVisible }) {
  return (
    <div className="absolute top-16 left-3 z-[1000] flex flex-col items-center gap-1.5">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 flex flex-col overflow-hidden">
        <button onClick={onZoomIn} className="w-9 h-9 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors" title="Zoom In">
          <Plus className="w-4 h-4" />
        </button>
        <div className="h-px bg-slate-200" />
        <button onClick={onZoomOut} className="w-9 h-9 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors" title="Zoom Out">
          <Minus className="w-4 h-4" />
        </button>
      </div>
      <button
        onClick={onGPS}
        className={`w-9 h-9 rounded-xl shadow-xl border flex items-center justify-center transition-all ${
          gpsActive
            ? "bg-blue-500 text-white border-blue-600 animate-pulse"
            : "bg-white text-blue-600 border-slate-200 hover:bg-blue-50"
        }`}
        title="GPS Location"
      >
        <Crosshair className="w-4 h-4" />
      </button>
      {onPlaceByCoords && (
        <button
          onClick={onPlaceByCoords}
          className="w-9 h-9 rounded-xl shadow-xl border bg-white text-red-500 border-slate-200 hover:bg-red-50 flex items-center justify-center transition-all"
          title="Edit Upper-Left Corner Coordinates"
        >
          <MapPin className="w-4 h-4" />
        </button>
      )}
      {onPlaceByCoordsLower && (
        <button
          onClick={onPlaceByCoordsLower}
          className="w-9 h-9 rounded-xl shadow-xl border bg-white text-yellow-500 border-slate-200 hover:bg-yellow-50 flex items-center justify-center transition-all"
          title="Edit Lower-Left Corner Coordinates"
        >
          <MapPin className="w-4 h-4" />
        </button>
      )}
      {onKhalDraw && (
        <button
          onClick={onKhalDraw}
          className={`w-9 h-9 rounded-xl shadow-xl border flex items-center justify-center transition-all ${
            khalDrawActive
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-blue-600 border-slate-200 hover:bg-blue-50"
          }`}
          title="Draw Watercourse (Khal)"
        >
          <Waves className="w-4 h-4" />
        </button>
      )}
      {onKhalEdit && (
        <button
          onClick={onKhalEdit}
          className={`w-9 h-9 rounded-xl shadow-xl border flex items-center justify-center transition-all ${
            khalEditActive
              ? "bg-orange-600 text-white border-orange-600"
              : "bg-white text-orange-600 border-slate-200 hover:bg-orange-50"
          }`}
          title="Edit Watercourse / Moga"
        >
          <Navigation className="w-4 h-4" />
        </button>
      )}
      {onMogaDraw && (
        <button
          onClick={onMogaDraw}
          className={`w-9 h-9 rounded-xl shadow-xl border flex items-center justify-center transition-all ${
            mogaDrawActive
              ? "bg-cyan-600 text-white border-cyan-600"
              : "bg-white text-cyan-600 border-slate-200 hover:bg-cyan-50"
          }`}
          title="Draw Moga (Outlet)"
        >
          <MogaIcon className="w-4 h-4" />
        </button>
      )}
      {onToggleCanals && (
        <button
          onClick={onToggleCanals}
          className={`w-9 h-9 rounded-xl shadow-xl border flex items-center justify-center transition-all ${
            canalsVisible
              ? "bg-white text-blue-600 border-slate-200 hover:bg-blue-50"
              : "bg-slate-500 text-white border-slate-600"
          }`}
          title={canalsVisible ? "Hide Canals" : "Show Canals"}
        >
          {canalsVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}