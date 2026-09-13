import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Trash2, X, ChevronDown, ChevronUp } from "lucide-react";

// Floating properties + delete panel for a selected khal or moga (outlet) in
// GeoMap — mirrors the Map Editor's PropertiesPanel sections, in a compact card.
export default function GeoMapSelectionPanel({ obj, onUpdate, onDelete, onClose }) {
  const [local, setLocal] = useState({});
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (obj) { setLocal({ ...obj }); setCollapsed(false); }
  }, [obj?.id]);

  if (!obj) return null;

  const commit = (key, val) => {
    setLocal(prev => ({ ...prev, [key]: val }));
    onUpdate(obj.id, { [key]: val });
  };

  const typeLabel = obj.type === "outlet" ? "موگہ (Outlet)" : obj.type === "khal" ? "خال (Watercourse)" : obj.type;
  const typeColor = obj.type === "outlet" ? "text-cyan-600" : "text-blue-500";

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1002] w-[280px] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 cursor-pointer select-none" onClick={() => setCollapsed(v => !v)}>
        <div className="flex items-center gap-1.5 min-w-0">
          {collapsed ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-400" />}
          <span className={`text-xs font-bold truncate ${typeColor}`}>{typeLabel}</span>
        </div>
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={() => onDelete(obj.id)} title="حذف کریں" className="w-7 h-7 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={onClose} title="بند کریں" className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-3 max-h-[50vh] overflow-y-auto touch-scroll border-t border-slate-200">
          {obj.type === "khal" && (
            <>
              <Field label="خال نام (Watercourse Name)" value={local.name || ""} onChange={v => commit("name", v)} placeholder="e.g. Watercourse 1" />
              <KhalWidthControl value={local.width ?? 15} onChange={v => commit("width", v)} />
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Fill Colour</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={local.fillColor || "#3b82f6"} onChange={e => commit("fillColor", e.target.value)} className="h-6 w-8 rounded cursor-pointer border border-slate-200" />
                  <span className="text-xs text-slate-600">Water fill colour</span>
                  {local.fillColor && <button onClick={() => commit("fillColor", "")} className="text-[9px] text-slate-400 hover:text-red-500 ml-auto">Reset</button>}
                </div>
              </div>
              <div className="text-[10px] text-blue-600 font-mono">Two parallel lines • {obj.points?.length || 0} points</div>
              <p className="text-[9px] text-slate-400">نوڈس کھینچ کر ایڈٹ کریں، + سے نیا نوڈ، × سے حذف کریں</p>
            </>
          )}

          {obj.type === "outlet" && (
            <>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Moga Colour</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={local.outletColor || "#dc2626"} onChange={e => commit("outletColor", e.target.value)} className="h-6 w-8 rounded cursor-pointer border border-slate-200" />
                  <span className="text-xs text-slate-600">Block &amp; arrow colour</span>
                </div>
              </div>
              <Field label="موگہ نام (Mogha Name)" value={local.mogha_name || ""} onChange={v => commit("mogha_name", v)} placeholder="e.g. Mogha Ali" />
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">موگہ نمبری (Mogha Number)</label>
                <div className="flex gap-2">
                  <Input type="number" value={local.mogha_number || ""} onChange={e => commit("mogha_number", e.target.value)} placeholder="e.g. 18500" className="h-8 flex-1 text-xs bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500 font-mono" />
                  <select value={local.mogha_side || ""} onChange={e => commit("mogha_side", e.target.value)} className="h-8 w-16 text-xs bg-slate-50 border border-slate-200 rounded-md px-1 text-slate-800">
                    <option value="">L/R</option>
                    <option value="L">L</option>
                    <option value="R">R</option>
                    <option value="T.L">T.L</option>
                    <option value="T.R">T.R</option>
                    <option value="T-F.R">T-F.R</option>
                    <option value="T-F.L">T-F.L</option>
                  </select>
                </div>
                {(local.mogha_number || local.mogha_side) && (
                  <div className="mt-1 px-2 py-1 bg-cyan-50 border border-cyan-200 rounded text-[10px] font-mono text-cyan-700">
                    {[local.mogha_number, local.mogha_side].filter(Boolean).join("/")}
                  </div>
                )}
              </div>
              <SpacingControl label="Block Size" value={local.blockSize || 32} min={8} max={80} step={2} onChange={v => commit("blockSize", v)} unit="ft" />
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Moga Size / Arrow</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => commit("arrowScale", Math.max(0, +((local.arrowScale ?? 1) - 0.1).toFixed(1)))} className="h-6 w-6 rounded-md border border-slate-200 bg-slate-50 text-slate-700 text-xs">−</button>
                  <input type="range" min={0} max={2} step={0.1} value={local.arrowScale ?? 1} onChange={e => commit("arrowScale", parseFloat(e.target.value))} className="flex-1 h-1 accent-cyan-500 cursor-pointer" />
                  <button onClick={() => commit("arrowScale", Math.min(2, +((local.arrowScale ?? 1) + 0.1).toFixed(1)))} className="h-6 w-6 rounded-md border border-slate-200 bg-slate-50 text-slate-700 text-xs">+</button>
                  <span className="text-xs text-slate-600 font-mono w-10 text-center">{(local.arrowScale ?? 1).toFixed(1)}×</span>
                </div>
              </div>
              <p className="text-[9px] text-slate-400">بلاک start → arrow end • نوڈس کھینچ کر ایڈٹ کریں</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">{label}</label>
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="h-8 text-xs bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-300 focus:border-blue-500" />
    </div>
  );
}

function SpacingControl({ label, value, min, max, step, onChange, unit }) {
  return (
    <div>
      <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(min, value - step))} className="h-6 w-6 rounded-md border border-slate-200 bg-slate-50 text-slate-700 text-xs">−</button>
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="flex-1 h-1 accent-blue-500 cursor-pointer" />
        <button onClick={() => onChange(Math.min(max, value + step))} className="h-6 w-6 rounded-md border border-slate-200 bg-slate-50 text-slate-700 text-xs">+</button>
        <span className="text-xs text-slate-600 font-mono w-10 text-center">{value}{unit}</span>
      </div>
    </div>
  );
}

function KhalWidthControl({ value, onChange }) {
  const min = 1, max = 30;
  const clamped = Math.min(max, Math.max(min, value || 15));
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] text-slate-400 uppercase tracking-wider">Width (ft)</label>
        <span className="text-[9px] text-blue-500 font-medium">Watercourse · 1–30 ft</span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(min, +(clamped - 0.5).toFixed(1)))} className="h-6 w-6 rounded-md border border-slate-200 bg-slate-50 text-slate-700 text-xs">−</button>
        <input type="range" min={min} max={max} step={0.5} value={clamped} onChange={e => onChange(parseFloat(e.target.value))} className="flex-1 h-1 accent-blue-500 cursor-pointer" />
        <button onClick={() => onChange(Math.min(max, +(clamped + 0.5).toFixed(1)))} className="h-6 w-6 rounded-md border border-slate-200 bg-slate-50 text-slate-700 text-xs">+</button>
        <span className="text-xs text-slate-600 font-mono w-10 text-center">{clamped}ft</span>
      </div>
    </div>
  );
}