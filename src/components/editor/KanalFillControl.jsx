import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";
import { LAND_USE_PRESETS, getAcreUses, killaCountFor } from "@/lib/landUsePalette";
import { getKanalFills, getMustateelKillaCells, getMurabaKillaCells } from "@/lib/gisEngine";

const URDU = { fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', sans-serif" };
const BOXES = [1, 2, 3, 4, 5, 6, 7, 8];
const seq = (n) => BOXES.slice(0, Math.max(0, Math.min(8, n)));
const GREEN = "#16a34a";

// Which side of a polyline a point lies on (sign relative to nearest segment).
// +1 = left of the line, -1 = right, 0 = on it.
function sideOfPolyline(pts, px, py) {
  let best = Infinity, bestSign = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) continue;
    let t = ((px - a.x) * dx + (py - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const projx = a.x + t * dx, projy = a.y + t * dy;
    const d2 = (px - projx) ** 2 + (py - projy) ** 2;
    if (d2 < best) {
      best = d2;
      bestSign = Math.sign(dx * (py - a.y) - dy * (px - a.x));
    }
  }
  return bestSign;
}

// Per-acre label for a parcel. When the parcel carries two labels (label + label2)
// and a mouza boundary line crosses it, the mouza line is treated as the boundary:
// acres on one side show label, acres on the other side show label2.
// Returns an array indexed by killa-1 (0..total-1).
function acreLabelsFor(local, allObjects) {
  const total = killaCountFor(local);
  const label1 = local.label || "";
  const label2 = local.label2 || "";

  const cells = local.type === "muraba" ? getMurabaKillaCells(local)
    : local.type === "mustateel" ? getMustateelKillaCells(local)
    : [{ killa: 1, x: local.x, y: local.y, w: local.w || 220, h: local.h || 198 }];
  const byKilla = Array(total).fill(null);
  cells.forEach((cell) => { if (cell && cell.killa >= 1 && cell.killa <= total) byKilla[cell.killa - 1] = cell; });

  const mouzas = (allObjects || []).filter((o) => o.type === "mouza" && o.points && o.points.length >= 2);
  const useSplit = !!label2 && mouzas.length > 0;
  if (!useSplit) return byKilla.map(() => label1 || "—");

  const mx1 = local.x, my1 = local.y;
  const mx2 = local.x + (local.w || 0), my2 = local.y + (local.h || 0);
  const mouza = mouzas.find((m) => {
    const xs = m.points.map((p) => p.x), ys = m.points.map((p) => p.y);
    return Math.max(...xs) >= mx1 && Math.min(...xs) <= mx2 && Math.max(...ys) >= my1 && Math.min(...ys) <= my2;
  }) || mouzas[0];

  return byKilla.map((cell) => {
    if (!cell) return label1 || "—";
    const cx = cell.x + cell.w / 2, cy = cell.y + cell.h / 2;
    return sideOfPolyline(mouza.points, cx, cy) >= 0 ? label1 : label2;
  });
}

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
    else { nu[idx] = null; nf[idx] = { color: selColor, label: selLabel, boxes: seq(n) }; }
    write(nu, nf);
  };

  const toggleBox = (idx, b) => {
    const f = kanalFills[idx];
    if (!f) return;
    const boxes = f.boxes.includes(b) ? f.boxes.filter((x) => x !== b) : [...f.boxes, b].sort((x, y) => x - y);
    const nu = acreUses.slice(), nf = kanalFills.slice();
    if (boxes.length === 0) { nf[idx] = null; }
    else if (boxes.length === 8) { nu[idx] = { color: f.color, label: f.label }; nf[idx] = null; }
    else { nf[idx] = { ...f, boxes }; }
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
                const partial = cnt > 0 && cnt < 8;
                const f = kanalFills[idx];
                const fillCol = acreUses[idx] ? acreUses[idx].color : f ? f.color : GREEN;
                const acreLabel = acreLabels[idx] || "—";
                return (
                  <div key={a} className="border border-slate-200 rounded p-1.5 bg-white">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-slate-700 w-16 truncate" dir="ltr" title={acreLabel}>{acreLabel}/{a}</span>
                      <input type="range" min={0} max={8} value={cnt} onChange={(e) => setCount(idx, +e.target.value)}
                        className="flex-1" style={{ accentColor: GREEN }} />
                      <span className="text-[10px] font-mono font-bold w-8 text-right" style={{ color: fillCol }}>{cnt} K</span>
                    </div>
                    {partial && (
                      <>
                        {/* Acre-shaped kanal grid — 2 cols × 4 rows, matching the map's
                            acre division. Click a numbered kanal to toggle it. */}
                        <div className="mt-1.5 flex justify-center">
                          <div className="grid grid-cols-2 gap-0.5 p-1 bg-slate-100 rounded border border-slate-300" style={{ width: 96 }}>
                            {BOXES.map((b) => {
                              const on = f && f.boxes.includes(b);
                              return (
                                <button key={b} onClick={() => toggleBox(idx, b)}
                                  className="relative h-8 rounded-sm border text-[9px] font-bold flex items-center justify-center"
                                  style={{ background: on ? f.color : "#fff", borderColor: on ? f.color : "#cbd5e1", color: on ? "#fff" : "#94a3b8" }}
                                  title={`کنال ${b}`}>
                                  {b}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <p className="text-[8px] text-slate-400 mt-1 text-center" style={URDU}>ایکڑ کے کنال (2×4) — کلک کر کے منتخب کریں</p>
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