import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";
import { LAND_USE_PRESETS, getAcreUses, killaCountFor, acreLabelsFor } from "@/lib/landUsePalette";
import { getKanalFills } from "@/lib/gisEngine";

const URDU = { fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', sans-serif" };
const BOXES = [1, 2, 3, 4, 5, 6, 7, 8];
const seq = (n) => BOXES.slice(0, Math.max(0, Math.min(8, n)));
const GREEN = "#16a34a";

// Unified colour-fill control for a mustateel / muraba.
//   • On/Off toggle at top — turning ON fills every acre by default (full 8 kanal);
//     turning OFF clears all.
//   • Image-style layout (only when ON): 8 land-use preset buttons + "اپنا لیبل"
//     custom label + "منتخب:" selection status + KILLA (1–N) grid.
//   • Click a killa to toggle a FULL acre fill (8 kanal). Each selected acre gets a
//     green slider (0–8, default 8). When the slider is at 8 (full) nothing else
//     opens. When reduced below 8 (partial), an acre-shaped 2×4 kanal grid opens for
//     that acre so the user can pick exactly which kanal are filled — matching the
//     map's acre division (2 cols × 4 rows).
// Data: full acres → acreUses (renders colour + legend label); partial acres →
// kanalFills (renders the specific per-kanal boxes). Both are committed together.
export default function KanalFillControl({ local, commit, title = "Mustateel Colour filling", allObjects = [] }) {
  const total = killaCountFor(local);
  const acreUses = getAcreUses(local);
  const kanalFills = getKanalFills(local);
  const acreLabels = acreLabelsFor(local, allObjects);

  const isFilled = (i) => !!(acreUses[i] || kanalFills[i]);
  const enabled = acreUses.some((u) => u) || kanalFills.some((f) => f);
  const getCount = (i) => (acreUses[i] ? 8 : kanalFills[i] ? kanalFills[i].boxes.length : 0);
  const selectedAcres = Array.from({ length: total }, (_, i) => (isFilled(i) ? i + 1 : null)).filter(Boolean);

  const [selColor, setSelColor] = useState(LAND_USE_PRESETS[0].color);
  const [selLabel, setSelLabel] = useState(LAND_USE_PRESETS[0].label);
  const [customColor, setCustomColor] = useState("#7c3aed");
  const [customLabel, setCustomLabel] = useState("");
  // Only one acre's kanal panel open at a time (acre number or null)
  const [openAcre, setOpenAcre] = useState(null);

  const write = (nextUses, nextFills) => commit({ acreUses: nextUses, kanalFills: nextFills });

  const toggleOn = (on) => {
    if (on) write(Array.from({ length: total }, () => ({ color: selColor, label: selLabel })), Array(total).fill(null));
    else write(Array(total).fill(null), Array(total).fill(null));
  };

  const toggleAcre = (idx) => {
    const nu = acreUses.slice(), nf = kanalFills.slice();
    if (isFilled(idx)) { nu[idx] = null; nf[idx] = null; }
    else { nu[idx] = { color: selColor, label: selLabel }; nf[idx] = null; }
    write(nu, nf);
  };

  const setCount = (idx, n) => {
    const nu = acreUses.slice(), nf = kanalFills.slice();
    if (n === 0) { nu[idx] = null; nf[idx] = null; }
    else if (n === 8) { nu[idx] = { color: selColor, label: selLabel }; nf[idx] = null; }
    else {
      // Partial — each kanal box records its own colour (uniform by default) so the
      // user can later recolour individual boxes to get different colours in one acre.
      const boxes = seq(n);
      const boxColors = {};
      boxes.forEach((b) => { boxColors[b] = { color: selColor, label: selLabel }; });
      nu[idx] = null; nf[idx] = { color: selColor, label: selLabel, boxes, boxColors };
    }
    write(nu, nf);
    // Auto-open the kanal panel when a partial count is selected; close otherwise
    setOpenAcre(n > 0 && n < 8 ? idx + 1 : null);
  };

  // Toggle a single kanal box. When switching a box ON, it takes the CURRENTLY selected
  // preset colour (selColor/selLabel) — so the user can pick red, click 4 boxes, pick
  // green, click 4 boxes → one acre holding two different colours.
  const toggleBox = (idx, b) => {
    const f = kanalFills[idx];
    if (!f) return;
    const boxColors = { ...(f.boxColors || {}) };
    let boxes;
    if (f.boxes.includes(b)) {
      boxes = f.boxes.filter((x) => x !== b);
      delete boxColors[b];
    } else {
      boxes = [...f.boxes, b].sort((x, y) => x - y);
      boxColors[b] = { color: selColor, label: selLabel };
    }
    const nu = acreUses.slice(), nf = kanalFills.slice();
    if (boxes.length === 0) { nf[idx] = null; }
    else if (boxes.length === 8) {
      // Only collapse to a full-acre fill when ALL 8 boxes share the same colour.
      // If the user gave different boxes different colours, keep the per-kanal
      // fills intact so the individual colours are preserved (not overwritten).
      const cols = boxes.map((x) => (boxColors[x] && boxColors[x].color) || f.color);
      const allSame = cols.every((c) => c === cols[0]);
      if (allSame) {
        const lbl = (boxColors[boxes[0]] && boxColors[boxes[0]].label) || f.label;
        nu[idx] = { color: cols[0], label: lbl }; nf[idx] = null;
      } else {
        nf[idx] = { ...f, boxes, boxColors };
      }
    }
    else { nf[idx] = { ...f, boxes, boxColors }; }
    write(nu, nf);
  };

  const clearAll = () => write(Array(total).fill(null), Array(total).fill(null));

  return (
    <div className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
      {/* Header + On/Off toggle */}
      <div className="flex items-center justify-between">
        <label className="text-[10px] text-slate-600 flex items-center gap-1" style={URDU}>
          {title}
        </label>
        <Switch checked={enabled} onCheckedChange={toggleOn} />
      </div>

      {enabled && (
        <>
          {/* Preset category grid (4×2) */}
          <div className="grid grid-cols-4 gap-1">
            {LAND_USE_PRESETS.map((p) => {
              const active = selColor === p.color && selLabel === p.label;
              return (
                <button key={p.id} onClick={() => { setSelColor(p.color); setSelLabel(p.label); }}
                  className={`flex flex-col items-center gap-0.5 p-1 rounded border text-[8px] leading-none ${active ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                  title={p.label}>
                  <span className="w-full h-3 rounded-sm border border-black/10" style={{ background: p.color }} />
                  <span style={URDU}>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Custom colour + "اپنا لیبل" */}
          <div className="flex items-center gap-1">
            <input type="color" value={customColor} onChange={(e) => setCustomColor(e.target.value)}
              className="h-5 w-7 rounded cursor-pointer border border-slate-200" />
            <input type="text" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="اپنا لیبل" dir="rtl" style={URDU}
              className="flex-1 h-6 text-[10px] bg-white border border-slate-200 rounded px-1 text-slate-700" />
            <button onClick={() => { setSelColor(customColor); setSelLabel(customLabel || "استعمال"); }}
              className="text-[8px] px-1 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-600">انتخاب</button>
          </div>

          {/* Selection status */}
          <div className="flex items-center gap-1 text-[9px] text-slate-500">
            <span>منتخب:</span>
            <span className="w-3 h-3 rounded-sm border border-slate-300" style={{ background: selColor }} />
            <span style={URDU}>{selLabel}</span>
          </div>

          {/* KILLA grid — click to toggle full acre fill */}
          <div>
            <label className="text-[9px] text-slate-400 uppercase tracking-wider block mb-1">
              KILLA (1–{total}) — کلک کر کے رنگ لگائیں
            </label>
            <div className="grid grid-cols-5 gap-1">
              {Array.from({ length: total }, (_, i) => {
                const u = acreUses[i], f = kanalFills[i];
                const filled = !!(u || f);
                const bg = u ? u.color : f ? f.color : null;
                return (
                  <button key={i} onClick={() => toggleAcre(i)}
                    className="relative h-8 rounded border text-[9px] flex items-center justify-center overflow-hidden"
                    style={{ background: filled ? (bg + "cc") : "#fff", borderColor: filled ? bg : "#cbd5e1" }}
                    title={filled ? (u ? u.label : f.label) : `Killa ${i + 1}`}>
                    <span className="absolute top-0 left-0.5 text-[7px] text-slate-700 font-bold">{i + 1}</span>
                    {filled && <span style={URDU} className="text-[8px] text-slate-900 leading-none px-0.5 text-center">{u ? u.label : `${f.boxes.length}K`}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Per-acre green slider rows — acre-shaped 2×4 kanal grid opens when partial */}
          {selectedAcres.length > 0 && (
            <div className="space-y-1.5 max-h-64 overflow-y-auto touch-scroll">
              {selectedAcres.map((a) => {
                const idx = a - 1;
                const cnt = getCount(idx);
                const isOpen = openAcre === a;
                const f = kanalFills[idx];
                const fillCol = acreUses[idx] ? acreUses[idx].color : f ? f.color : GREEN;
                const acreLabel = acreLabels[idx] || "—";
                return (
                  <div key={a} className={`border rounded p-1.5 bg-white ${isOpen ? "border-blue-400 shadow-sm" : "border-slate-200"}`}>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => cnt > 0 && setOpenAcre(isOpen ? null : a)}
                        className={`font-mono text-[10px] font-bold truncate w-16 text-left ${isOpen ? "text-blue-600" : "text-slate-700"}`} dir="ltr" title={acreLabel}>{acreLabel}/{a}</button>
                      <input type="range" min={0} max={8} value={cnt}
                        onChange={(e) => setCount(idx, +e.target.value)}
                        className="flex-1" style={{ accentColor: GREEN }} />
                      <span className="text-[10px] font-mono font-bold w-8 text-right" style={{ color: fillCol }}>{cnt} K</span>
                    </div>
                    {isOpen && (
                      <>
                        {/* Small colour presets — pick the active colour, then click kanal
                            boxes below to apply it. Lets different boxes get different colours. */}
                        <div className="mt-1 flex flex-wrap gap-0.5 items-center">
                          {LAND_USE_PRESETS.map((p) => {
                            const active = selColor === p.color && selLabel === p.label;
                            return (
                              <button key={p.id} onClick={() => { setSelColor(p.color); setSelLabel(p.label); }}
                                title={p.label}
                                className={`w-5 h-5 rounded border ${active ? "border-blue-700 ring-1 ring-blue-400" : "border-slate-300"}`}
                                style={{ background: p.color }} />
                            );
                          })}
                          <input type="color" value={/^#[0-9a-f]{6}$/i.test(selColor) ? selColor : "#7c3aed"}
                            onChange={(e) => { setSelColor(e.target.value); setSelLabel(customLabel || "استعمال"); }}
                            className="w-5 h-5 rounded cursor-pointer border border-slate-300 p-0" />
                        </div>
                        {/* Acre-shaped kanal grid — 2 cols × 4 rows. Each box shows its own colour. */}
                        {f ? (
                          <div className="mt-1.5 flex justify-center">
                            <div className="grid grid-cols-2 gap-0.5 p-1 bg-slate-100 rounded border border-slate-300" style={{ width: 96 }}>
                              {BOXES.map((b) => {
                                const on = f.boxes.includes(b);
                                const bc = f.boxColors && f.boxColors[b];
                                const col = (bc && bc.color) || f.color;
                                return (
                                  <button key={b} onClick={() => toggleBox(idx, b)}
                                    className="relative h-8 rounded-sm border text-[9px] font-bold flex items-center justify-center"
                                    style={{ background: on ? col : "#fff", borderColor: on ? col : "#cbd5e1", color: on ? "#fff" : "#94a3b8" }}
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
                        <p className="text-[8px] text-slate-400 mt-1 text-center" style={URDU}>رنگ منتخب کر کے کنال (2×4) پر کلک کریں — ہر کنال الگ رنگ کا سکتا ہے</p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={clearAll} className="text-[9px] text-red-500 hover:text-red-600 flex items-center gap-1">
            <Trash2 className="w-2.5 h-2.5" /> سب خالی کریں
          </button>
        </>
      )}
    </div>
  );
}