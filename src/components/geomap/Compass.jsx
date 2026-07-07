import React from "react";
import { Navigation } from "lucide-react";

export default function Compass() {
  return (
    <div className="absolute top-16 right-3 z-[1000]">
      <div className="w-12 h-12 bg-white rounded-full shadow-xl border border-slate-200 flex items-center justify-center relative">
        <Navigation className="w-5 h-5 text-red-500" style={{ transform: "rotate(-45deg)" }} />
        <span className="absolute top-0.5 text-[9px] font-bold text-slate-700">N</span>
      </div>
    </div>
  );
}