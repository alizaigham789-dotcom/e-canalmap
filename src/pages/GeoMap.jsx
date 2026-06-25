import React from "react";
import { Satellite, MapPin, Globe2, Navigation, Crosshair, Layers } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";

const FEATURES = [
  { Icon: Globe2, label: "Satellite View", desc: "High-resolution imagery" },
  { Icon: Navigation, label: "GPS Tools", desc: "Live location & tracking" },
  { Icon: MapPin, label: "Map Markers", desc: "Pin field assets" },
  { Icon: Crosshair, label: "Geo Mapping", desc: "Boundary surveying" },
  { Icon: Layers, label: "Layer Control", desc: "Toggle map overlays" },
];

export default function GeoMap() {
  return (
    <ModuleShell title="GEO MAP" titleUrdu="جیو میپ" Icon={Satellite} gradient="from-sky-400 to-blue-300">
      <p className="text-xs text-slate-500 mb-5">
        Geo mapping, GPS tools, satellite view and map-related operations.
      </p>
      <div className="grid grid-cols-2 gap-4">
        {FEATURES.map((f) => {
          const Icon = f.Icon;
          return (
            <div
              key={f.label}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 flex flex-col items-center text-center min-h-[120px] justify-center"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-400 to-blue-300 flex items-center justify-center shadow-md shadow-sky-400/25 ring-1 ring-white/20 mb-2.5">
                <Icon className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <p className="text-xs font-bold text-slate-700">{f.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{f.desc}</p>
            </div>
          );
        })}
      </div>
    </ModuleShell>
  );
}