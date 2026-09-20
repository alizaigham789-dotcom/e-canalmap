import React from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { CANAL_STYLES } from "@/lib/canalStyles";

// Canal Style selector (10 professional styles) + Side Boundary controls.
// Style only changes appearance; geometry/width/vertices stay untouched.
export default function CanalStyleControl({ local, commit }) {
  const style = local.canalStyle || "water";
  return (
    <div className="space-y-2">
      <div>
        <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Canal Style</label>
        <div className="grid grid-cols-2 gap-1">
          {CANAL_STYLES.map(s => {
            const active = style === s.key;
            const swatchStyle = s.swatch
              ? { background: s.swatch }
              : { background: "conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ef4444)" };
            return (
              <button key={s.key} onClick={() => commit("canalStyle", s.key)} title={s.label}
                className={`flex items-center gap-1.5 px-1.5 py-1 rounded-md border text-[9px] font-medium transition-all ${active ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-slate-50"}`}>
                <span className="w-3 h-3 rounded-sm border border-black/10 shrink-0 shadow-inner" style={swatchStyle} />
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {style === "custom" && (
        <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-md border border-slate-200">
          <label className="text-[9px] text-slate-400 shrink-0">Custom Color</label>
          <input type="color" value={local.customColor || "#29A9E8"}
            onChange={e => commit("customColor", e.target.value)}
            className="h-6 w-10 rounded cursor-pointer border border-slate-200" />
          <span className="text-[9px] text-slate-500">Canal fill colour</span>
        </div>
      )}

      {/* Side Boundary — optional left/right real-world width strips */}
      <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-slate-600 font-medium">Side Boundary</label>
          <Switch checked={!!local.sideBoundary} onCheckedChange={v => commit("sideBoundary", v)} className="scale-75" />
        </div>
        {local.sideBoundary && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-slate-400 uppercase">Left (ft)</label>
                <Input type="number" min={0} max={500} value={local.leftBoundaryFt ?? 0}
                  onChange={e => commit("leftBoundaryFt", Math.max(0, parseFloat(e.target.value) || 0))}
                  className="h-7 text-xs font-mono bg-white border-slate-200 focus:border-blue-500" />
              </div>
              <div>
                <label className="text-[9px] text-slate-400 uppercase">Right (ft)</label>
                <Input type="number" min={0} max={500} value={local.rightBoundaryFt ?? 0}
                  onChange={e => commit("rightBoundaryFt", Math.max(0, parseFloat(e.target.value) || 0))}
                  className="h-7 text-xs font-mono bg-white border-slate-200 focus:border-blue-500" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[9px] text-slate-400 shrink-0">Bank Colour</label>
              <input type="color" value={local.boundaryColor || "#b08968"}
                onChange={e => commit("boundaryColor", e.target.value)}
                className="h-5 w-8 rounded cursor-pointer border border-slate-200" />
              <span className="text-[9px] text-slate-400">0 ft hides that side</span>
            </div>
            <p className="text-[9px] text-slate-400">Strips follow the canal automatically when moved/edited.</p>
          </>
        )}
      </div>
    </div>
  );
}