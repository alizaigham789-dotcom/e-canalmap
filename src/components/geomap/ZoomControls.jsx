import React from "react";
import { Plus, Minus, Crosshair, MapPin, Pencil } from "lucide-react";

export default function ZoomControls({ onZoomIn, onZoomOut, onGPS, gpsActive, onPlaceByCoords, onPlaceByCoordsLower, onEditPatch, editActive }) {
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
      {onEditPatch && (
        <button
          onClick={onEditPatch}
          className={`w-9 h-9 rounded-xl shadow-xl border flex items-center justify-center transition-all ${
            editActive
              ? "bg-orange-600 text-white border-orange-600"
              : "bg-white text-orange-600 border-slate-200 hover:bg-orange-50"
          }`}
          title="Edit Patch"
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}