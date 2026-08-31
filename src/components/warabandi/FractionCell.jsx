import React, { useState } from "react";
import { LayoutGrid } from "lucide-react";
import { parseBandubastEntries } from "@/lib/paratHelpers";

// Renders a value as stacked fractions: mustateel on top, killa/acre on bottom,
// with a straight horizontal line (fraction bar) between.
// Supports comma-separated multiple pairs: "555/5-10, 511/5, 512/7-9"
export function FractionDisplay({ value, fontSize = "9px", lineColor = "#334155" }) {
  if (!value) return <span className="text-slate-300" style={{ fontSize }}>-</span>;
  const entries = parseBandubastEntries(value);
  return (
    <div className="flex items-center gap-1.5 justify-center flex-wrap" dir="ltr">
      {entries.map((entry, i) => {
        const idx = entry.indexOf("/");
        if (idx !== -1) {
          const mustateel = entry.slice(0, idx);
          const killaPart = entry.slice(idx + 1);
          return (
            <span key={i} className="inline-flex flex-col items-center leading-none">
              <span style={{ fontSize, borderBottom: `1.5px solid ${lineColor}`, padding: "0 2px" }}>{mustateel}</span>
              <span style={{ fontSize, padding: "0 2px" }}>{killaPart}</span>
            </span>
          );
        }
        return <span key={i} style={{ fontSize }} dir="rtl">{entry}</span>;
      })}
    </div>
  );
}

// Always-editable cell: input is always rendered (never unmounted) so backspace/delete
// always works. When the value contains "/" and the cell isn't being edited, the input
// text is made transparent and a stacked FractionDisplay (mustateel over killa, straight
// horizontal bar) is layered on top — matching the print preview and printed output.
// Click/focus reveals the raw editable text again.
export default function FractionCell({ value, onChange, onPicker, placeholder, disabled }) {
  const [editing, setEditing] = useState(false);
  const hasValue = !!(value && String(value).trim());
  const showFraction = !editing && hasValue && String(value).includes("/");
  return (
    <div className="relative w-full flex items-center justify-center min-h-[44px] md:min-h-[15px]">
      {showFraction && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-3">
          <FractionDisplay value={value} fontSize="9px" lineColor={disabled ? "#94a3b8" : "#1f2937"} />
        </div>
      )}
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={e => { setEditing(true); const len = e.target.value.length; e.target.setSelectionRange(len, len); }}
        onBlur={() => setEditing(false)}
        placeholder={placeholder}
        dir="ltr"
        readOnly={disabled}
        disabled={disabled}
        className={`w-full bg-transparent outline-none text-center px-0.5 py-2 md:py-0.5 min-h-[44px] md:min-h-0 text-[16px] md:text-[9px] placeholder:text-slate-300 disabled:opacity-50 ${showFraction ? "text-transparent" : "text-slate-800"}`}
        style={{ fontFamily: "serif" }}
      />
      {onPicker && !disabled && (
        <button onClick={onPicker} className="text-emerald-600 hover:text-emerald-700 shrink-0 absolute right-0 top-0">
          <LayoutGrid className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}