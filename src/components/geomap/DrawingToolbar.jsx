import React from "react";
import { Slash, Pentagon, Square, Circle, MapPin, Pencil, Trash2 } from "lucide-react";

const TOOLS = [
  { id: "line", icon: Slash, label: "Draw Line" },
  { id: "polygon", icon: Pentagon, label: "Draw Polygon (Mustateel)" },
  { id: "square", icon: Square, label: "Draw Rectangle" },
  { id: "circle", icon: Circle, label: "Draw Circle" },
  { id: "marker", icon: MapPin, label: "Drop Marker" },
];

export default function DrawingToolbar({ activeTool, onToolChange, onClear }) {
  return (
    <div className="absolute bottom-5 left-3 z-[1000] flex flex-col items-center gap-1 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5">
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
      <button
        onClick={() => onToolChange(activeTool === "edit" ? null : "edit")}
        title="Edit / Move"
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
          activeTool === "edit"
            ? "bg-amber-500 text-white"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        }`}
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        onClick={onClear}
        title="Delete All"
        className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}