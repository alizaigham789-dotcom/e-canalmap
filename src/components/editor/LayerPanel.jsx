import React from "react";
import { Eye, EyeOff, Lock, Unlock, Layers } from "lucide-react";

const LAYER_DEFS = [
  { id: "muraba", label: "Muraba", color: "#dc2626" },
  { id: "mustateel", label: "Mustateel", color: "#dc2626" },
  { id: "acre", label: "Acre Grid", color: "#d97706" },
  { id: "canal", label: "Canals", color: "#2563eb" },
  { id: "khal", label: "Khal / Watercourse", color: "#2563eb" },
  { id: "road", label: "Roads", color: "#d97706" },
  { id: "chakbandi", label: "Chakbandi Lines", color: "#16a34a" },
  { id: "outlet", label: "Outlets / Moga", color: "#0891b2" },
  { id: "grass", label: "Tree Effect", color: "#16a34a" },
];

export default function LayerPanel({ layers, onLayerChange }) {
  return (
    <div className="w-56 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200 bg-slate-50">
        <Layers className="w-3.5 h-3.5 text-blue-600" />
        <span className="text-xs font-bold text-slate-800 font-heading tracking-wider">LAYERS</span>
      </div>
      <div className="p-2 space-y-0.5">
        {LAYER_DEFS.map(layer => {
          const state = layers[layer.id] || { visible: true, locked: false, opacity: 1 };
          return (
            <div key={layer.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 group">
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: layer.color }} />
              <span className="text-xs text-slate-700 flex-1 truncate font-medium">{layer.label}</span>
              <button
                className="text-slate-300 hover:text-slate-600 transition-colors"
                onClick={() => onLayerChange(layer.id, { locked: !state.locked })}
              >
                {state.locked ? <Lock className="w-3 h-3 text-amber-500" /> : <Unlock className="w-3 h-3" />}
              </button>
              <button
                className="text-slate-300 hover:text-slate-600 transition-colors"
                onClick={() => onLayerChange(layer.id, { visible: !state.visible })}
              >
                {state.visible ? <Eye className="w-3 h-3 text-slate-500" /> : <EyeOff className="w-3 h-3 text-slate-300" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}