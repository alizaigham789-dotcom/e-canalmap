import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { X, Trash2, User, Tag, ArrowUpDown } from "lucide-react";

export default function PropertiesPanel({ selectedObj, onUpdate, onDelete, onClose }) {
  const [local, setLocal] = useState({});

  useEffect(() => {
    if (selectedObj) setLocal({ ...selectedObj });
  }, [selectedObj?.id]);

  if (!selectedObj) return null;

  const commit = (key, val) => {
    const next = { ...local, [key]: val };
    setLocal(next);
    onUpdate(selectedObj.id, { [key]: val });
  };

  const typeLabel = {
    acre: "Acre Block", mustateel: "Mustateel Parcel", muraba: "Muraba Block",
    canal: "Canal", chakbandi: "Chakbandi Line", outlet: "Outlet / Moga",
    khal: "Khal / Watercourse", road: "Road",
  }[selectedObj.type] || selectedObj.type;

  const typeColor = {
    acre: "text-amber-600", mustateel: "text-red-600", muraba: "text-red-700",
    canal: "text-blue-600", chakbandi: "text-green-600", outlet: "text-cyan-600",
    khal: "text-blue-500", road: "text-amber-500",
  }[selectedObj.type] || "text-slate-500";

  return (
    <div className="w-64 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 bg-slate-50">
        <span className={`text-xs font-bold font-heading tracking-wider uppercase ${typeColor}`}>{typeLabel}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="w-6 h-6 text-red-400 hover:text-red-600 hover:bg-red-50"
            onClick={() => onDelete(selectedObj.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="w-6 h-6 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="p-3 space-y-3 max-h-[500px] overflow-y-auto">
        <div>
          <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Object ID</label>
          <p className="text-[10px] font-mono text-slate-400 truncate">{selectedObj.id}</p>
        </div>

        {selectedObj.type === "acre" && (
          <>
            <Separator className="bg-slate-100" />
            <Field label="Label" value={local.label || ""} onChange={v => commit("label", v)} placeholder="Optional label" />
            <div className="text-[10px] text-slate-400 font-mono">220 ft × 198 ft</div>
          </>
        )}

        {selectedObj.type === "mustateel" && (
          <>
            <Separator className="bg-slate-100" />
            <Field label="Label / Survey No." value={local.label || ""} onChange={v => commit("label", v)} placeholder="e.g. M-1" hint="Double-click plot on map to edit label at centroid" />
            <Field label="Owner Name" value={local.ownerName || ""} onChange={v => commit("ownerName", v)} placeholder="Owner name" icon={<User className="w-3 h-3" />} />
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-600">Show Owner</label>
              <Switch checked={!!local.showOwner} onCheckedChange={v => commit("showOwner", v)} className="scale-75" />
            </div>
            <div className="text-[10px] text-slate-400 font-mono">440 ft × 990 ft • 10 Killas</div>
          </>
        )}

        {selectedObj.type === "muraba" && (
          <>
            <Separator className="bg-slate-100" />
            <Field label="Muraba No." value={local.label || ""} onChange={v => commit("label", v)} placeholder="e.g. MR-1" hint="Double-click plot on map to edit label at centroid" />
            <Field label="Owner Name" value={local.ownerName || ""} onChange={v => commit("ownerName", v)} placeholder="Owner name" icon={<User className="w-3 h-3" />} />
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-600">Show Owner</label>
              <Switch checked={!!local.showOwner} onCheckedChange={v => commit("showOwner", v)} className="scale-75" />
            </div>
            <div className="text-[10px] text-slate-400 font-mono">1100 ft × 990 ft • 25 Killas</div>
          </>
        )}

        {selectedObj.type === "canal" && (
          <>
            <Separator className="bg-slate-100" />
            <Field label="Canal Name" value={local.name || ""} onChange={v => commit("name", v)} placeholder="e.g. Nurpur Distry" />
            <SpacingControl
              label="Line Spacing"
              value={local.width || 14}
              min={2} max={80} step={1}
              onChange={v => commit("width", v)}
              unit="ft"
            />
            <div className="text-[10px] text-blue-600 font-mono">Two parallel lines • {selectedObj.points?.length || 0} points</div>
          </>
        )}

        {(selectedObj.type === "khal") && (
          <>
            <Separator className="bg-slate-100" />
            <Field label="Khal Name" value={local.name || ""} onChange={v => commit("name", v)} placeholder="e.g. Khal 1" />
            <SpacingControl
              label="Line Spacing"
              value={local.width || 8}
              min={2} max={60} step={1}
              onChange={v => commit("width", v)}
              unit="ft"
            />
            <div className="text-[10px] text-blue-600 font-mono">Two parallel lines • {selectedObj.points?.length || 0} points</div>
          </>
        )}

        {(selectedObj.type === "road") && (
          <>
            <Separator className="bg-slate-100" />
            <Field label="Road Name" value={local.name || ""} onChange={v => commit("name", v)} placeholder="e.g. Main Road" />
            <SpacingControl
              label="Line Spacing"
              value={local.width || 28}
              min={4} max={120} step={1}
              onChange={v => commit("width", v)}
              unit="ft"
            />
            <div className="text-[10px] text-amber-600 font-mono">Two parallel lines • {selectedObj.points?.length || 0} points</div>
          </>
        )}

        {selectedObj.type === "chakbandi" && (
          <>
            <Separator className="bg-slate-100" />
            <Field label="Chakbandi Name" value={local.name || ""} onChange={v => commit("name", v)} placeholder="e.g. Chakbandi Boundary 1" />
            <div className="flex items-center justify-between mt-2">
              <label className="text-xs text-slate-600">Cross Pattern</label>
              <Switch checked={!!local.crossPattern} onCheckedChange={v => commit("crossPattern", v)} className="scale-75" />
            </div>
            {local.crossPattern && (
              <>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Cross Size</label>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-6 px-2 text-xs border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      onClick={() => commit("crossSize", Math.max(4, (local.crossSize || 8) - 2))}>−</Button>
                    <span className="text-xs text-slate-600 font-mono w-8 text-center">{local.crossSize || 8}</span>
                    <Button size="sm" variant="outline" className="h-6 px-2 text-xs border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      onClick={() => commit("crossSize", Math.min(40, (local.crossSize || 8) + 2))}>+</Button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Cross Spacing</label>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-6 px-2 text-xs border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      onClick={() => commit("crossSpacing", Math.max(10, (local.crossSpacing || 40) - 10))}>−</Button>
                    <span className="text-xs text-slate-600 font-mono w-8 text-center">{local.crossSpacing || 40}</span>
                    <Button size="sm" variant="outline" className="h-6 px-2 text-xs border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      onClick={() => commit("crossSpacing", Math.min(200, (local.crossSpacing || 40) + 10))}>+</Button>
                  </div>
                </div>
              </>
            )}
            <div className="text-[10px] text-green-600 font-mono">Bold green • {local.crossPattern ? "Cross marks" : "Cross markers"} • {selectedObj.points?.length || 0} points</div>
          </>
        )}

        {selectedObj.type === "outlet" && (
          <>
            <Separator className="bg-slate-100" />
            <Field label="Outlet Label" value={local.label || ""} onChange={v => commit("label", v)} placeholder="e.g. 14300/L" icon={<Tag className="w-3 h-3" />} />
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Arrow Size</label>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-6 px-2 text-xs border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  onClick={() => commit("arrowScale", Math.max(0.5, (local.arrowScale || 1) - 0.25))}>−</Button>
                <span className="text-xs text-slate-600 font-mono w-8 text-center">{(local.arrowScale || 1).toFixed(2)}×</span>
                <Button size="sm" variant="outline" className="h-6 px-2 text-xs border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  onClick={() => commit("arrowScale", Math.min(3, (local.arrowScale || 1) + 0.25))}>+</Button>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
              <ArrowUpDown className="w-3 h-3" /> Flow: start → end
            </div>
          </>
        )}

        {(selectedObj.x !== undefined) && (
          <>
            <Separator className="bg-slate-100" />
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Position (ft)</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400">X</label>
                <p className="text-xs font-mono text-slate-600">{Math.round(selectedObj.x)}</p>
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Y</label>
                <p className="text-xs font-mono text-slate-600">{Math.round(selectedObj.y)}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, icon, hint }) {
  return (
    <div>
      <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`h-7 text-xs bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-300 focus:border-blue-500 ${icon ? "pl-6" : ""}`}
        />
      </div>
      {hint && <p className="text-[9px] text-blue-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function SpacingControl({ label, value, min, max, step, onChange, unit }) {
  return (
    <div>
      <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="h-6 w-6 p-0 text-xs border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
          onClick={() => onChange(Math.max(min, value - step))}>−</Button>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseInt(e.target.value, 10))}
          className="flex-1 h-1 accent-blue-500 cursor-pointer"
        />
        <Button size="sm" variant="outline" className="h-6 w-6 p-0 text-xs border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
          onClick={() => onChange(Math.min(max, value + step))}>+</Button>
        <span className="text-xs text-slate-600 font-mono w-10 text-center">{value}{unit}</span>
      </div>
    </div>
  );
}