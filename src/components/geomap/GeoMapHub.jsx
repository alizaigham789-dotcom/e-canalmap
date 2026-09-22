import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Map as MapIcon, Satellite, FileDown } from "lucide-react";

const URDU = "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif";

const SUBMODULES = [
  {
    key: "view",
    name: "Mouza Map View",
    urdu: "مواضعات کا نقشہ",
    desc: "Cadastral maps without satellite",
    icon: MapIcon,
    color: "from-emerald-500 to-teal-500",
  },
  {
    key: "overlay",
    name: "Map Overlay · GIS",
    urdu: "نقشہ اوورلے",
    desc: "Georeference on satellite imagery",
    icon: Satellite,
    color: "from-blue-500 to-indigo-500",
  },
  {
    key: "mouzaExport",
    name: "Mouza Map Export",
    urdu: "موضع وار نقشہ ایکسپورٹ",
    desc: "Red-line mustateel / muraba on satellite",
    icon: FileDown,
    color: "from-rose-500 to-red-600",
  },
];

export default function GeoMapHub({ onSelect }) {
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
          <Link to="/" className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-md transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-sm font-bold font-heading text-slate-800">Geo Map</h1>
            <p className="text-[9px] text-slate-400 font-mono uppercase tracking-widest">GIS · Cadastral Mapping</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <p className="text-xs text-slate-500 mb-4" style={{ fontFamily: URDU }}>ذیلی ماڈیول منتخب کریں</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {SUBMODULES.map((s) => (
            <button
              key={s.key}
              onClick={() => onSelect(s.key)}
              className="flex flex-col items-center gap-3 bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg hover:border-slate-300 hover:-translate-y-0.5 transition-all text-center"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-lg`}>
                <s.icon className="w-7 h-7 text-white" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-slate-800">{s.name}</p>
                <p className="text-[11px] text-slate-500" style={{ fontFamily: URDU }}>{s.urdu}</p>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}