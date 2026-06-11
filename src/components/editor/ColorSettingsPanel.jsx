import React from "react";
import { Palette, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const COLOR_FIELDS = [
  { key: "acreStroke", label: "Acre Border", default: "#eab308" },
  { key: "acreFill", label: "Acre Fill", default: "rgba(234,179,8,0.08)" },
  { key: "mustateelStroke", label: "Mustateel Border", default: "#ef4444" },
  { key: "mustateelFill", label: "Mustateel Fill", default: "rgba(245,158,11,0.10)" },
  { key: "murabaStroke", label: "Muraba Border", default: "#ef4444" },
  { key: "murabaFill", label: "Muraba Fill", default: "rgba(249,115,22,0.08)" },
  { key: "canalStroke", label: "Canal Line", default: "#3b82f6" },
  { key: "canalFill", label: "Canal Water", default: "rgba(59,130,246,0.25)" },
  { key: "chakbandiStroke", label: "Chakbandi Line", default: "#22c55e" },
  { key: "outletStroke", label: "Outlet Arrow", default: "#06b6d4" },
];

export default function ColorSettingsPanel({ colorSettings, onColorChange, bgColor, onBgColorChange, onClose }) {
  const C = colorSettings || {};

  // Solid color fields only (skip rgba for fill fields in color picker — show as text)
  const solidFields = COLOR_FIELDS.filter(f => !f.default.startsWith("rgba"));
  const fillFields = COLOR_FIELDS.filter(f => f.default.startsWith("rgba"));

  return (
    <div className="bg-[#0d1420] border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden w-60">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-bold text-white font-heading tracking-wider">COLOURS</span>
        </div>
        <Button variant="ghost" size="icon" className="w-5 h-5 text-slate-500 hover:text-white" onClick={onClose}>
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
        {/* Background */}
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Background</p>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={bgColor || "#0f1923"}
              onChange={e => onBgColorChange(e.target.value)}
              className="w-8 h-7 rounded cursor-pointer border border-slate-700 bg-transparent"
            />
            <span className="text-xs text-slate-300">Canvas Background</span>
          </div>
        </div>

        <div className="border-t border-slate-700/50 pt-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Border / Line Colours</p>
          <div className="space-y-1.5">
            {solidFields.map(field => (
              <div key={field.key} className="flex items-center gap-2">
                <input
                  type="color"
                  value={C[field.key] || field.default}
                  onChange={e => onColorChange(field.key, e.target.value)}
                  className="w-7 h-6 rounded cursor-pointer border border-slate-700 bg-transparent shrink-0"
                />
                <span className="text-xs text-slate-300">{field.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-700/50 pt-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Fill Opacity</p>
          {fillFields.map(field => (
            <div key={field.key} className="flex items-center gap-2 mb-1.5">
              <input
                type="range" min="0" max="1" step="0.05"
                value={parseFloat((C[field.key] || field.default).match(/[\d.]+(?=\))/)?.[0] || "0.1")}
                onChange={e => {
                  const base = (field.default.match(/^rgba\((\d+,\d+,\d+)/) || [])[1] || "245,158,11";
                  onColorChange(field.key, `rgba(${base},${e.target.value})`);
                }}
                className="w-full h-1.5 accent-purple-400"
              />
              <span className="text-[10px] text-slate-500 w-16 shrink-0">{field.label.replace(" Fill", "")}</span>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 mt-1"
          onClick={() => {
            COLOR_FIELDS.forEach(f => onColorChange(f.key, f.default));
            onBgColorChange("#0f1923");
          }}
        >
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}