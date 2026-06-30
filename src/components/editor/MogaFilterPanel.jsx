import React, { useMemo } from "react";
import { Eye, EyeOff, Layers, ZoomIn, Printer, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

// Extract unique moga numbers from chakbandi objects
function extractMogas(objects) {
  const mogas = new Set();
  for (const o of objects) {
    if (o.type === "chakbandi" && o.mogaNumber) {
      mogas.add(o.mogaNumber);
    }
    if (o.type === "mustateel" && o.mogaNumber) {
      mogas.add(o.mogaNumber);
    }
  }
  return [...mogas].sort((a, b) => {
    const na = parseInt(a), nb = parseInt(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return String(a).localeCompare(String(b));
  });
}

const GENERAL_LAYERS = [
  { id: "mustateel", label: "Khasra Boundaries", color: "#ef4444" },
  { id: "killa_numbers", label: "Killa Numbers", color: "#dc2626" },
  { id: "muraba", label: "Muraba", color: "#f97316" },
  { id: "road", label: "Roads", color: "#b45309" },
  { id: "canal", label: "Watercourses", color: "#2563eb" },
  { id: "khal", label: "Khal", color: "#3b82f6" },
  { id: "chakbandi", label: "Chakbandi Boundaries", color: "#22c55e" },
  { id: "outlet", label: "Outlets / Moga", color: "#06b6d4" },
];

export default function MogaFilterPanel({
  objects,
  layers,
  onLayerChange,
  visibleMogas,
  onMogaVisibilityChange,
  onZoomToMoga,
  onPrintMoga,
}) {
  const mogas = useMemo(() => extractMogas(objects), [objects]);
  const allVisible = mogas.every(m => visibleMogas[m] !== false);

  const handleSelectAll = () => {
    mogas.forEach(m => onMogaVisibilityChange(m, true));
  };

  const handleHideAll = () => {
    mogas.forEach(m => onMogaVisibilityChange(m, false));
  };

  const handleShowOnly = (targetMoga) => {
    mogas.forEach(m => onMogaVisibilityChange(m, m === targetMoga));
  };

  return (
    <div className="w-64 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden text-xs">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200 bg-slate-50">
        <Layers className="w-3.5 h-3.5 text-blue-600" />
        <span className="font-bold text-slate-800 font-heading tracking-wider">LAYERS & MOGA FILTER</span>
      </div>

      {/* General Layers */}
      <div className="px-2 pt-2 pb-1">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-1">General Layers</div>
        {GENERAL_LAYERS.map(layer => {
          const state = layers[layer.id] || { visible: true, locked: false };
          return (
            <div key={layer.id}
              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50 cursor-pointer"
              onClick={() => onLayerChange(layer.id, { visible: !state.visible })}
            >
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: layer.color }} />
              <span className={`flex-1 truncate font-medium ${state.visible ? "text-slate-700" : "text-slate-400 line-through"}`}>
                {layer.label}
              </span>
              {state.visible
                ? <Eye className="w-3 h-3 text-slate-400 shrink-0" />
                : <EyeOff className="w-3 h-3 text-slate-300 shrink-0" />
              }
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100 mx-2 my-1" />

      {/* Moga Filter Section */}
      <div className="px-2 pb-2">
        <div className="flex items-center justify-between px-1 mb-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Moga Filters</div>
          <div className="flex gap-1">
            <button
              className="text-[9px] text-blue-500 hover:text-blue-700 font-medium"
              onClick={handleSelectAll}
            >All</button>
            <span className="text-slate-300">|</span>
            <button
              className="text-[9px] text-slate-400 hover:text-slate-600 font-medium"
              onClick={handleHideAll}
            >None</button>
          </div>
        </div>

        {mogas.length === 0 ? (
          <div className="text-slate-400 text-[10px] px-1 py-2 italic">
            No Moga numbers assigned.<br />
            Select a Chakbandi line and set its Moga Number in properties.
          </div>
        ) : (
          <>
            {/* Show All toggle */}
            <div
              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50 cursor-pointer"
              onClick={() => allVisible ? handleHideAll() : handleSelectAll()}
            >
              {allVisible
                ? <CheckSquare className="w-3.5 h-3.5 text-green-500 shrink-0" />
                : <Square className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              }
              <span className={`flex-1 font-bold ${allVisible ? "text-slate-700" : "text-slate-400"}`}>
                Show All Mogas
              </span>
            </div>

            {/* Individual Moga rows */}
            {mogas.map(moga => {
              const visible = visibleMogas[moga] !== false;
              return (
                <div key={moga} className="flex items-center gap-1 px-1 py-0.5 rounded-lg hover:bg-slate-50 group">
                  <div
                    className="flex items-center gap-2 flex-1 cursor-pointer"
                    onClick={() => onMogaVisibilityChange(moga, !visible)}
                  >
                    {visible
                      ? <CheckSquare className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      : <Square className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    }
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span className={`font-medium ${visible ? "text-slate-700" : "text-slate-400"}`}>
                      Moga {moga}
                    </span>
                  </div>
                  {/* Per-moga actions — visible on hover */}
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      title={`Show only Moga ${moga}`}
                      className="text-[9px] bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 rounded px-1 py-0.5"
                      onClick={() => handleShowOnly(moga)}
                    >
                      Only
                    </button>
                    {onZoomToMoga && (
                      <button
                        title={`Zoom to Moga ${moga}`}
                        className="text-slate-400 hover:text-blue-500 rounded p-0.5"
                        onClick={() => onZoomToMoga(moga)}
                      >
                        <ZoomIn className="w-3 h-3" />
                      </button>
                    )}
                    {onPrintMoga && (
                      <button
                        title={`Print Moga ${moga}`}
                        className="text-slate-400 hover:text-green-600 rounded p-0.5"
                        onClick={() => onPrintMoga(moga)}
                      >
                        <Printer className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}