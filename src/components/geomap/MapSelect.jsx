import React, { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Check, Search } from "lucide-react";

// Custom searchable dropdown for cadastral map selection.
// Replaces the native <select> so the dropdown closes on outside-click
// (the native overlay on tablets covered the panel's X close button)
// and adds a search box for finding maps by title / village / moga.
export default function MapSelect({ maps, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return maps;
    return maps.filter(m =>
      (m.title || "").toLowerCase().includes(s) ||
      (m.village || "").toLowerCase().includes(s) ||
      String(m.moga_number || "").toLowerCase().includes(s)
    );
  }, [maps, search]);

  const selected = maps.find(m => m.id === value);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between bg-white/10 text-white text-xs font-medium px-2.5 h-8 rounded-md border border-white/15 cursor-pointer hover:bg-white/15 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <span className="truncate text-left">
            {selected ? `${selected.title}${selected.village ? ` · ${selected.village}` : ""}` : "— Pick a map —"}
          </span>
          <ChevronDown className="w-3 h-3 shrink-0 ml-2 text-white/60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-0 bg-[#1B2A3A] border border-white/15 shadow-2xl z-[1100]"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <div className="relative p-2 border-b border-white/10">
          <Search className="w-3 h-3 text-white/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search map…"
            className="w-full h-7 pr-7 pl-2 bg-white/10 text-white text-[10px] rounded-md border border-white/15 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-white/30 text-right"
            autoFocus
          />
        </div>
        <div className="max-h-52 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="text-[10px] text-white/40 text-center py-3">کوئی نقشہ نہیں ملا</p>
          ) : (
            filtered.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => { onChange(m.id); setOpen(false); setSearch(""); }}
                className={`w-full flex items-center justify-between px-2 h-8 rounded-md text-[10px] font-medium transition-all ${m.id === value ? "bg-blue-600/30 text-blue-300" : "text-white/70 hover:bg-white/10"}`}
              >
                <span className="truncate text-left">{m.title}{m.village ? ` · ${m.village}` : ""}</span>
                {m.id === value && <Check className="w-3 h-3 shrink-0 ml-1" />}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}