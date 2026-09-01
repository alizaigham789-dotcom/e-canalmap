import React, { useState } from "react";
import { Trash2, ChevronDown, CheckSquare, Square } from "lucide-react";
import { LAND_USE_PRESETS } from "@/lib/landUsePalette";
import { getKanalFills } from "@/lib/gisEngine";

const URDU = { fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', sans-serif" };
const BOXES = [1, 2, 3, 4, 5, 6, 7, 8];
const seq = (n) => BOXES.slice(0, Math.max(0, Math.min(8, n)));
const DEFAULT_FILL = (color = "#28a745", label = "آبپاشی") => ({ color, label, boxes: [1, 2, 3, 4, 5, 6, 7, 8] });

// Mustateel / Muraba per-kanal fill control.
// Layout (matches the reference screenshot):
//   • Header: MUSTATEEL <num> (<N> killas)  +  "Select All Acres" checkbox
//   • Acre bar: buttons 1..N. Selected acres turn green and get a default 8-kanal fill.
//   • One row per selected acre: killa label (e.g. 192/4) + slider (0–8, default 8) + [X] K
//     + an 8-box grid (all filled green by default; click a box to unfill / refill that kanal).
export default function KanalFillControl({ local, commit }) {
  const totalKillas = local.type === "muraba" ? 25 : 10;
  const fills = getKanalFills(local);
  const selectedAcres = fills.map((f, i) => (f ? i + 1 : null)).filter(Boolean);
  const allSelected = selectedAcres.length === totalKillas;

  const [color, setColor] = useState("#28a745");
  const [label, setLabel] = useState("آبپاشی");

  const write = (acre, fill) => {
    const next = fills.slice();
    next[acre - 1] = fill;
    commit("kanalFills", next);
  };

  const toggleAcre = (a) => {
    if (fills[a - 1]) write(a, null);
    else write(a, DEFAULT_FILL(color, label));
  };
  const selectAll = () => {
    if (allSelected) commit("kanalFills", Array(totalKillas).fill(null));
    else commit("kanalFills", Array.from({ length: totalKillas }, () => DEFAULT_FILL(color, label)));
  };
  const setCount = (acre, n) => {
    const f = fills[acre - 1] || DEFAULT_FILL(color, label);
    write(acre, n > 0 ? { ...f, boxes: seq(n) } : null);
  };
  const toggleBox = (acre, b) => {
    const f = fills[acre - 1];
    if (!f) return;
    const boxes = f.boxes.includes(b) ? f.boxes.filter((x) => x !== b) : [...f.boxes, b].sort((x, y) => x - y);
    if (boxes.length === 0) write(acre, null);
    else write(acre, { ...f, boxes });
  };
  const clearAll = () => commit("kanalFills", Array(totalKillas).fill(null));

  const mustateelNum = local.num || (local.id ? String(local.id).slice(-4) : "—");

  return (
    <div className="p-2 bg-white border border-slate-200 rounded-lg space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-bold text-slate-800 tracking-wide">
            MUSTATEEL {mustateelNum}
          </span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
          <span className="text-[9px] text-slate-400 ml-1">({totalKillas} killas)</span>
        </div>
        <button onClick={selectAll} className="flex items-center gap-1 text-[9px] text-slate-600 hover:text-blue-600">
          {allSelected ? <CheckSquare className="w-3 h-3 text-green-600" /> : <Square className="w-3 h-3" />}
          Select All Acres
        </button>
      </div>

      {/* Colour + custom label */}
      <div className="flex items-center gap-1">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
          className="h-5 w-7 rounded cursor-pointer border border-slate-200" />
        <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} dir="rtl" style={URDU}
          placeholder="اپنا لیبل" className="flex-1 h-6 text-[10px] bg-white border border-slate-200 rounded px-1 text-slate-700" />
        <div className="flex gap-0.5">
          {LAND_USE_PRESETS.slice(0, 4).map((p) => (
            <button key={p.id} onClick={() => { setColor(p.color); setLabel(p.label); }}
              className="w-4 h-4 rounded-sm border border-black/10" style={{ background: p.color }} title={p.label} />
          ))}
        </div>
      </div>

      {/* Acre selection bar */}
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: totalKillas }, (_, i) => {
          const f = fills[i];
          const sel = !!f;
          return (
            <button key={i} onClick={() => toggleAcre(i + 1)}
              className="h-6 rounded border text-[9px] font-bold flex items-center justify-center transition-colors"
              style={{
                background: sel ? (f.color || "#28a745") : "#fff",
                borderColor: sel ? (f.color || "#28a745") : "#cbd5e1",
                color: sel ? "#fff" : "#475569",
              }}
              title={sel ? `${f.label} — ${f.boxes.length} کنال` : `Acre ${i + 1}`}>
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Per-acre rows with slider + 8-box grid */}
      {selectedAcres.length === 0 ? (
        <p className="text-[10px] text-slate-400 text-center py-2" style={URDU}>
          اوپر ایکڑ نمبر منتخب کریں — ڈیفالٹ 8 کنال سبز بھرے جائیں گے
        </p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto touch-scroll">
          {selectedAcres.map((a) => {
            const f = fills[a - 1];
            const cnt = f ? f.boxes.length : 0;
            return (
              <div key={a} className="border border-slate-200 rounded p-1.5 bg-slate-50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[10px] font-bold text-slate-700 w-12">{mustateelNum}/{a}</span>
                  <input type="range" min={0} max={8} value={cnt}
                    onChange={(e) => setCount(a, +e.target.value)}
                    className="flex-1 accent-green-600" style={{ accentColor: f?.color || "#28a745" }} />
                  <span className="text-[10px] font-mono font-bold w-8 text-right" style={{ color: f?.color || "#28a745" }}>
                    {cnt} K
                  </span>
                </div>
                {/* 8-box grid: all filled by default, click to unfill a kanal */}
                <div className="grid grid-cols-8 gap-0.5">
                  {BOXES.map((b) => {
                    const on = f && f.boxes.includes(b);
                    return (
                      <button key={b} onClick={() => toggleBox(a, b)}
                        className="relative h-6 rounded-sm border text-[8px] font-bold flex items-center justify-center"
                        style={{
                          background: on ? (f.color || "#28a745") : "#fff",
                          borderColor: on ? (f.color || "#28a745") : "#cbd5e1",
                          color: on ? "#fff" : "#94a3b8",
                        }}
                        title={on ? `کنال ${b} منتخب` : `کنال ${b}`}>
                        {b}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[8px] text-slate-400 mt-0.5" style={URDU}>
                  8 کنال — جن خانوں پر کلک کریں وہ خالی ہو جائیں گے
                </p>
              </div>
            );
          })}
        </div>
      )}

      {selectedAcres.length > 0 && (
        <button onClick={clearAll} className="text-[9px] text-red-500 hover:text-red-600 flex items-center gap-1">
          <Trash2 className="w-2.5 h-2.5" /> سب ایکڑ خالی کریں
        </button>
      )}
    </div>
  );
}