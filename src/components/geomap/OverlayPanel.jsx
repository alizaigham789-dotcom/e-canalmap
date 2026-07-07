import React, { useMemo } from "react";
import { X, MapPin, Crosshair, RotateCw, Layers, Trash2, ChevronDown } from "lucide-react";

export default function OverlayPanel({
  maps,
  selectedMapId,
  onSelectMap,
  availableMogas,
  selectedMoga,
  onSelectMoga,
  overlay,
  onPlaceMode,
  onRotationChange,
  onClear,
  mustateelAreas,
  onClose,
}) {
  const mustateels = mustateelAreas || [];
  const totalAcres = mustateels.reduce((s, m) => s + m.acres, 0);

  return (
    <div className="absolute top-14 right-3 z-[1000] w-72 bg-[#1B2A3A] rounded-xl shadow-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-10 bg-[#15212E]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold text-white tracking-wide">Moga Overlay</span>
        </div>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 space-y-2.5">
        {/* Map selector */}
        <div>
          <label className="text-[10px] text-white/50 font-semibold uppercase tracking-wide block mb-1">Select Map</label>
          <div className="relative">
            <select
              value={selectedMapId}
              onChange={(e) => onSelectMap(e.target.value)}
              className="appearance-none w-full bg-white/10 text-white text-xs font-medium px-2.5 pr-7 h-8 rounded-md border border-white/15 cursor-pointer hover:bg-white/15 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="" className="text-slate-700">— Pick a map —</option>
              {maps.map(m => (
                <option key={m.id} value={m.id} className="text-slate-700">
                  {m.title}{m.village ? ` · ${m.village}` : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-white/50 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Moga selector */}
        {availableMogas.length > 0 && (
          <div>
            <label className="text-[10px] text-white/50 font-semibold uppercase tracking-wide block mb-1">Moga Number</label>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => onSelectMoga("")}
                className={`text-[10px] px-2 py-1 rounded font-medium transition-all ${!selectedMoga ? "bg-blue-600 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
              >
                All
              </button>
              {availableMogas.map(m => (
                <button key={m}
                  onClick={() => onSelectMoga(selectedMoga === m ? "" : m)}
                  className={`text-[10px] px-2 py-1 rounded font-medium transition-all ${selectedMoga === m ? "bg-green-600 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Place / anchor controls */}
        {overlay && (
          <>
            <div className="h-px bg-white/10 my-1" />
            <button
              onClick={onPlaceMode}
              className={`w-full h-8 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${overlay.placing ? "bg-green-600 text-white animate-pulse" : "bg-blue-600 text-white hover:bg-blue-500"}`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              {overlay.placing ? "Click on map to place…" : "Reposition Anchor"}
            </button>

            {/* Rotation slider */}
            <div className="bg-white/5 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] text-white/70 font-semibold">Rotation</span>
                <span className="text-[10px] text-white font-mono ml-auto">{overlay.rotation}°</span>
              </div>
              <input
                type="range" min={-180} max={180} step={1} value={overlay.rotation}
                onChange={(e) => onRotationChange(parseInt(e.target.value))}
                className="w-full h-1 accent-blue-400 cursor-pointer"
              />
              <div className="flex gap-1 mt-1">
                <button onClick={() => onRotationChange(0)} className="text-[9px] px-1.5 py-0.5 bg-white/10 text-white/60 rounded hover:bg-white/20">Reset</button>
                <button onClick={() => onRotationChange(overlay.rotation - 15)} className="text-[9px] px-1.5 py-0.5 bg-white/10 text-white/60 rounded hover:bg-white/20">-15°</button>
                <button onClick={() => onRotationChange(overlay.rotation + 15)} className="text-[9px] px-1.5 py-0.5 bg-white/10 text-white/60 rounded hover:bg-white/20">+15°</button>
              </div>
            </div>

            {/* Mustateel list with locked areas */}
            {mustateels.length > 0 && (
              <div className="bg-white/5 rounded-lg p-2 max-h-40 overflow-y-auto">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-white/70 font-semibold">Mustateels ({mustateels.length})</span>
                  <span className="text-[10px] text-green-400 font-mono font-bold">{totalAcres.toFixed(1)} ac</span>
                </div>
                <div className="space-y-0.5">
                  {mustateels.map(m => (
                    <div key={m.id} className="flex items-center justify-between text-[10px]">
                      <span className="text-white/60 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5 text-red-400" />
                        {m.label || "—"}
                      </span>
                      <span className="text-green-400 font-mono font-bold">{m.acres.toFixed(2)} ac</span>
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-white/10 text-[9px] text-white/40 text-center">
                  ✓ Area locked to mustateel definition
                </div>
              </div>
            )}

            <button
              onClick={onClear}
              className="w-full h-8 rounded-md text-xs font-bold bg-red-600/20 text-red-400 hover:bg-red-600/30 flex items-center justify-center gap-1.5 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove Overlay
            </button>
          </>
        )}

        {!overlay && (
          <div className="text-[10px] text-white/40 text-center py-2 leading-relaxed">
            Pick a map, then click on the satellite view to place the overlay. Mustateel areas are locked to 10 acres.
          </div>
        )}
      </div>
    </div>
  );
}