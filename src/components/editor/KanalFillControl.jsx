import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { LAND_USE_PRESETS } from "@/lib/landUsePalette";
import { getKanalFills } from "@/lib/gisEngine";

const URDU = { fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', sans-serif" };

// 8 kanal boxes per acre laid out 2 cols × 4 rows (reading row-by-row → box 1..8).
const BOXES = [1, 2, 3, 4, 5, 6, 7, 8];
// Default sequential box order when the slider picks N kanal from one acre.
const seq = (n) => BOXES.slice(0, Math.max(0, Math.min(8, n)));

// Per-kanal fill for a mustateel / muraba. Pick an acre (killa), set how many
// kanal via the slider (like the GeoMap cell-allot slider), then click the 2
// boxes you want out of the 8-box preview — only the clicked boxes get filled.
export default function KanalFillControl({ local, commit }) {
  const totalKillas = local.type === "muraba" ? 25 : 10;
  const fills = getKanalFills(local);

  const [selColor, setSelColor] = useState(LAND_USE_PRESETS[0].color);
  const [selLabel, setSelLabel] = useState(LAND_USE_PRESETS[0].label);
  const [customColor, setCustomColor] = useState("#7c3aed");
  const [customLabel, setCustomLabel] = useState("");
  const [acre, setAcre] = useState(1);

  const cur = fills[acre - 1] || null;
  const curBoxes = cur ? cur.boxes : [];
  const count = curBoxes.length;

  const write = (nextFill) => {
    const next = fills.slice();
    next[acre - 1] = nextFill;
    commit("kanalFills", next);
  };

  // Slider sets the first N boxes sequentially (GeoMap-style "kitni kanal").
  const setCount = (n) => {
    write(n > 0 ? { color: selColor, label: selLabel, boxes: seq(n) } : null);
  };

  // Toggle a single box (1..8) — clicking 2 boxes "allots" exactly those two.
  const toggleBox = (b) => {
    const boxes = curBoxes.includes(b) ? curBoxes.filter(x => x !== b) : [...curBoxes, b].sort();
    if (boxes.length === 0) write(null);
    else write({ color: selColor, label: selLabel, boxes });
  };

  const clearAcre = () => write(null);
  const clearAll = () => commit("kanalFills", Array(totalKillas).fill(null));

  return (
    <div className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
      <label className="text-[10px] text-slate-600 flex items-center gap-1" style={URDU}>
        کنال الاٹ (Kanal Fill) — ایکڑ کے 8 خانوں میں سے منتخب کنال
      </label>

      {/* Land-use colour presets */}
      <div className="grid grid-cols-4 gap-1">
        {LAND_USE_PRESETS.map(p => {
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

      {/* Custom colour + label */}
      <div className="flex items-center gap-1">
        <input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)}
          className="h-5 w-7 rounded cursor-pointer border border-slate-200" />
        <input type="text" value={customLabel} onChange={e => setCustomLabel(e.target.value)}
          placeholder="اپنا لیبل" dir="rtl" style={URDU}
          className="flex-1 h-6 text-[10px] bg-white border border-slate-200 rounded px-1 text-slate-700" />
        <button onClick={() => { setSelColor(customColor); setSelLabel(customLabel || "استعمال"); }}
          className="text-[8px] px-1 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-600">انتخاب</button>
      </div>

      {/* Selected indicator */}
      <div className="flex items-center gap-1 text-[9px] text-slate-500">
        <span>منتخب:</span>
        <span className="w-3 h-3 rounded-sm border border-slate-300" style={{ background: selColor }} />
        <span style={URDU}>{selLabel}</span>
      </div>

      {/* Acre (killa) selector — the mustateel's acres come up for selection */}
      <div>
        <label className="text-[9px] text-slate-400 uppercase tracking-wider block mb-1">
          ایکڑ منتخب کریں (Acre 1–{totalKillas})
        </label>
        <div className="grid grid-cols-5 gap-1">
          {Array.from({ length: totalKillas }, (_, i) => {
            const f = fills[i];
            const isSel = i + 1 === acre;
            return (
              <button key={i} onClick={() => setAcre(i + 1)}
                className="relative h-7 rounded border text-[9px] font-bold flex items-center justify-center"
                style={{
                  background: f ? f.color + (isSel ? "" : "77") : (isSel ? "#eff6ff" : "#fff"),
                  borderColor: isSel ? "#2563eb" : (f ? f.color : "#cbd5e1"),
                  color: f ? "#0f172a" : "#475569",
                }}
                title={f ? `${f.label} — ${f.boxes.length} کنال` : `Killa ${i + 1}`}>
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-acre kanal slider — "aik acer sy kitni kanal select krni hain" */}
      <div className="bg-white border border-slate-200 rounded px-2 py-1.5">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-[10px] font-bold text-slate-700">Acre {acre}</span>
          <input type="range" min={0} max={8} value={count} onChange={e => setCount(+e.target.value)} className="flex-1 accent-blue-600" />
          <span className="text-[10px] font-mono font-bold text-blue-700 w-10 text-right">{count} K</span>
        </div>
        <p className="text-[8px] text-slate-400" style={URDU}>سلائڈر سے کنال کی تعداد، پھر نیچے خانوں پر کلک کر کے مخصوص کنال منتخب کریں</p>
      </div>

      {/* 8-box preview + positional picker — clicking 2 boxes allots them */}
      <div>
        <label className="text-[9px] text-slate-400 uppercase tracking-wider block mb-1">
          8_boxes_preview — کلک کر کے کنال منتخب کریں
        </label>
        <div className="grid grid-cols-2 gap-1 w-28 mx-auto">
          {BOXES.map(b => {
            const on = curBoxes.includes(b);
            return (
              <button key={b} onClick={() => toggleBox(b)}
                className="relative h-9 rounded border text-[10px] font-bold flex items-center justify-center"
                style={{
                  background: on ? selColor : "#fff",
                  borderColor: on ? selColor : "#cbd5e1",
                  color: on ? "#0f172a" : "#94a3b8",
                }}
                title={on ? `کنال ${b} منتخب` : `کنال ${b}`}>
                <span className="absolute top-0 left-1 text-[7px] text-slate-500">{b}</span>
                {on && <span style={URDU} className="text-[9px] leading-none px-0.5 text-center">{selLabel}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={clearAcre} className="text-[9px] text-slate-500 hover:text-red-500 flex items-center gap-1">
          <Trash2 className="w-2.5 h-2.5" /> اس ایکڑ کی کنال خالی
        </button>
        <button onClick={clearAll} className="text-[9px] text-red-500 hover:text-red-600 flex items-center gap-1">
          <Trash2 className="w-2.5 h-2.5" /> سب خالی کریں
        </button>
      </div>
    </div>
  );
}