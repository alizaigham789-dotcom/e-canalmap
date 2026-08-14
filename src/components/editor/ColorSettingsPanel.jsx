import React from "react";
import { Palette, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const COLOR_FIELDS = [
  { key: "labelColor", label: "All Labels / Numbers", default: "#000000" },
  { key: "acreStroke", label: "Acre Border", default: "#eab308" },
  { key: "acreFill", label: "Acre Fill", default: "rgba(234,179,8,0.08)" },
  { key: "mustateelStroke", label: "Mustateel Border", default: "#ef4444" },
  { key: "mustateelFill", label: "Mustateel Fill", default: "rgba(245,158,11,0.10)" },
  { key: "murabaStroke", label: "Muraba Border", default: "#ef4444" },
  { key: "murabaFill", label: "Muraba Fill", default: "rgba(249,115,22,0.08)" },
  { key: "canalStroke", label: "Canal Line", default: "#3b82f6" },
  { key: "canalFill", label: "Canal Water", default: "rgba(59,130,246,0.25)" },
  { key: "khalStroke", label: "Khal Line", default: "#000000" },
  { key: "khalFill", label: "Khal Fill", default: "rgba(59,130,246,0.80)" },
  { key: "roadStroke", label: "Road Edge", default: "#b45309" },
  { key: "chakbandiStroke", label: "Chakbandi Line", default: "#22c55e" },
  { key: "mouzaStroke", label: "Mouza Boundary", default: "#dc2626" },
  { key: "outletStroke", label: "Outlet Arrow", default: "#06b6d4" },
];

export default function ColorSettingsPanel({ colorSettings, onColorChange, bgColor, onBgColorChange, onClose }) {
  const C = colorSettings || {};
  const solidFields = COLOR_FIELDS.filter(f => !f.default.startsWith("rgba"));
  const fillFields = COLOR_FIELDS.filter(f => f.default.startsWith("rgba"));

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden w-60">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-purple-600" />
          <span className="text-xs font-bold text-slate-800 font-heading tracking-wider">COLOURS</span>
        </div>
        <Button variant="ghost" size="icon" className="w-5 h-5 text-slate-400 hover:text-slate-700" onClick={onClose}>
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 font-semibold">Background</p>
          <div className="flex items-center gap-2">
            <input type="color" value={bgColor || "#ffffff"}
              onChange={e => onBgColorChange(e.target.value)}
              className="w-8 h-7 rounded cursor-pointer border border-slate-200 bg-transparent" />
            <span className="text-xs text-slate-600">Canvas Background</span>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 font-semibold">Border / Line Colours</p>
          <div className="space-y-1.5">
            {solidFields.map(field => (
              <div key={field.key} className="flex items-center gap-2">
                <input type="color" value={C[field.key] || field.default}
                  onChange={e => onColorChange(field.key, e.target.value)}
                  className="w-7 h-6 rounded cursor-pointer border border-slate-200 bg-transparent shrink-0" />
                <span className="text-xs text-slate-600">{field.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 font-semibold">Fill Opacity</p>
          {fillFields.map(field => (
            <div key={field.key} className="flex items-center gap-2 mb-1.5">
              <input type="range" min="0" max="1" step="0.05"
                value={parseFloat((C[field.key] || field.default).match(/[\d.]+(?=\))/)?.[0] || "0.1")}
                onChange={e => {
                  const base = (field.default.match(/^rgba\((\d+,\d+,\d+)/) || [])[1] || "245,158,11";
                  onColorChange(field.key, `rgba(${base},${e.target.value})`);
                }}
                className="w-full h-1.5 accent-purple-500" />
              <span className="text-[10px] text-slate-500 w-16 shrink-0">{field.label.replace(" Fill", "")}</span>
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm"
          className="w-full h-7 text-xs border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 mt-1"
          onClick={() => {
            COLOR_FIELDS.forEach(f => onColorChange(f.key, f.default));
            onBgColorChange("#ffffff");
          }}>
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}