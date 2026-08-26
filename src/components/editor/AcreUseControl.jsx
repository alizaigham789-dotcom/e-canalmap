import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { LAND_USE_PRESETS, getAcreUses } from "@/lib/landUsePalette";

const URDU = { fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', sans-serif" };

// Per-acre (killa) land-use color fill for a mustateel. Pick a preset (or a custom
// colour + label), then click a killa cell (1–10) to tag that acre. Click the same
// cell again to clear. Each tagged acre renders with its colour + Urdu label and
// appears in the legend.
export default function AcreUseControl({ local, commit }) {
  const uses = getAcreUses(local);
  const [selColor, setSelColor] = useState(LAND_USE_PRESETS[0].color);
  const [selLabel, setSelLabel] = useState(LAND_USE_PRESETS[0].label);
  const [customColor, setCustomColor] = useState("#7c3aed");
  const [customLabel, setCustomLabel] = useState("");

  const assign = (idx) => {
    const next = uses.slice();
    const cur = next[idx];
    if (cur && cur.color === selColor && cur.label === selLabel) {
      next[idx] = null;
    } else {
      next[idx] = { color: selColor, label: selLabel };
    }
    commit("acreUses", next);
  };

  const totalKillas = local.type === "muraba" ? 25 : 10;
  const clearAll = () => commit("acreUses", Array(totalKillas).fill(null));

  return (
    <div className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
      <label className="text-[10px] text-slate-600 flex items-center gap-1" style={URDU}>
        ایکڑ استعمال رنگ (Acre Land-Use)
      </label>

      {/* Presets */}
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

      {/* Killa grid 1–10 */}
      <div>
        <label className="text-[9px] text-slate-400 uppercase tracking-wider block mb-1">Killa (1–{totalKillas}) — کلک کر کے رنگ لگائیں</label>
        <div className="grid grid-cols-5 gap-1">
          {Array.from({ length: totalKillas }, (_, i) => {
            const u = uses[i];
            return (
              <button key={i} onClick={() => assign(i)}
                className="relative h-8 rounded border text-[9px] flex items-center justify-center overflow-hidden"
                style={{ background: u ? u.color + "99" : "#fff", borderColor: u ? u.color : "#cbd5e1" }}
                title={u ? u.label : `Killa ${i + 1}`}>
                <span className="absolute top-0 left-0.5 text-[7px] text-slate-600 font-bold">{i + 1}</span>
                {u ? <span style={URDU} className="text-[8px] text-slate-900 leading-none px-0.5 text-center">{u.label}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      <button onClick={clearAll} className="text-[9px] text-red-500 hover:text-red-600 flex items-center gap-1">
        <Trash2 className="w-2.5 h-2.5" /> سب خالی کریں
      </button>
    </div>
  );
}