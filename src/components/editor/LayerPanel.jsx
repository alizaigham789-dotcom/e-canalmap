import React from "react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Eye, EyeOff, Lock, Unlock, Layers } from "lucide-react";

const LAYER_DEFS = [
  { id: "muraba", label: "Muraba", color: "#f97316" },
  { id: "mustateel", label: "Mustateel", color: "#f59e0b" },
  { id: "acre", label: "Acre Grid", color: "#eab308" },
  { id: "canal", label: "Canals", color: "#3b82f6" },
  { id: "outlet", label: "Outlets / Moga", color: "#06b6d4" },
  { id: "grass", label: "Grass Effect", color: "#22c55e" },
];

export default function LayerPanel({ layers, onLayerChange }) {
  return (
    <div className="w-56 bg-[#0d1420] border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-700/50">
        <Layers className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-xs font-bold text-white font-heading tracking-wider">LAYERS</span>
      </div>
      <div className="p-2 space-y-0.5">
        {LAYER_DEFS.map(layer => {
          const state = layers[layer.id] || { visible: true, locked: false, opacity: 1 };
          return (
            <div key={layer.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-800/50 group">
              <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: layer.color }} />
              <span className="text-xs text-slate-300 flex-1 truncate">{layer.label}</span>
              <button
                className="text-slate-600 hover:text-slate-300 transition-colors"
                onClick={() => onLayerChange(layer.id, { locked: !state.locked })}
              >
                {state.locked
                  ? <Lock className="w-3 h-3 text-amber-400" />
                  : <Unlock className="w-3 h-3" />}
              </button>
              <button
                className="text-slate-600 hover:text-slate-300 transition-colors"
                onClick={() => onLayerChange(layer.id, { visible: !state.visible })}
              >
                {state.visible
                  ? <Eye className="w-3 h-3 text-slate-400" />
                  : <EyeOff className="w-3 h-3 text-slate-600" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}