import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { mergeMogasInCanvas } from "@/lib/mogaMerge";
import { Button } from "@/components/ui/button";
import { X, Network, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function MergeMogasDialog({ mapData, currentObjects, onMerge, onClose }) {
  const [merging, setMerging] = useState(false);
  const [result, setResult] = useState(null);

  const { data: maps, isLoading } = useQuery({
    queryKey: ["landmaps-all"],
    queryFn: () => base44.entities.LandMap.list(),
  });

  const villageMaps = (maps || []).filter(
    (m) => m.village === mapData?.village && m.id !== mapData?.id && m.drawing_data
  );

  const handleMerge = () => {
    setMerging(true);
    try {
      const { objects, details } = mergeMogasInCanvas(currentObjects, villageMaps, mapData.id);
      if (!details.length) {
        setResult({ error: "کوئی میچنگ مستطیل نمبر نہیں ملا۔ پہلے مستطیل نمبر درج کریں۔" });
      } else {
        onMerge(objects);
        setResult({ details });
      }
    } catch (e) {
      setResult({ error: "مرج میں مسئلہ: " + (e.message || "unknown") });
    }
    setMerging(false);
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
            یہ فیچر اسی گاؤں کے تمام موگہ نقشوں کو مستطیل (خسرہ) نمبروں کی بنیاد پر ایک بڑے نقشے میں مرج کر دیتا ہے۔ موجودہ نقشہ بنیاد کے طور پر استعمال ہوگا۔
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            </div>
          ) : villageMaps.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <AlertCircle className="w-8 h-8 text-amber-400" />
              <p className="text-xs text-slate-500" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>
                اسی گاؤں کا کوئی اور موگہ نقشہ نہیں ملا۔
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Available Mogas ({villageMaps.length})</span>
              {villageMaps.map((m) => (
                <div key={m.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">{m.title || "Untitled"}</p>
                    <p className="text-[10px] text-slate-400">موگہ {m.moga_number || "—"} · {m.village || "—"}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{m.total_parcels || 0} parcels</span>
                </div>
              ))}
            </div>
          )}

          {result?.error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-600" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>{result.error}</p>
            </div>
          )}

          {result?.details && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-bold">{result.details.length} mogas merged</span>
              </div>
              {result.details.map((d, i) => (
                <div key={i} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                  <span className="text-[11px] text-slate-700">{d.mapTitle}</span>
                  <span className="text-[10px] text-green-600 font-mono">{d.method} · #{d.matchedLabel}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          <Button size="sm" disabled={merging || villageMaps.length === 0 || !!result?.details} onClick={handleMerge}
            className="bg-violet-600 hover:bg-violet-500 text-white gap-1.5">
            {merging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Network className="w-3.5 h-3.5" />}
            {merging ? "مرج ہو رہا ہے…" : "مرج کریں"}
          </Button>
        </div>
      </div>
    </div>
  );
}