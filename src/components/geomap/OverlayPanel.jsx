import React, { useState } from "react";
import { X, Layers, Crosshair, RotateCw, MapPin, CheckCircle2, AlertCircle, Save, Loader2, Search } from "lucide-react";
import MapSelect from "@/components/geomap/MapSelect";
import SavedOverlaysList from "@/components/geomap/SavedOverlaysList";

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
  onSaveAllMogas,
  savingAllMogas,
  suggestions,
  onPlaceSuggestion,
  onClose,
}) {
  const mustateels = mustateelAreas || [];
  const totalAcres = mustateels.reduce((s, m) => s + m.acres, 0);
  const expectedAcres = mustateels.reduce((s, m) => s + m.expected, 0);
  const accuracyPct = expectedAcres > 0 ? Math.min(100, (1 - Math.abs(totalAcres - expectedAcres) / expectedAcres) * 100) : 0;

  const [mogaSearch, setMogaSearch] = useState("");
  const filteredMogas = (availableMogas || []).filter(m => String(m).includes(mogaSearch.trim()));

  return (
    <div className="absolute top-14 right-3 z-[1000] w-64 bg-[#1B2A3A] rounded-xl shadow-2xl border border-white/10 overflow-hidden">
      {/* Header — sticky so the X close button stays above the map-select dropdown */}
      <div className="flex items-center justify-between px-3 h-10 bg-[#15212E] sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold text-white tracking-wide">GIS Overlay</span>
        </div>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 space-y-2.5 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Map selector — custom searchable dropdown (replaces native select) */}
        <div>
          <label className="text-[10px] text-white/50 font-semibold uppercase tracking-wide block mb-1">Select Cadastral Map</label>
          <MapSelect maps={maps} value={selectedMapId} onChange={onSelectMap} />
        </div>

        {/* Saved (placed) overlays — grouped by mouza → moga, click to re-activate */}
        <SavedOverlaysList maps={maps} selectedMapId={selectedMapId} onSelectMap={onSelectMap} />

        {/* Moga selector */}
        {availableMogas.length > 0 && overlayReady && (
          <div>
            <label className="text-[10px] text-white/50 font-semibold uppercase tracking-wide block mb-1">Moga Filter</label>
            {availableMogas.length > 8 && (
              <div className="relative mb-1.5">
                <Search className="w-3 h-3 text-white/40 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={mogaSearch}
                  onChange={(e) => setMogaSearch(e.target.value)}
                  placeholder="Search Moga…"
                  className="w-full h-7 pr-7 pl-2 bg-white/10 text-white text-[10px] font-medium rounded-md border border-white/15 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-white/30 text-right"
                />
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => onSelectMoga("")}
                className={`text-[10px] px-2 py-1 rounded font-medium transition-all ${!selectedMoga ? "bg-blue-600 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
              >
                All
              </button>
              {filteredMogas.map(m => (
                <button key={m}
                  onClick={() => onSelectMoga(selectedMoga === m ? "" : m)}
                  className={`text-[10px] px-2 py-1 rounded font-medium transition-all ${selectedMoga === m ? "bg-green-600 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
                >
                  {m}
                </button>
              ))}
              {filteredMogas.length === 0 && (
                <span className="text-[9px] text-white/40 py-1">کوئی موگہ نہیں ملا</span>
              )}
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

            {/* Area verification — selected moga name + one-line summary + mustateel list */}
            {mustateels.length > 0 && (
              <div className="bg-white/5 rounded-lg p-2 space-y-1">
                {selectedMoga && (
                  <div className="flex items-center gap-1.5 text-[10px] text-cyan-300 font-bold pb-1 border-b border-white/10">
                    <MapPin className="w-3 h-3" />
                    موگہ {selectedMoga}
                  </div>
                )}
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-white/70 font-semibold">Area Verification</span>
                  <span className="font-mono">
                    <span className={`font-bold ${accuracyPct > 98 ? "text-green-400" : accuracyPct > 90 ? "text-yellow-400" : "text-red-400"}`}>{accuracyPct.toFixed(1)}%</span>
                    <span className="text-white/40"> · {totalAcres.toFixed(2)}/{expectedAcres.toFixed(2)} ac</span>
                  </span>
                </div>
                <div className="max-h-5 overflow-y-auto no-scrollbar space-y-0.5">
                  {mustateels.map(m => (
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
              onClick={onSaveAllMogas}
              disabled={savingAllMogas}
              className={`w-full h-8 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all bg-cyan-600/30 text-cyan-300 hover:bg-cyan-600/45 ${savingAllMogas ? "opacity-60 cursor-wait" : ""}`}
              title="تمام موگہ جات کے نقشے محفوظ کریں — صرف ڈیلیٹ سے ہٹیں گے"
            >
              {savingAllMogas ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {savingAllMogas ? "محفوظ ہو رہے ہیں…" : "تمام موگہ محفوظ کریں"}
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