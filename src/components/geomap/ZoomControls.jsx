import React from "react";
import { Plus, Minus, Crosshair, Search } from "lucide-react";

export default function ZoomControls({ onZoomIn, onZoomOut, onCenter, onSearch }) {
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
      <button onClick={onCenter} className="w-9 h-9 bg-white rounded-xl shadow-xl border border-slate-200 flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors" title="Center / Locate Me">
        <Crosshair className="w-4 h-4" />
      </button>
      <button onClick={onSearch} className="w-9 h-9 bg-white rounded-xl shadow-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors" title="Search">
        <Search className="w-4 h-4" />
      </button>
    </div>
  );
}