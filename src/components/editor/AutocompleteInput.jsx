import React, { useState, useRef, useEffect } from "react";

/**
 * AutocompleteInput — a text input with a custom suggestion dropdown.
 * Suggestions are filtered by the current typed value (case-insensitive, Urdu-aware).
 * Tapping a suggestion fills the input and closes the dropdown.
 */
export default function AutocompleteInput({ value, onChange, suggestions = [], placeholder, className = "", inputMode, numeric = false, onFocus, onBlur }) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);

  const typed = String(value || "").trim().toLowerCase();
  const filtered = typed
    ? suggestions.filter(s => String(s).toLowerCase().includes(typed)).slice(0, 8)
    : suggestions.slice(0, 8);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setHighlight(0);
  }, [value]);

  const pick = (val) => {
    onChange(val);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(h => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    else if (e.key === "Enter" && filtered[highlight] !== undefined) { e.preventDefault(); pick(filtered[highlight]); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <input
        value={value}
        inputMode={inputMode}
        onChange={e => {
          let v = e.target.value;
          if (numeric) v = v.replace(/\D/g, "");
          onChange(v);
          setOpen(true);
        }}
        onFocus={(e) => { setOpen(true); onFocus?.(e); }}
        onBlur={(e) => { setTimeout(() => setOpen(false), 150); onBlur?.(e); }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        placeholder={placeholder}
        className={className}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-[60] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((s, i) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(s); }}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                i === highlight ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}