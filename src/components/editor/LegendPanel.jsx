import React, { useState } from "react";
import { BookOpen, Eye, EyeOff, GripVertical, RotateCcw } from "lucide-react";

const ITEMS = [
  { label: "Mustateel Boundary", color: "#ef4444", style: "solid", thickness: 3, desc: "440 × 990 ft • 10 Killas", key: "mustateelStroke", killaToggle: "mustateel" },
  { label: "Muraba Boundary", color: "#ef4444", style: "solid", thickness: 4, desc: "1100 × 990 ft • 25 Killas", key: "murabaStroke", killaToggle: "muraba" },
  { label: "Acre (Killa)", color: "#eab308", style: "solid", thickness: 1.5, desc: "220 × 198 ft", key: "acreStroke", layerKey: "acre" },
  { label: "Canal / Distry", color: "#3b82f6", style: "double", thickness: 2, desc: "Dual wall + trees", key: "canalStroke", layerKey: "canal" },
  { label: "Khal / Watercourse", color: "#2563eb", style: "solid", thickness: 2.5, desc: "Bold blue line", layerKey: "khal" },
  { label: "Road", color: "#d97706", style: "double", thickness: 2, desc: "Dual line + ROAD label", layerKey: "road" },
  { label: "Chakbandi Line", color: "#22c55e", style: "cross", thickness: 3.5, desc: "Land consolidation boundary", key: "chakbandiStroke", layerKey: "chakbandi" },
  { label: "Outlet / Moga", color: "#06b6d4", style: "arrow", thickness: 2, desc: "Directional water outlet", key: "outletStroke", layerKey: "outlet" },
];

export default function LegendPanel({ colorSettings, killaVisibility, onKillaVisibilityChange, layers, onLayerChange, onDragStart, onResetPos }) {
  const C = colorSettings || {};
  const kv = killaVisibility || { mustateel: true, muraba: true };
  const lv = layers || {};

  const getColor = (key, fallback) => C[key] || fallback;
  const colors = [
    getColor("mustateelStroke", "#ef4444"),
    getColor("murabaStroke", "#ef4444"),
    getColor("acreStroke", "#eab308"),
    getColor("canalStroke", "#3b82f6"),
    "#2563eb",
    "#d97706",
    getColor("chakbandiStroke", "#22c55e"),
    getColor("outletStroke", "#06b6d4"),
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden w-60">
      <div
        className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200 bg-slate-50 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={onDragStart}
      >
        <GripVertical className="w-3.5 h-3.5 text-slate-400" />
        <BookOpen className="w-3.5 h-3.5 text-blue-600" />
        <span className="text-xs font-bold text-slate-800 font-heading tracking-wider flex-1">LEGEND</span>
        {onResetPos && (
          <button
            onClick={(e) => { e.stopPropagation(); onResetPos(); }}
            className="text-slate-400 hover:text-blue-600 transition-colors"
            title="Reset position"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className="p-3 space-y-2.5">
        {ITEMS.map((item, idx) => {
          const color = colors[idx];
          const hasKillaToggle = !!item.killaToggle;
          const hasLayerToggle = !!item.layerKey;
          const killaVisible = hasKillaToggle ? kv[item.killaToggle] : true;
          const layerVisible = hasLayerToggle ? (lv[item.layerKey]?.visible !== false) : true;
          return (
            <div key={item.label} className="flex items-center gap-2">
              {/* Symbol */}
              <div className="w-10 h-5 flex items-center justify-center shrink-0">
                <svg width="40" height="20" viewBox="0 0 40 20">
                  {item.style === "double" && (
                    <>
                      <line x1="0" y1="7" x2="40" y2="7" stroke={color} strokeWidth="1.5" />
                      <line x1="0" y1="13" x2="40" y2="13" stroke={color} strokeWidth="1.5" />
                      <text x="20" y="11" textAnchor="middle" fill={color} fontSize="6">🌲🌲🌲</text>
                    </>
                  )}
                  {item.style === "arrow" && (
                    <>
                      <line x1="2" y1="10" x2="33" y2="10" stroke={color} strokeWidth="2" />
                      <polygon points="33,6 40,10 33,14" fill={color} />
                    </>
                  )}
                  {item.style === "cross" && (
                    <>
                      <line x1="0" y1="10" x2="40" y2="10" stroke={color} strokeWidth="3" />
                      <line x1="10" y1="4" x2="10" y2="16" stroke={color} strokeWidth="2" />
                      <line x1="25" y1="4" x2="25" y2="16" stroke={color} strokeWidth="2" />
                    </>
                  )}
                  {item.style === "solid" && (
                    <rect x="1" y="6" width="38" height="8" fill="transparent" stroke={color} strokeWidth={item.thickness} />
                  )}
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-700 font-medium leading-tight">{item.label}</p>
                <p className="text-[10px] text-slate-400 font-mono leading-tight">{item.desc}</p>
              </div>
              {hasLayerToggle && onLayerChange && (
                <button
                  onClick={() => onLayerChange(item.layerKey, { visible: !layerVisible })}
                  className={`shrink-0 p-1 rounded transition-colors ${layerVisible ? "text-emerald-500 hover:bg-emerald-50" : "text-slate-300 hover:bg-slate-50"}`}
                  title={layerVisible ? "Hide Layer" : "Show Layer"}
                >
                  {layerVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              )}
              {hasKillaToggle && onKillaVisibilityChange && (
                <button
                  onClick={() => onKillaVisibilityChange(item.killaToggle, !killaVisible)}
                  className={`shrink-0 p-1 rounded transition-colors ${killaVisible ? "text-blue-500 hover:bg-blue-50" : "text-slate-300 hover:bg-slate-50"}`}
                  title={killaVisible ? "Hide Killa Numbers" : "Show Killa Numbers"}
                >
                  {killaVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {/* Killa numbers legend */}
      <div className="px-3 pb-3 pt-1 border-t border-slate-100">
        <p className="text-[9px] text-slate-400 font-mono">👁 Eye icon = toggle layer / killa visibility</p>
      </div>
    </div>
  );
}