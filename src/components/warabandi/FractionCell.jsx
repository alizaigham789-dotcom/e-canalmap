import React from "react";
import { LayoutGrid } from "lucide-react";

// Renders a value as stacked fractions: mustateel on top, killa/acre on bottom,
// with a straight horizontal line (fraction bar) between.
// Supports comma-separated multiple pairs: "555/5-10, 511/5, 512/7-9"
export function FractionDisplay({ value, fontSize = "9px", lineColor = "#334155" }) {
  if (!value) return <span className="text-slate-300" style={{ fontSize }}>-</span>;
  const entries = String(value).split(",").map(e => e.trim()).filter(Boolean);
  return (
    <div className="flex items-center gap-1.5 justify-center flex-wrap" dir="ltr">
      {entries.map((entry, i) => {
        const parts = entry.split("/");
        if (parts.length >= 2) {
          return (
            <span key={i} className="inline-flex flex-col items-center leading-none">
              <span style={{ fontSize, borderBottom: `1.5px solid ${lineColor}`, padding: "0 2px" }}>{parts[0]}</span>
              <span style={{ fontSize, padding: "0 2px" }}>{parts.slice(1).join("/")}</span>
            </span>
          );
        }
        return <span key={i} style={{ fontSize }} dir="rtl">{entry}</span>;
      })}
    </div>
  );
}

// Always-editable cell: input is always rendered so backspace/delete always works.
// Shows fraction display as a live preview below the input when a value exists.
export default function FractionCell({ value, onChange, onPicker, placeholder }) {
  return (
    <div className="flex items-center gap-0.5 w-full">
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        dir="ltr"
        className="w-full bg-transparent outline-none text-[10px] text-slate-800 text-center px-0.5 py-0.5 placeholder:text-slate-300"
        style={{ fontFamily: "serif" }}
      />
      {onPicker && (
        <button onClick={onPicker} className="text-emerald-600 hover:text-emerald-700 shrink-0">
          <LayoutGrid className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}