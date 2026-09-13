import React, { useState } from "react";
import { ChevronDown, Check, Map as MapIcon } from "lucide-react";

// All available base-map sources. Default = Google Hybrid Satellite.
// `satellite` flag controls whether the brightness/contrast filter is applied.
export const MAP_SOURCES = [
  { key: "google_hybrid", label: "Google Hybrid Satellite", url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", maxNativeZoom: 20, satellite: true },
  { key: "google_sat", label: "Google Satellite", url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", maxNativeZoom: 20, satellite: true },
  { key: "google_streets", label: "Google Streets", url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", maxNativeZoom: 20, satellite: false },
  { key: "google_terrain", label: "Google Terrain", url: "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}", maxNativeZoom: 20, satellite: false },
  { key: "esri_imagery", label: "Esri World Imagery", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", maxNativeZoom: 23, satellite: true },
  { key: "esri_topo", label: "Esri World Topo", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", maxNativeZoom: 19, satellite: false },
  { key: "esri_streets", label: "Esri World Streets", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", maxNativeZoom: 19, satellite: false },
  { key: "carto_light", label: "Carto Light (Positron)", url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", maxNativeZoom: 20, satellite: false },
  { key: "carto_dark", label: "Carto Dark (Dark Matter)", url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", maxNativeZoom: 20, satellite: false },
  { key: "osm", label: "OpenStreetMap (Standard)", url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", maxNativeZoom: 19, satellite: false },
  { key: "opentopo", label: "OpenTopoMap", url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", maxNativeZoom: 17, satellite: false },
];

export function getSource(key) {
  return MAP_SOURCES.find((s) => s.key === key) || MAP_SOURCES[0];
}

export default function MapSourceSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const current = getSource(value);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-5 right-3 z-[1000] flex items-center gap-1.5 px-4 h-9 text-white text-xs font-bold rounded-full shadow-xl transition-all"
        style={{ background: "linear-gradient(135deg, #00695c 0%, #004d40 100%)" }}
        title="Change map style"
      >
        <MapIcon className="w-3.5 h-3.5" />
        <span className="max-w-[140px] truncate">{current.label}</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-[300px] max-h-[80vh] overflow-y-auto p-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2.5 text-[13px] font-bold text-slate-800 border-b border-slate-100 mb-1">
              نقشہ اسٹائل منتخب کریں
            </div>
            {MAP_SOURCES.map((s) => {
              const selected = s.key === value;
              return (
                <button
                  key={s.key}
                  onClick={() => { onChange(s.key); setOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-[13px] transition-colors ${
                    selected ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{s.label}</span>
                  <span
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                      selected ? "border-[#0056b3] bg-[#0056b3]" : "border-slate-300"
                    }`}
                  >
                    {selected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}