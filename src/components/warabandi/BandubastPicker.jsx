import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { X, Loader2 } from "lucide-react";
import { loadDrawingData } from "@/lib/drawingDataStorage";
import { parcelKillaCells } from "@/lib/allocationEngine";

// Parse a bandubast value string into a Set of "mustNo/acre" tokens.
// Supports "87/3", "87/(3-4)", comma/space separated.
function parseSelection(value) {
  const set = new Set();
  if (!value) return set;
  const tokens = String(value).split(/[,،\s]+/).filter(Boolean);
  for (const t of tokens) {
    const m = t.match(/(\d+)\s*\/\s*\(?(\d+)(?:\s*-\s*(\d+))?\)?/);
    if (m) {
      const must = m[1];
      const start = parseInt(m[2], 10);
      const end = m[3] ? parseInt(m[3], 10) : start;
      for (let a = start; a <= end; a++) set.add(`${must}/${a}`);
    }
  }
  return set;
}

// Build a compact display string from a selection set, grouping consecutive
// acres per mustateel into ranges (e.g. "87/3-4, 92/1").
function buildValue(selection) {
  const byMust = new Map();
  for (const tok of selection) {
    const [must, acre] = tok.split("/");
    if (!byMust.has(must)) byMust.set(must, []);
    byMust.get(must).push(parseInt(acre, 10));
  }
  const parts = [];
  for (const [must, acres] of byMust) {
    acres.sort((a, b) => a - b);
    const groups = [];
    for (const a of acres) {
      const last = groups[groups.length - 1];
      if (last && last.end === a - 1) last.end = a;
      else groups.push({ start: a, end: a });
    }
    for (const g of groups) {
      parts.push(g.start === g.end ? `${must}/${g.start}` : `${must}/${g.start}-${g.end}`);
    }
  }
  return parts.join(", ");
}

// کھسہ وائز ایکڑ سلیکشن پکر — منتخب موگہ کے مستطیل کے ایکڑ سیلز
// ٹوگل کرتا ہے اور مانول انٹری بھی اجازت دیتا ہے۔ صرف منتخب موگہ
// (mogaNumber) کے مستطیل ہی دکھائی دیتے ہیں۔
export default function BandubastPicker({ open, value, onChange, mogaNumber, mapId, onClose }) {
  const { data: mapData, isLoading } = useQuery({
    queryKey: ["bandubast-map", mapId],
    queryFn: () => base44.entities.LandMap.filter({ id: mapId }).then((r) => r[0]),
    enabled: !!mapId && open,
  });

  const [objects, setObjects] = useState([]);
  const [loadingObjs, setLoadingObjs] = useState(false);
  const [draft, setDraft] = useState(value || "");

  useEffect(() => {
    let alive = true;
    if (open && mapData?.drawing_data) {
      setLoadingObjs(true);
      loadDrawingData(mapData.drawing_data)
        .then((objs) => { if (alive) { setObjects(objs || []); setLoadingObjs(false); } })
        .catch(() => { if (alive) setLoadingObjs(false); });
    } else if (open) {
      setObjects([]);
    }
    return () => { alive = false; };
  }, [open, mapData]);

  useEffect(() => { if (open) setDraft(value || ""); }, [open, value]);

  const mustateels = useMemo(() => {
    // اگر نقشے میں mogaNumber ٹیگز موجود ہوں تو صرف منتخب موگہ کے مستطیل
    // دکھائیں؛ ورنہ (singl-moga map) سب دکھائیں۔
    const hasMogaTag = objects.some((o) => o.type === "mustateel" && o.mogaNumber);
    return objects
      .filter(
        (o) =>
          o.type === "mustateel" &&
          o.label &&
          (!hasMogaTag || !mogaNumber || String(o.mogaNumber) === String(mogaNumber))
      )
      .map((o) => ({ mustNo: String(o.label).trim(), acreCount: Math.max(1, parcelKillaCells(o).length) }))
      .sort((a, b) => +a.mustNo - +b.mustNo);
  }, [objects, mogaNumber]);

  const selection = useMemo(() => parseSelection(draft), [draft]);

  const toggle = (mustNo, acre) => {
    const tok = `${mustNo}/${acre}`;
    const next = new Set(selection);
    if (next.has(tok)) next.delete(tok);
    else next.add(tok);
    setDraft(buildValue(next));
  };

  const toggleAll = (m) => {
    const allSelected = Array.from({ length: m.acreCount }, (_, k) => k + 1).every((a) => selection.has(`${m.mustNo}/${a}`));
    const next = new Set(selection);
    for (let a = 1; a <= m.acreCount; a++) {
      const tok = `${m.mustNo}/${a}`;
      if (allSelected) next.delete(tok);
      else next.add(tok);
    }
    setDraft(buildValue(next));
  };

  if (!open) return null;

  const apply = () => { onChange(draft); onClose(); };

  return (
    <div className="fixed inset-0 z-[1150] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 h-11 bg-gradient-to-r from-emerald-600 to-green-600 text-white shrink-0">
          <span className="text-sm font-bold" dir="rtl" style={{ fontFamily: "serif" }}>
            نمبران بندوبست{mogaNumber ? ` — موگہ ${mogaNumber}` : ""}
          </span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/20">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 space-y-3 overflow-y-auto">
          {/* Manual entry */}
          <div>
            <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1" dir="rtl" style={{ fontFamily: "serif" }}>
              مانول انٹری (khasra)
            </label>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              dir="ltr"
              placeholder="87/3, 87/4-5"
              className="w-full h-8 text-xs px-2 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-400 font-mono"
            />
          </div>

          {loadingObjs || isLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : mustateels.length === 0 ? (
            <div className="text-center py-6 text-[11px] text-slate-400" dir="rtl" style={{ fontFamily: "serif" }}>
              {mapId ? "اس موگہ کا نقشہ ڈیٹا دستیاب نہیں" : "پہلے ہیڈر سے موگہ منتخب کریں"}
            </div>
          ) : (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {mustateels.map((m) => {
                const allSel = Array.from({ length: m.acreCount }, (_, k) => k + 1).every((a) => selection.has(`${m.mustNo}/${a}`));
                return (
                  <div key={m.mustNo} className="border border-slate-200 rounded-lg p-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-slate-600 font-mono">
                        مستطیل {m.mustNo} <span className="text-slate-400">({m.acreCount} ایکڑ)</span>
                      </span>
                      <button onClick={() => toggleAll(m)} className="text-[9px] font-bold text-emerald-700 hover:text-emerald-800">
                        {allSel ? "صاف" : "سب"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: m.acreCount }, (_, k) => k + 1).map((acre) => {
                        const sel = selection.has(`${m.mustNo}/${acre}`);
                        return (
                          <button
                            key={acre}
                            onClick={() => toggle(m.mustNo, acre)}
                            className={`w-7 h-7 text-[10px] rounded font-bold border ${
                              sel
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                            }`}
                          >
                            {acre}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-3 border-t flex gap-2 shrink-0">
          <button onClick={apply} className="flex-1 h-9 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700">
            محفوظ کریں
          </button>
          <button onClick={onClose} className="px-4 h-9 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300">
            منسوخ
          </button>
        </div>
      </div>
    </div>
  );
}