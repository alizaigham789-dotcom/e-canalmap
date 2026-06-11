import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { X, Trash2, ChevronRight, User, Tag, ArrowUpDown } from "lucide-react";

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
    acre: "Acre Block",
    mustateel: "Mustateel Parcel",
    muraba: "Muraba Block",
    canal: "Canal",
    outlet: "Outlet / Moga",
  }[selectedObj.type] || selectedObj.type;

  const typeColor = {
    acre: "text-yellow-400",
    mustateel: "text-amber-400",
    muraba: "text-orange-400",
    canal: "text-blue-400",
    outlet: "text-cyan-400",
  }[selectedObj.type] || "text-slate-400";

  return (
    <div className="w-64 bg-[#0d1420] border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold font-heading tracking-wider uppercase ${typeColor}`}>{typeLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="w-6 h-6 text-red-500 hover:text-red-400 hover:bg-red-500/10"
            onClick={() => onDelete(selectedObj.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="w-6 h-6 text-slate-500 hover:text-white hover:bg-slate-700/60"
            onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="p-3 space-y-3 max-h-[500px] overflow-y-auto">
        {/* ID */}
        <div>
          <label className="text-[10px] text-slate-600 uppercase tracking-wider block mb-1">Object ID</label>
          <p className="text-[10px] font-mono text-slate-500 truncate">{selectedObj.id}</p>
        </div>

        {/* Acre */}
        {selectedObj.type === "acre" && (
          <>
            <Separator className="bg-slate-700/50" />
            <Field label="Label" value={local.label || ""} onChange={v => commit("label", v)} placeholder="Optional label" />
            <div className="text-[10px] text-slate-500 font-mono">220 ft × 198 ft</div>
          </>
        )}

        {/* Mustateel */}
        {selectedObj.type === "mustateel" && (
          <>
            <Separator className="bg-slate-700/50" />
            <Field label="Label / Survey No." value={local.label || ""} onChange={v => commit("label", v)} placeholder="e.g. M-14" />
            <Field label="Owner Name" value={local.ownerName || ""} onChange={v => commit("ownerName", v)} placeholder="Owner name" icon={<User className="w-3 h-3" />} />
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-400">Show Owner</label>
              <Switch checked={!!local.showOwner} onCheckedChange={v => commit("showOwner", v)} className="scale-75" />
            </div>
            <div className="text-[10px] text-slate-500 font-mono">440 ft × 990 ft • 10 Killas</div>
          </>
        )}

        {/* Muraba */}
        {selectedObj.type === "muraba" && (
          <>
            <Separator className="bg-slate-700/50" />
            <Field label="Muraba No." value={local.label || ""} onChange={v => commit("label", v)} placeholder="e.g. MR-3" />
            <Field label="Owner Name" value={local.ownerName || ""} onChange={v => commit("ownerName", v)} placeholder="Owner name" icon={<User className="w-3 h-3" />} />
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-400">Show Owner</label>
              <Switch checked={!!local.showOwner} onCheckedChange={v => commit("showOwner", v)} className="scale-75" />
            </div>
            <div className="text-[10px] text-slate-500 font-mono">1100 ft × 990 ft • 25 Killas</div>
          </>
        )}

        {/* Canal */}
        {selectedObj.type === "canal" && (
          <>
            <Separator className="bg-slate-700/50" />
            <Field label="Canal Name" value={local.name || ""} onChange={v => commit("name", v)} placeholder="e.g. Nurpur Distry" />
            <div className="text-[10px] text-slate-500 font-mono">Width: {selectedObj.width} ft • Points: {selectedObj.points?.length || 0}</div>
          </>
        )}

        {/* Outlet */}
        {selectedObj.type === "outlet" && (
          <>
            <Separator className="bg-slate-700/50" />
            <Field label="Outlet Label" value={local.label || ""} onChange={v => commit("label", v)} placeholder="e.g. 14300/L" icon={<Tag className="w-3 h-3" />} />
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Arrow Size</label>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-6 px-2 text-xs border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
                  onClick={() => commit("arrowScale", Math.max(0.5, (local.arrowScale || 1) - 0.25))}>−</Button>
                <span className="text-xs text-slate-300 font-mono w-8 text-center">{(local.arrowScale || 1).toFixed(2)}×</span>
                <Button size="sm" variant="outline" className="h-6 px-2 text-xs border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
                  onClick={() => commit("arrowScale", Math.min(3, (local.arrowScale || 1) + 0.25))}>+</Button>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
              <ArrowUpDown className="w-3 h-3" /> Flow: start → end
            </div>
          </>
        )}

        {/* Position */}
        {(selectedObj.x !== undefined) && (
          <>
            <Separator className="bg-slate-700/50" />
            <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Position (ft)</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-600">X</label>
                <p className="text-xs font-mono text-slate-400">{Math.round(selectedObj.x)}</p>
              </div>
              <div>
                <label className="text-[10px] text-slate-600">Y</label>
                <p className="text-xs font-mono text-slate-400">{Math.round(selectedObj.y)}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, icon }) {
  return (
    <div>
      <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600">{icon}</span>}
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`h-7 text-xs bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500 ${icon ? "pl-6" : ""}`}
        />
      </div>
    </div>
  );
}