import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { X, AlertTriangle, Calendar, User, Paperclip } from "lucide-react";

const DAMAGE_CATEGORIES = ["Broken Canal", "Damaged Khal", "Illegal Cut", "Blockage", "Overflow", "Leakage"];
const SEVERITIES = ["Low", "Medium", "High", "Critical"];

const SEVERITY_COLORS = {
  Low: "bg-green-100 text-green-700 border-green-300",
  Medium: "bg-yellow-100 text-yellow-700 border-yellow-300",
  High: "bg-orange-100 text-orange-700 border-orange-300",
  Critical: "bg-red-100 text-red-700 border-red-300",
};

export default function DamageMarkerDialog({ marker, onSave, onClose, onDelete }) {
  const [local, setLocal] = useState({ ...marker });

  useEffect(() => { setLocal({ ...marker }); }, [marker?.id]);

  const set = (key, val) => setLocal(prev => ({ ...prev, [key]: val }));

  const handleSave = () => { onSave(marker.id, local); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-[420px] max-w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-red-600 to-orange-500">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-white" />
            <span className="text-sm font-bold text-white tracking-wide">Canal Damage Marker</span>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ID Badge */}
        <div className="px-5 py-2 bg-slate-50 border-b border-slate-200">
          <p className="text-[10px] text-slate-400 font-mono">ID: {marker?.id}</p>
          <p className="text-[10px] text-slate-400 font-mono">Position: ({Math.round(marker?.x)}, {Math.round(marker?.y)}) ft</p>
        </div>

        <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto">
          {/* Damage Category */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1.5">Damage Category</label>
            <Select value={local.damage_category} onValueChange={v => set("damage_category", v)}>
              <SelectTrigger className="h-9 text-sm border-slate-200 bg-slate-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAMAGE_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Severity */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1.5">Severity Level</label>
            <div className="flex gap-2 flex-wrap">
              {SEVERITIES.map(sev => (
                <button
                  key={sev}
                  onClick={() => set("severity", sev)}
                  className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                    local.severity === sev
                      ? SEVERITY_COLORS[sev] + " ring-2 ring-offset-1 ring-current"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1.5">Description</label>
            <textarea
              value={local.description || ""}
              onChange={e => set("description", e.target.value)}
              placeholder="Describe the damage, location details, affected length..."
              className="w-full h-24 text-sm px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 resize-none focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent placeholder:text-slate-300"
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Date Reported
            </label>
            <Input
              type="datetime-local"
              value={local.date ? local.date.slice(0, 16) : ""}
              onChange={e => set("date", new Date(e.target.value).toISOString())}
              className="h-9 text-sm border-slate-200 bg-slate-50"
            />
          </div>

          {/* Responsible Person */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1.5 flex items-center gap-1">
              <User className="w-3 h-3" /> Responsible Person
            </label>
            <Input
              value={local.responsible_person || ""}
              onChange={e => set("responsible_person", e.target.value)}
              placeholder="Canal Patwari / Supervisor name"
              className="h-9 text-sm border-slate-200 bg-slate-50"
            />
          </div>

          {/* Attachment URL */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1.5 flex items-center gap-1">
              <Paperclip className="w-3 h-3" /> Attachment URL
            </label>
            <Input
              value={local.attachment_url || ""}
              onChange={e => set("attachment_url", e.target.value)}
              placeholder="https://... (photo/document URL)"
              className="h-9 text-sm border-slate-200 bg-slate-50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs"
            onClick={() => { onDelete(marker.id); onClose(); }}>
            Delete Marker
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="text-xs h-8 bg-red-600 hover:bg-red-700 text-white" onClick={handleSave}>Save Marker</Button>
          </div>
        </div>
      </div>
    </div>
  );
}