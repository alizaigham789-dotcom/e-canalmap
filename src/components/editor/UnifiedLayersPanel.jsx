import React, { useMemo } from "react";
import { Layers, Eye, EyeOff, GripVertical, RotateCcw, X, ZoomIn, Printer, CheckSquare, Square } from "lucide-react";

// Unified LAYERS + LEGEND + COLOURS panel.
// Each layer row pairs a colour picker with an eye (visibility) toggle, so the
// user picks a colour and toggles visibility in the same place. Also hosts
// killa-number visibility, background/label colour, fill opacity, moga filters
// and the acre land-use legend — all in one draggable panel.

const LAYERS = [
  { id: "mustateel", label: "Mustateel Boundary", desc: "440 × 990 ft • 10 Killas", colorKey: "mustateelStroke", colorDefault: "#ef4444", killa: "mustateel" },
  { id: "muraba", label: "Muraba Boundary", desc: "1100 × 990 ft • 25 Killas", colorKey: "murabaStroke", colorDefault: "#ef4444", killa: "muraba" },
  { id: "acre", label: "Acre (Killa)", desc: "220 × 198 ft", colorKey: "acreStroke", colorDefault: "#eab308" },
  { id: "canal", label: "Canal / Distry", desc: "Dual wall + trees", colorKey: "canalStroke", colorDefault: "#3b82f6" },
  { id: "khal", label: "Khal / Watercourse", desc: "Bold blue line", colorKey: "khalStroke", colorDefault: "#000000" },
  { id: "road", label: "Road", desc: "Dual line + ROAD label", colorKey: "roadStroke", colorDefault: "#b45309" },
  { id: "chakbandi", label: "Chakbandi Line", desc: "Land consolidation boundary", colorKey: "chakbandiStroke", colorDefault: "#22c55e" },
  { id: "outlet", label: "Outlet / Moga", desc: "Directional water outlet", colorKey: "outletStroke", colorDefault: "#06b6d4" },
  { id: "mouza", label: "Mouza Boundary", desc: "Mouza boundary line", colorKey: "mouzaStroke", colorDefault: "#dc2626" },
];

const FILL_FIELDS = [
  { key: "acreFill", label: "Acre", base: "234,179,8", def: "rgba(234,179,8,0.08)" },
  { key: "mustateelFill", label: "Mustateel", base: "245,158,11", def: "rgba(245,158,11,0.10)" },
  { key: "murabaFill", label: "Muraba", base: "249,115,22", def: "rgba(249,115,22,0.08)" },
  { key: "canalFill", label: "Canal", base: "163,218,244", def: "rgba(163,218,244,0.70)" },
  { key: "khalFill", label: "Khal", base: "59,130,246", def: "rgba(59,130,246,0.80)" },
];

function extractMogas(objects) {
  const mogas = new Set();
  for (const o of objects || []) {
    if (o.type === "chakbandi" && o.mogaNumber) mogas.add(o.mogaNumber);
    if (o.type === "mustateel" && o.mogaNumber) mogas.add(o.mogaNumber);
  }
  return [...mogas].sort((a, b) => {
    const na = parseInt(a), nb = parseInt(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return String(a).localeCompare(String(b));
  });
}

export default function UnifiedLayersPanel({
  colorSettings, onColorChange,
  bgColor, onBgColorChange,
  layers, onLayerChange,
  killaVisibility, onKillaVisibilityChange,
  objects, visibleMogas, onMogaVisibilityChange, onZoomToMoga, onPrintMoga,
  landUses = [],
  onDragStart, onResetPos, onClose,
}) {
  const C = colorSettings || {};
  const lv = layers || {};
  const kv = killaVisibility || { mustateel: true, muraba: true };
  const mogas = useMemo(() => extractMogas(objects), [objects]);
  const allVisible = mogas.length > 0 && mogas.every(m => visibleMogas?.[m] !== false);

  const setAll = (v) => mogas.forEach(m => onMogaVisibilityChange(m, v));
  const showOnly = (t) => mogas.forEach(m => onMogaVisibilityChange(m, m === t));

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden w-64">
      {/* Draggable header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200 bg-slate-50 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={onDragStart}
      >
        <GripVertical className="w-3.5 h-3.5 text-slate-400" />
        <Layers className="w-3.5 h-3.5 text-blue-600" />
        <span className="text-xs font-bold text-slate-800 font-heading tracking-wider flex-1">LAYERS &amp; COLOURS</span>
        {onResetPos && (
          <button onClick={(e) => { e.stopPropagation(); onResetPos(); }} className="text-slate-400 hover:text-blue-600 transition-colors" title="Reset position">
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
        {onClose && (
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-slate-400 hover:text-slate-700 transition-colors" title="Close">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="p-3 space-y-3 max-h-[70vh] overflow-y-auto">
        {/* Layers — colour picker + eye toggle together */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Layers</p>
          <div className="space-y-1">
            {LAYERS.map(item => {
              const visible = lv[item.id]?.visible !== false;
              const color = C[item.colorKey] || item.colorDefault;
              const killaVisible = item.killa ? kv[item.killa] !== false : true;
              return (
                <div key={item.id} className="flex items-center gap-2 py-0.5">
                  <input type="color" value={color}
                    onChange={e => onColorChange(item.colorKey, e.target.value)}
                    className="w-7 h-6 rounded cursor-pointer border border-slate-200 bg-transparent shrink-0"
                    title={`${item.label} colour`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium leading-tight ${visible ? "text-slate-700" : "text-slate-400 line-through"}`}>{item.label}</p>
                    <p className="text-[10px] text-slate-400 font-mono leading-tight">{item.desc}</p>
                  </div>
                  {item.killa && onKillaVisibilityChange && (
                    <button
                      onClick={() => onKillaVisibilityChange(item.killa, !killaVisible)}
                      className={`shrink-0 p-1 rounded transition-colors ${killaVisible ? "text-blue-500 hover:bg-blue-50" : "text-slate-300 hover:bg-slate-50"}`}
                      title={killaVisible ? "Hide Killa Numbers" : "Show Killa Numbers"}>
                      {killaVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <button
                    onClick={() => onLayerChange(item.id, { visible: !visible })}
                    className={`shrink-0 p-1 rounded transition-colors ${visible ? "text-emerald-500 hover:bg-emerald-50" : "text-slate-300 hover:bg-slate-50"}`}
                    title={visible ? "Hide Layer" : "Show Layer"}>
                    {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Background + label colour */}
        <div className="border-t border-slate-100 pt-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Canvas</p>
          <div className="flex items-center gap-2 mb-1.5">
            <input type="color" value={bgColor || "#ffffff"} onChange={e => onBgColorChange(e.target.value)}
              className="w-7 h-6 rounded cursor-pointer border border-slate-200 bg-transparent shrink-0" />
            <span className="text-xs text-slate-600">Background</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="color" value={C.labelColor || "#000000"} onChange={e => onColorChange("labelColor", e.target.value)}
              className="w-7 h-6 rounded cursor-pointer border border-slate-200 bg-transparent shrink-0" />
            <span className="text-xs text-slate-600">All Labels / Numbers</span>
          </div>
        </div>

        {/* Fill opacity */}
        <div className="border-t border-slate-100 pt-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Fill Opacity</p>
          {FILL_FIELDS.map(f => {
            const cur = C[f.key] || f.def;
            const op = parseFloat((cur.match(/[\d.]+(?=\))/) || [])[0] || "0.1");
            return (
              <div key={f.key} className="flex items-center gap-2 mb-1.5">
                <input type="range" min="0" max="1" step="0.05" value={op}
                  onChange={e => onColorChange(f.key, `rgba(${f.base},${e.target.value})`)}
                  className="w-full h-1.5 accent-blue-500" />
                <span className="text-[10px] text-slate-500 w-16 shrink-0">{f.label}</span>
              </div>
            );
          })}
        </div>

        {/* Moga filters */}
        <div className="border-t border-slate-100 pt-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Moga Filters</p>
            {mogas.length > 0 && (
              <div className="flex gap-1">
                <button className="text-[9px] text-blue-500 hover:text-blue-700 font-medium" onClick={() => setAll(true)}>All</button>
                <span className="text-slate-300">|</span>
                <button className="text-[9px] text-slate-400 hover:text-slate-600 font-medium" onClick={() => setAll(false)}>None</button>
              </div>
            )}
          </div>
          {mogas.length === 0 ? (
            <p className="text-slate-400 text-[10px] px-1 py-1 italic">No Moga numbers assigned.</p>
          ) : (
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 px-1 py-0.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                onClick={() => allVisible ? setAll(false) : setAll(true)}>
                {allVisible ? <CheckSquare className="w-3.5 h-3.5 text-green-500 shrink-0" /> : <Square className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                <span className={`flex-1 font-bold text-xs ${allVisible ? "text-slate-700" : "text-slate-400"}`}>Show All Mogas</span>
              </div>
              {mogas.map(moga => {
                const vis = visibleMogas?.[moga] !== false;
                return (
                  <div key={moga} className="flex items-center gap-1 px-1 py-0.5 rounded-lg hover:bg-slate-50 group">
                    <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => onMogaVisibilityChange(moga, !vis)}>
                      {vis ? <CheckSquare className="w-3.5 h-3.5 text-green-500 shrink-0" /> : <Square className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                      <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                      <span className={`font-medium text-xs ${vis ? "text-slate-700" : "text-slate-400"}`}>Moga {moga}</span>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button title={`Show only Moga ${moga}`} className="text-[9px] bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 rounded px-1 py-0.5" onClick={() => showOnly(moga)}>Only</button>
                      {onZoomToMoga && <button title={`Zoom to Moga ${moga}`} className="text-slate-400 hover:text-blue-500 rounded p-0.5" onClick={() => onZoomToMoga(moga)}><ZoomIn className="w-3 h-3" /></button>}
                      {onPrintMoga && <button title={`Print Moga ${moga}`} className="text-slate-400 hover:text-green-600 rounded p-0.5" onClick={() => onPrintMoga(moga)}><Printer className="w-3 h-3" /></button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Acre land-use legend */}
        {landUses.length > 0 && (
          <div className="border-t border-slate-100 pt-2">
            <p className="text-[10px] font-bold text-slate-700 mb-1.5" style={{ fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', sans-serif" }}>ایکڑ استعمال (Acre Land-Use)</p>
            <div className="space-y-1.5">
              {landUses.map((u, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-sm border border-black/10 shrink-0" style={{ background: u.color }} />
                  <span className="text-[11px] text-slate-700" style={{ fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', sans-serif" }}>{u.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}