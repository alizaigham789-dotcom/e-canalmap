import React from "react";
import { Slash, Pentagon, Square, MapPin, Trash2, Download, Layers } from "lucide-react";

// Pretty colorful tool palette — each tool has its own accent colour
// (matches the reference: red line, yellow polygon, green square, blue pin,
// green layer, indigo download, red eraser).
const TOOLS = [
  { id: "line", icon: Slash, label: "Measure Line", color: "text-red-500", active: "bg-red-500 text-white shadow-md shadow-red-500/40" },
  { id: "polygon", icon: Pentagon, label: "Draw Polygon", color: "text-amber-500", active: "bg-amber-500 text-white shadow-md shadow-amber-500/40" },
  { id: "rectangle", icon: Square, label: "Measure Rectangle", color: "text-emerald-500", active: "bg-emerald-500 text-white shadow-md shadow-emerald-500/40" },
  { id: "marker", icon: MapPin, label: "Place Marker", color: "text-blue-500", active: "bg-blue-500 text-white shadow-md shadow-blue-500/40" },
];

export default function DrawingToolbar({ activeTool, onToolChange, onClear, onExport, onLayerToggle, layerVisible }) {
  return (
    <div className="absolute bottom-20 right-3 z-[1000] flex flex-col items-center gap-1.5 bg-white/95 backdrop-blur rounded-2xl shadow-xl border border-slate-200 p-1.5">
      {TOOLS.map(({ id, icon: Icon, label, color, active }) => (
        <button
          key={id}
          onClick={() => onToolChange(activeTool === id ? null : id)}
          title={label}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
            activeTool === id ? active : `${color} hover:bg-slate-100`
          }`}
        >
          <Icon className="w-[18px] h-[18px]" strokeWidth={2.2} />
        </button>
      ))}
      <div className="w-7 h-px bg-slate-200 my-0.5" />
      <button
        onClick={onLayerToggle}
        title="Toggle Layers"
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
          layerVisible ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/40" : "text-emerald-500 hover:bg-emerald-50"
        }`}
      >
        <Layers className="w-[18px] h-[18px]" strokeWidth={2.2} />
      </button>
      <button
        onClick={onExport}
        title="Export / Screenshot"
        className="w-9 h-9 rounded-xl flex items-center justify-center text-indigo-500 hover:bg-indigo-50 transition-all"
      >
        <Download className="w-[18px] h-[18px]" strokeWidth={2.2} />
      </button>
      <button
        onClick={onClear}
        title="Delete All Measurements"
        className="w-9 h-9 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-50 transition-all"
      >
        <Trash2 className="w-[18px] h-[18px]" strokeWidth={2.2} />
      </button>
    </div>
  );
}