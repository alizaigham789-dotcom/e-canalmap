import React, { useMemo, useState } from "react";
import { MapPin, ChevronDown, ChevronRight, Layers } from "lucide-react";

// Lists every map that has been overlaid + saved (geo_placement_lat != null),
// grouped by mouza (village) → moga number. Clicking a row re-activates that
// map as the current overlay so previously-saved placements stay visible and
// reachable instead of disappearing when a different map is selected.
export default function SavedOverlaysList({ maps, selectedMapId, onSelectMap }) {
  const [open, setOpen] = useState(true);
  const [openMouzas, setOpenMouzas] = useState({});

  const grouped = useMemo(() => {
    const placed = (maps || []).filter(m => m.geo_placement_lat != null && m.geo_placement_lng != null);
    const byMouza = {};
    for (const m of placed) {
      const mouza = m.village || "(بغیر موضع)";
      if (!byMouza[mouza]) byMouza[mouza] = [];
      byMouza[mouza].push(m);
    }
    // Sort mouzas alphabetically; mogas numerically
    return Object.keys(byMouza)
      .sort((a, b) => a.localeCompare(b, "ur"))
      .map(mouza => ({
        mouza,
        mogas: byMouza[mouza].sort((a, b) => {
          const na = parseFloat(a.moga_number) || 0, nb = parseFloat(b.moga_number) || 0;
          return na - nb;
        }),
      }));
  }, [maps]);

  if (grouped.length === 0) return null;

  const total = grouped.reduce((s, g) => s + g.mogas.length, 0);

  return (
    <div className="bg-white/5 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-1.5 px-2.5 py-2 text-left"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5 text-white/60" /> : <ChevronRight className="w-3.5 h-3.5 text-white/60" />}
        <Layers className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-[10px] text-white/80 font-bold tracking-wide">Saved Overlays</span>
        <span className="text-[9px] text-white/40 font-mono ml-auto">{total}</span>
      </button>

      {open && (
        <div className="px-1.5 pb-2 space-y-1 max-h-56 overflow-y-auto">
          {grouped.map(g => {
            const mouzaOpen = openMouzas[g.mouza] !== false;
            return (
              <div key={g.mouza} className="rounded-md bg-white/5">
                <button
                  onClick={() => setOpenMouzas(prev => ({ ...prev, [g.mouza]: mouzaOpen ? false : true }))}
                  className="w-full flex items-center gap-1 px-2 py-1.5 text-left"
                >
                  {mouzaOpen ? <ChevronDown className="w-3 h-3 text-white/50" /> : <ChevronRight className="w-3 h-3 text-white/50" />}
                  <MapPin className="w-3 h-3 text-cyan-400" />
                  <span className="text-[10px] text-white/75 font-semibold truncate">{g.mouza}</span>
                  <span className="text-[9px] text-white/40 font-mono ml-auto">{g.mogas.length}</span>
                </button>
                {mouzaOpen && (
                  <div className="px-1 pb-1 space-y-0.5">
                    {g.mogas.map(m => {
                      const active = m.id === selectedMapId;
                      return (
                        <button
                          key={m.id}
                          onClick={() => onSelectMap(m.id)}
                          className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-right transition-all ${active ? "bg-blue-600/40 text-white" : "bg-white/5 text-white/65 hover:bg-white/15"}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: active ? "#3b82f6" : "#64748b" }} />
                          <span className="text-[10px] font-semibold">موگہ {m.moga_number || "—"}</span>
                          {m.mogha_side && <span className="text-[9px] text-white/40">/{m.mogha_side}</span>}
                          {m.rajbah && <span className="text-[9px] text-white/35 truncate ml-auto">{m.rajbah}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}