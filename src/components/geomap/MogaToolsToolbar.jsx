import React from "react";
import { Hand, Move } from "lucide-react";

// Small toolbar with Hand (pan) and Move (drag placed mogas) tools.
export default function MogaToolsToolbar({ moveTool, onToggleMove, onHand }) {
  return (
    <div className="absolute bottom-20 left-3 z-[1000] flex flex-col gap-1 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5">
      <button
        onClick={onHand}
        title="Hand (Pan)"
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
          !moveTool ? "bg-emerald-500 text-white" : "text-slate-500 hover:bg-slate-100"
        }`}
      >
        <Hand className="w-4 h-4" />
      </button>
      <button
        onClick={onToggleMove}
        title="Move Moga (Drag to reposition)"
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
          moveTool ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"
        }`}
      >
        <Move className="w-4 h-4" />
      </button>
    </div>
  );
}