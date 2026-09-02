import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { acreLabelsFor } from "@/lib/landUsePalette";
import { getExcludedKanals } from "@/lib/gisEngine";

const URDU = { fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', sans-serif" };
const BOXES = [1, 2, 3, 4, 5, 6, 7, 8];
const seq = (n) => BOXES.slice(0, Math.max(0, Math.min(8, n)));
const GREEN = "#16a34a";
const EX_COL = "#475569"; // slate-600 — fill for excluded kanal boxes

// Per-kanal ikhraj (exclusion) control — mirrors the colour-fill UI:
//   • a green slider per acre (0–8) = number of excluded kanal;
//   • clicking the acre row opens a 2×4 kanal grid to pick exactly which kanal are
//     kharij (excluded) — e.g. exclude only 2 kanal of an acre;
//   • only one acre's panel open at a time.
// Writes excludedKanals (per acre {boxes:[1..8]} | null) and keeps the legacy
// excludedAcres boolean array in sync for older readers.
export default function IkhrajKanalControl({ local, commit, allObjects = [] }) {
  const total = local.type === "muraba" ? 25 : 10;
  const excludedKanals = getExcludedKanals(local);
  const acreLabels = acreLabelsFor(local, allObjects);

  const getCount = (i) => (excludedKanals[i] ? excludedKanals[i].boxes.length : 0);
  const selectedAcres = Array.from({ length: total }, (_, i) => (getCount(i) > 0 ? i + 1 : null)).filter(Boolean);
  const [openAcre, setOpenAcre] = useState(null);

  const write = (exK) => {
    // excludedAcres mirrors "whole acre excluded" so legacy code stays consistent.
    const excludedAcres = exK.map((e) => !!(e && e.boxes.length === 8));
    commit({ excludedKanals: exK, excludedAcres });
  };

  const setCount = (idx, n) => {
    const exK = excludedKanals.slice();
    exK[idx] = n === 0 ? null : (n === 8 ? { boxes: BOXES.slice() } : { boxes: seq(n) });
    write(exK);
    setOpenAcre(n > 0 && n < 8 ? idx + 1 : null);
  };

  const toggleBox = (idx, b) => {
    const f = excludedKanals[idx];
    if (!f) return;
    const boxes = f.boxes.includes(b) ? f.boxes.filter((x) => x !== b) : [...f.boxes, b].sort((x, y) => x - y);
    const exK = excludedKanals.slice();
    if (boxes.length === 0) exK[idx] = null;
    else if (boxes.length === 8) exK[idx] = { boxes: BOXES.slice() };
    else exK[idx] = { boxes };
    write(exK);
  };

  const clearAll = () => write(Array(total).fill(null));

  return (
    <div className="border-t border-slate-200 pt-2">
      <label className="text-[9px] text-slate-400 uppercase tracking-wider block mb-1" style={URDU}>
        کنال وار اخراج — سلائیڈر سے تعداد، پھر کنال منتخب کریں
      </label>

      {selectedAcres.length > 0 ? (
        <div className="space-y-1.5 max-h-64 overflow-y-auto touch-scroll">
          {selectedAcres.map((a) => {
            const idx = a - 1;
            const cnt = getCount(idx);
            const isOpen = openAcre === a;
            const f = excludedKanals[idx];
            const acreLabel = acreLabels[idx] || "—";
            return (
              <div key={a} className={`border rounded p-1.5 bg-white ${isOpen ? "border-blue-400 shadow-sm" : "border-slate-200"}`}>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => cnt > 0 && setOpenAcre(isOpen ? null : a)}
                    className={`font-mono text-[10px] font-bold truncate w-16 text-left ${isOpen ? "text-blue-600" : "text-slate-700"}`} dir="ltr" title={acreLabel}>{acreLabel}/{a}</button>
                  <input type="range" min={0} max={8} value={cnt}
                    onChange={(e) => setCount(idx, +e.target.value)}
                    className="flex-1" style={{ accentColor: GREEN }} />
                  <span className="text-[10px] font-mono font-bold w-8 text-right" style={{ color: EX_COL }}>{cnt} K</span>
                </div>
                {isOpen && (
                  <>
                    {f && f.boxes.length < 8 ? (
                      <div className="mt-1.5 flex justify-center">
                        <div className="grid grid-cols-2 gap-0.5 p-1 bg-slate-100 rounded border border-slate-300" style={{ width: 96 }}>
                          {BOXES.map((b) => {
                            const on = f.boxes.includes(b);
                            return (
                              <button key={b} onClick={() => toggleBox(idx, b)}
                                className="relative h-8 rounded-sm border text-[9px] font-bold flex items-center justify-center"
                                style={{ background: on ? EX_COL : "#fff", borderColor: on ? EX_COL : "#cbd5e1", color: on ? "#fff" : "#94a3b8" }}
                                title={`کنال ${b}`}>
                                {b}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[8px] text-slate-400 mt-1 text-center" style={URDU}>سلائیڈر 1–7 پر رکھیں تاکہ کنال منتخب ہوں</p>
                    )}
                    <p className="text-[8px] text-slate-400 mt-1 text-center" style={URDU}>اخراج والے کنال (2×4) کلک کر کے منتخب کریں</p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[8px] text-slate-400 text-center" style={URDU}>کوئی اخراج نہیں — سلائیڈر بڑھا کر کنال خارج کریں</p>
      )}

      {selectedAcres.length > 0 && (
        <button onClick={clearAll} className="text-[9px] text-red-500 hover:text-red-600 flex items-center gap-1 mt-1.5">
          <Trash2 className="w-2.5 h-2.5" /> سب خالی کریں
        </button>
      )}
    </div>
  );
}