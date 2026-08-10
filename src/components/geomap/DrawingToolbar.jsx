import React from "react";
import { Slash, Pentagon, Square, Circle, MapPin, Trash2, Download, Layers, Waves, Pencil } from "lucide-react";

const TOOLS = [
  { id: "line", icon: Slash, label: "Measure Line" },
  { id: "polygon", icon: Pentagon, label: "Draw Polygon" },
  { id: "rectangle", icon: Square, label: "Measure Rectangle" },
  { id: "circle", icon: Circle, label: "Measure Circle" },
  { id: "marker", icon: MapPin, label: "Place Marker" },
];

export default function DrawingToolbar({ activeTool, onToolChange, onClear, onExport, onLayerToggle, layerVisible, khalTool, onKhalToolChange }) {
  return (
    <div className="absolute bottom-20 right-3 z-[1000] flex flex-col items-center gap-1 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5">
      {TOOLS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onToolChange(activeTool === id ? null : id)}
          title={label}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
            activeTool === id
              ? "bg-blue-600 text-white"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          }`}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
      <div className="w-7 h-px bg-slate-200 my-0.5" />
      {/* Khal draw + edit tools */}
      <button
        onClick={() => onKhalToolChange(khalTool === "draw" ? null : "draw")}
        title="Draw Watercourse (Khal)"
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
          khalTool === "draw"
            ? "bg-blue-600 text-white"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        }`}
      >
        <Waves className="w-4 h-4" />
      </button>
      <button
        onClick={() => onKhalToolChange(khalTool === "edit" ? null : "edit")}
        title="Edit Watercourse (Khal)"
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
          khalTool === "edit"
            ? "bg-orange-500 text-white"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        }`}
      >
        <Pencil className="w-4 h-4" />
      </button>
      <div className="w-7 h-px bg-slate-200 my-0.5" />
      <button
        onClick={onLayerToggle}
        title="Toggle Layers"
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
          layerVisible ? "bg-emerald-500 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        }`}
      >
        <Layers className="w-4 h-4" />
      </button>
      <button
        onClick={onExport}
        title="Export / Screenshot"
        className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all"
      >
        <Download className="w-4 h-4" />
      </button>
      <button
        onClick={onClear}
        title="Delete All Measurements"
        className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}