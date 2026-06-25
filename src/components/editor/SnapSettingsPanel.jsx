import React from "react";
import { Switch } from "@/components/ui/switch";
import { Magnet, Grid3x3, Anchor, Navigation } from "lucide-react";

export default function SnapSettingsPanel({ snapSettings, onSnapChange }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 w-52">
      <div className="flex items-center gap-1.5 mb-3">
        <Magnet className="w-3.5 h-3.5 text-violet-600" />
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Snap Engine</span>
      </div>
      <div className="space-y-2.5">
        <SnapRow
          icon={<Grid3x3 className="w-3 h-3" />}
          label="Grid Snap"
          sublabel="Align to cadastral corners"
          checked={snapSettings.gridSnap}
          onChange={v => onSnapChange("gridSnap", v)}
        />
        <SnapRow
          icon={<Navigation className="w-3 h-3" />}
          label="Spine Snap"
          sublabel="Snap to canal/road centerlines"
          checked={snapSettings.spineSnap}
          onChange={v => onSnapChange("spineSnap", v)}
        />
        <SnapRow
          icon={<Anchor className="w-3 h-3" />}
          label="Moga Anchor"
          sublabel="Snap to intake outlets"
          checked={snapSettings.mogaSnap}
          onChange={v => onSnapChange("mogaSnap", v)}
        />
      </div>
    </div>
  );
}

function SnapRow({ icon, label, sublabel, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">
        <span className="text-violet-500">{icon}</span>
        <div>
          <p className="text-xs text-slate-700 font-medium">{label}</p>
          <p className="text-[9px] text-slate-400">{sublabel}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="scale-75 data-[state=checked]:bg-violet-600" />
    </div>
  );
}