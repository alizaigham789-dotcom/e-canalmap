import React from "react";
import { Lock } from "lucide-react";

export default function ModuleCard({ mod, locked, subLocked, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={locked}
      className={`group relative rounded-[20px] sm:rounded-[24px] bg-gradient-to-br ${mod.bg} p-3 sm:p-4 shadow-lg ${mod.shadow} transition-all duration-300 text-center min-h-[145px] sm:min-h-[175px] flex flex-col items-center justify-center overflow-hidden
        ${locked ? "opacity-60 cursor-not-allowed" : "hover:shadow-2xl hover:scale-[1.05] active:scale-[0.97] cursor-pointer"}`}
    >
      {/* Glossy top sheen */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />

      {/* Lock badge */}
      {(locked || subLocked) && (
        <div className="absolute top-2.5 right-2.5 bg-black/30 backdrop-blur-sm rounded-full p-1 z-20">
          <Lock className="w-3 h-3 text-white" />
        </div>
      )}

      {/* 3D Icon — contrasting colored disc makes dark icons pop.
          mix-blend-darken dissolves the white PNG background into the disc color. */}
      <div className="relative mb-2 sm:mb-3 w-[64px] h-[64px] sm:w-[84px] sm:h-[84px] flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1">
        {/* Dark drop shadow under disc — grounding / 3D depth */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 sm:w-16 h-3 sm:h-3.5 rounded-full bg-black/40 blur-sm" />
        {/* Contrasting colored disc — 3D raised platform */}
        <div className={`relative w-[60px] h-[60px] sm:w-[80px] sm:h-[80px] rounded-2xl bg-gradient-to-br ${mod.disc} ring-1 ring-white/60 shadow-[inset_0_2px_6px_rgba(255,255,255,0.55),inset_0_-3px_8px_rgba(0,0,0,0.22),0_5px_14px_rgba(0,0,0,0.3)] flex items-center justify-center overflow-hidden isolation-isolate`}>
          <img
            src={mod.icon}
            alt={mod.label}
            className="relative w-[50px] h-[50px] sm:w-[66px] sm:h-[66px] object-contain mix-blend-darken"
            style={{ filter: "brightness(1.1) contrast(1.1)" }}
          />
        </div>
      </div>

      {/* Title — bold, prominent, with depth shadow */}
      <div className="relative z-10">
        <p className="text-[11px] sm:text-[13px] font-extrabold text-white tracking-wider leading-tight uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]">{mod.label}</p>
        <p className="text-[9px] sm:text-[10px] text-white/90 mt-1 font-semibold drop-shadow-sm" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>{mod.labelUrdu}</p>
      </div>
    </button>
  );
}