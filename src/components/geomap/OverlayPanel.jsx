import React from "react";
import { X, Layers, Crosshair, RotateCw, MapPin, CheckCircle2, AlertCircle, Save, Loader2, Network } from "lucide-react";

export default function OverlayPanel({
  maps,
  selectedMapId,
  onSelectMap,
  availableMogas,
  selectedMoga,
  onSelectMoga,
  placing,
  overlayReady,
  overlay,
  onRotationChange,
  onRePlace,
  onClear,
  onSave,
  saving,
  saved,
  mustateelAreas,
  onEditLowerCorner,
  onAutoArrange,
  arranging,
  villageMogaCount,
  onClose,
}) {
  const mustateels = mustateelAreas || [];
  const totalAcres = mustateels.reduce((s, m) => s + m.acres, 0);
  const expectedAcres = mustateels.reduce((s, m) => s + m.expected, 0);
  const accuracyPct = expectedAcres > 0 ? Math.min(100, (1 - Math.abs(totalAcres - expectedAcres) / expectedAcres) * 100) : 0;

  return (
    <div className="absolute top-14 right-3 z-[1000] w-72 bg-[#1B2A3A] rounded-xl shadow-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-10 bg-[#15212E]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold text-white tracking-wide">GIS Overlay</span>
        </div>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 space-y-2.5 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Map selector */}
        <div>
          <label className="text-[10px] text-white/50 font-semibold uppercase tracking-wide block mb-1">Select Cadastral Map</label>
          <select
            value={selectedMapId}
            onChange={(e) => onSelectMap(e.target.value)}
            className="w-full bg-white/10 text-white text-xs font-medium px-2.5 h-8 rounded-md border border-white/15 cursor-pointer hover:bg-white/15 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="" className="text-slate-700">— Pick a map —</option>
            {maps.map(m => (
              <option key={m.id} value={m.id} className="text-slate-700">
                {m.title}{m.village ? ` · ${m.village}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Moga selector */}
        {availableMogas.length > 0 && overlayReady && (
          <div>
            <label className="text-[10px] text-white/50 font-semibold uppercase tracking-wide block mb-1">Moga Filter</label>
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

        {/* One-click placement */}
        {selectedMapId && !overlayReady && (
          <div className="bg-white/5 rounded-lg p-2.5 space-y-2">
            <div className="flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] text-white/70 font-semibold">Place Upper-Left Corner</span>
            </div>
            <p className="text-[9px] text-white/40 leading-relaxed">
              {placing
                ? "نقشہ پر کلک کریں — ہر مستطیل بالکل 10 ایکڑ کا رقبہ ڈھانپے گا۔"
                : "Click once on the satellite to anchor the upper-left corner. Scale is fixed so one mustateel = exactly 10 acres."}
            </p>
            {placing && (
              <div className="flex items-center gap-1.5 text-blue-300 text-[10px] font-bold animate-pulse">
                <Crosshair className="w-3.5 h-3.5" />
                Click on map to place…
              </div>
            )}
          </div>
        )}

        {/* Overlay status & controls */}
        {overlayReady && overlay && (
          <>
            <div className="h-px bg-white/10 my-1" />
            <div className="flex items-center gap-1.5 text-green-400 text-[10px] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Overlay Active — Auto-Georeferenced
            </div>

            {/* Fine rotation adjustment */}
            <div className="bg-white/5 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] text-white/70 font-semibold">Fine Rotation</span>
                <span className="text-[10px] text-white font-mono ml-auto">{overlay.rotation}°</span>
              </div>
              <input
                type="range" min={-180} max={180} step={1} value={overlay.rotation}
                onChange={(e) => onRotationChange(parseInt(e.target.value))}
                className="w-full h-1 accent-blue-400 cursor-pointer"
              />
              <div className="flex gap-1 mt-1">
                <button onClick={() => onRotationChange(0)} className="text-[9px] px-1.5 py-0.5 bg-white/10 text-white/60 rounded hover:bg-white/20">Reset</button>
                <button onClick={() => onRotationChange(overlay.rotation - 1)} className="text-[9px] px-1.5 py-0.5 bg-white/10 text-white/60 rounded hover:bg-white/20">-1°</button>
                <button onClick={() => onRotationChange(overlay.rotation + 1)} className="text-[9px] px-1.5 py-0.5 bg-white/10 text-white/60 rounded hover:bg-white/20">+1°</button>
              </div>
            </div>

            {/* Area verification */}
            {mustateels.length > 0 && (
              <div className="bg-white/5 rounded-lg p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-white/70 font-semibold">Area Verification</span>
                  <span className={`text-[10px] font-mono font-bold ${accuracyPct > 98 ? "text-green-400" : accuracyPct > 90 ? "text-yellow-400" : "text-red-400"}`}>
                    {accuracyPct.toFixed(1)}% match
                  </span>
                </div>
                <div className="space-y-0.5">
                  {mustateels.slice(0, 8).map(m => (
                    <div key={m.id} className="flex items-center justify-between text-[10px]">
                      <span className="text-white/60 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5 text-red-400" />
                        {m.label || "—"}
                      </span>
                      <span className="font-mono">
                        <span className="text-green-400">{m.acres.toFixed(2)}</span>
                        <span className="text-white/30"> / {m.expected.toFixed(2)} ac</span>
                      </span>
                    </div>
                  ))}
                  {mustateels.length > 8 && (
                    <div className="text-[9px] text-white/40 text-center pt-0.5">+{mustateels.length - 8} more</div>
                  )}
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-white/10 flex justify-between text-[9px]">
                  <span className="text-white/50">Total: {totalAcres.toFixed(2)} ac</span>
                  <span className="text-white/50">Expected: {expectedAcres.toFixed(2)} ac</span>
                </div>
              </div>
            )}

            <button
              onClick={onSave}
              disabled={saving}
              className={`w-full h-8 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${saved ? "bg-green-600/20 text-green-300" : "bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/40"} ${saving ? "opacity-60 cursor-wait" : ""}`}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? "Saving…" : saved ? "Saved" : "Save Placement"}
            </button>
            <button
              onClick={onAutoArrange}
              disabled={arranging}
              className={`w-full h-8 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all bg-violet-600/30 text-violet-300 hover:bg-violet-600/45 ${arranging ? "opacity-60 cursor-wait" : ""}`}
              title="تمام موگہ جات کو مستطیل نمبر کے مطابق خودبخود ایک نقشے میں ترتیب دیں"
            >
              {arranging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Network className="w-3.5 h-3.5" />}
              {arranging ? "آرینج ہو رہا ہے…" : "آٹو آرینج موگہ"}
            </button>
            {villageMogaCount > 0 && (
              <p className="text-[9px] text-white/40 text-center -mt-1">
                {villageMogaCount} اور موگہ اسی گاؤں کے آرینج ہوں گے
              </p>
            )}
            <button
              onClick={onEditLowerCorner}
              className="w-full h-8 rounded-md text-xs font-bold bg-green-600/20 text-green-300 hover:bg-green-600/30 flex items-center justify-center gap-1.5 transition-all"
            >
              <Crosshair className="w-3.5 h-3.5" />
              Edit Lower Corner (Manual)
            </button>
            <button
              onClick={onRePlace}
              className="w-full h-8 rounded-md text-xs font-bold bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 flex items-center justify-center gap-1.5 transition-all"
            >
              <Crosshair className="w-3.5 h-3.5" />
              Re-place Corner
            </button>
            <button
              onClick={onClear}
              className="w-full h-8 rounded-md text-xs font-bold bg-red-600/20 text-red-400 hover:bg-red-600/30 flex items-center justify-center gap-1.5 transition-all"
            >
              <X className="w-3.5 h-3.5" />
              Remove Overlay
            </button>
          </>
        )}

        {!selectedMapId && (
          <div className="text-[10px] text-white/40 text-center py-2 leading-relaxed">
            Select a cadastral map to begin auto-georeferencing.
          </div>
        )}
      </div>
    </div>
  );
}