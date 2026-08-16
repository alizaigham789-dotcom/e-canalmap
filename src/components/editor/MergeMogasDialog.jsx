import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, Network, Loader2, AlertCircle, CheckSquare, Square } from "lucide-react";

export default function MergeMogasDialog({ mapData, onMerge, onClose }) {
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(new Set());

  const { data: maps, isLoading } = useQuery({
    queryKey: ["landmaps-all"],
    queryFn: () => base44.entities.LandMap.list(),
  });

  // All mogas of the same village (including the current one) — user selects which to merge
  const villageMaps = useMemo(
    () => (maps || []).filter((m) => m.village === mapData?.village && m.drawing_data),
    [maps, mapData]
  );

  // Default: select all once maps are loaded
  const selectedSet = selected.size ? selected : new Set(villageMaps.map((m) => m.id));
  const allSelected = villageMaps.length > 0 && selectedSet.size === villageMaps.length;

  const toggle = (id) => {
    setError(null);
    setSelected((prev) => {
      const base = prev.size ? prev : new Set(villageMaps.map((m) => m.id));
      const next = new Set(base);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setError(null);
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(villageMaps.map((m) => m.id)));
  };

  const handleMerge = async () => {
    const chosen = villageMaps.filter((m) => selectedSet.has(m.id));
    if (!chosen.length) {
      setError("کم از کم ایک موگہ منتخب کریں۔");
      return;
    }
    setMerging(true);
    setError(null);
    try {
      await onMerge(chosen);
    } catch (e) {
      setError("مرج میں مسئلہ: " + (e?.message || "unknown"));
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-violet-600" />
            <span className="font-bold text-slate-800 text-sm">تمام موگہ جات کو ایک نقشے میں مرج کریں</span>
          </div>
          <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5 space-y-3">
          <p className="text-xs text-slate-500 leading-relaxed" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>
            منتخب کردہ موگہ نقشے مرج ہو کر ایک نیا موضع نقشہ بنائیں گے۔ ہر موگہ کا ڈیٹا بالکل ویسے ہی رہے گا، اور پورا موگہ ایک لےئر کی طرح move ہو گا — سنگل آبجیکٹ move نہیں ہوں گے۔
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            </div>
          ) : villageMaps.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <AlertCircle className="w-8 h-8 text-amber-400" />
              <p className="text-xs text-slate-500" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>
                اسی گاؤں کا کوئی موگہ نقشہ نہیں ملا۔
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                  Available Mogas ({villageMaps.length}) · {selectedSet.size} selected
                </span>
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-1 text-[10px] font-bold text-violet-600 hover:text-violet-700"
                >
                  {allSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  {allSelected ? "سب ہٹائیں" : "سب چنیں"}
                </button>
              </div>
              {villageMaps.map((m) => {
                const isSel = selectedSet.has(m.id);
                const isCurrent = m.id === mapData?.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => toggle(m.id)}
                    className={`w-full flex items-center gap-2 border rounded-lg px-3 py-2 text-left transition-colors ${
                      isSel ? "bg-violet-50 border-violet-300" : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {isSel ? <CheckSquare className="w-4 h-4 text-violet-600 shrink-0" /> : <Square className="w-4 h-4 text-slate-300 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-700 truncate">{m.title || "Untitled"}</p>
                      <p className="text-[10px] text-slate-400">
                        موگہ {m.moga_number || "—"} · {m.village || "—"}{isCurrent ? " (موجودہ)" : ""}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">{m.total_parcels || 0} parcels</span>
                  </button>
                );
              })}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-600" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          <Button size="sm" disabled={merging || villageMaps.length === 0 || selectedSet.size === 0} onClick={handleMerge}
            className="bg-violet-600 hover:bg-violet-500 text-white gap-1.5">
            {merging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Network className="w-3.5 h-3.5" />}
            {merging ? "نیا نقشہ بن رہا ہے…" : "نیا موضع نقشہ بنائیں"}
          </Button>
        </div>
      </div>
    </div>
  );
}