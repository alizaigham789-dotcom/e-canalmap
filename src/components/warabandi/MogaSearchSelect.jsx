import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, ChevronDown } from "lucide-react";

// سرچ ایبل موگہ ڈراپ ڈاؤن — LandMap ریکارڈز سے موگہ نمبرز لوڈ کرتا ہے
// جو GeoMap پر بھی دکھائی دیتے ہیں۔ منتخب کرنے پر پورا میپ ڈیٹا onSelect میں بھیجتا ہے
// تاکہ راجبہ، موضع، سیکشن، سب ڈویژن، ڈویژن خود بخود بھر جائیں۔
export default function MogaSearchSelect({ value, sideValue, onSelect, onTextChange, placeholder = "18650" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [usingSearch, setUsingSearch] = useState(false);
  const containerRef = useRef(null);

  const { data: maps } = useQuery({
    queryKey: ["warabandi-moga-maps"],
    queryFn: () => base44.entities.LandMap.list("-updated_date", 500),
  });

  // ہر منفرد موگہ نمبر کے لیے پہلا میپ ریکارڈ رکھیں
  const mogaEntries = useMemo(() => {
    const seen = new Map();
    for (const m of (maps || [])) {
      const num = m.moga_number;
      if (!num) continue;
      if (!seen.has(String(num))) seen.set(String(num), m);
    }
    return [...seen.values()].sort((a, b) => String(a.moga_number).localeCompare(String(b.moga_number), undefined, { numeric: true }));
  }, [maps]);

  const filtered = useMemo(() => {
    if (!query.trim()) return mogaEntries;
    const q = query.trim();
    return mogaEntries.filter(m => String(m.moga_number).includes(q));
  }, [mogaEntries, query]);

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setUsingSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (map) => {
    onSelect && onSelect(map);
    setOpen(false);
    setUsingSearch(false);
    setQuery("");
  };

  return (
    <div className="flex gap-1 flex-1 min-w-0" dir="ltr" ref={containerRef}>
      <div className="relative flex-1 min-w-0">
        <input
          value={usingSearch ? query : (value || "")}
          onChange={e => { setUsingSearch(true); setQuery(e.target.value); if (!open) setOpen(true); onTextChange?.(e.target.value); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          dir="ltr"
          className="border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-400 w-full"
        />
        <button
          type="button"
          onClick={() => { setOpen(v => !v); }}
          className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded shadow-lg max-h-60 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-2 py-2 text-[10px] text-slate-400 text-center">کوئی موگہ نہیں ملا</div>
            )}
            {filtered.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelect(m)}
                className="w-full text-left px-2 py-1.5 text-[11px] text-slate-700 hover:bg-blue-50 flex items-center justify-between gap-2 border-b border-slate-50"
              >
                <span className="font-mono font-bold text-blue-700">{m.moga_number}</span>
                <span className="text-[9px] text-slate-500 truncate" dir="rtl" style={{ fontFamily: "serif" }}>
                  {[m.village, m.rajbah].filter(Boolean).join(" · ")}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <select
        value={sideValue || "R"}
        onChange={e => onSelect && onSelect({ mogha_side: e.target.value, _sideOnly: true })}
        className="border border-slate-300 rounded px-1 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-400 w-14"
      >
        <option value="R">R</option>
        <option value="L">L</option>
      </select>
    </div>
  );
}