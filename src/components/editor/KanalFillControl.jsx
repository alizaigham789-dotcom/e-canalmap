import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { LAND_USE_PRESETS } from "@/lib/landUsePalette";
import { getKanalFills } from "@/lib/gisEngine";

const URDU = { fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', sans-serif" };
const FULL = (color, label) => ({ color, label, boxes: [1, 2, 3, 4, 5, 6, 7, 8] });

// Mustateel / Muraba colour-fill control.
//   • On/Off toggle at top (like chakbandi ikhraj) — turning ON fills every acre
//     by default; turning OFF clears all.
//   • Colour picker + "اپنا لیبل" custom label.
//   • A small mustateel preview grid (2×5 for mustateel, 5×5 for muraba) where each
//     cell is an acre number — click to toggle that acre's colour fill on/off.
//     Nothing else below the custom label.
export default function KanalFillControl({ local, commit }) {
  const isMuraba = local.type === "muraba";
  const totalKillas = isMuraba ? 25 : 10;
  const cols = isMuraba ? 5 : 2;
  const fills = getKanalFills(local);
  const enabled = fills.some((f) => f);

  const [color, setColor] = useState("#28a745");
  const [label, setLabel] = useState("آبپاشی");

  const toggleOn = (on) => {
    if (on) commit("kanalFills", Array.from({ length: totalKillas }, () => FULL(color, label)));
    else commit("kanalFills", Array(totalKillas).fill(null));
  };
  const toggleAcre = (a) => {
    const next = fills.slice();
    next[a - 1] = next[a - 1] ? null : FULL(color, label);
    commit("kanalFills", next);
  };

  const mustateelNum = local.num || (local.id ? String(local.id).slice(-4) : "—");

  return (
    <div className="p-2 bg-white border border-slate-200 rounded-lg space-y-2">
      {/* On/Off toggle */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-800" style={URDU}>رنگ فِل (Colour Fill)</span>
        <Switch checked={enabled} onCheckedChange={toggleOn} />
      </div>

      {enabled && (
        <>
          {/* Colour + custom label ("اپنا لیبل") */}
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

          {/* Small mustateel preview — each cell is an acre number, click to toggle fill */}
          <div>
            <label className="text-[9px] text-slate-400 uppercase tracking-wider block mb-1">
              MUSTATEEL {mustateelNum} — ایکڑ نمبر آن/آف
            </label>
            <div className="grid gap-1 w-40 mx-auto" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {Array.from({ length: totalKillas }, (_, i) => {
                const f = fills[i];
                const on = !!f;
                return (
                  <button key={i} onClick={() => toggleAcre(i + 1)}
                    className="relative h-8 rounded border text-[10px] font-bold flex items-center justify-center transition-colors"
                    style={{
                      background: on ? (f.color || "#28a745") : "#fff",
                      borderColor: on ? (f.color || "#28a745") : "#cbd5e1",
                      color: on ? "#fff" : "#475569",
                    }}
                    title={on ? `${f.label} — ایکڑ ${i + 1}` : `ایکڑ ${i + 1} خالی`}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <p className="text-[8px] text-slate-400 text-center mt-1" style={URDU}>
              جس ایکڑ میں رنگ کرنا ہو، اس نمبر پر کلک کریں
            </p>
          </div>
        </>
      )}
    </div>
  );
}