import React from "react";
import { Lock } from "lucide-react";

export default function ModuleCard({ mod, locked, subLocked, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={locked}
      className={`group relative rounded-[20px] sm:rounded-[24px] bg-gradient-to-br ${mod.bg} p-3 sm:p-4 shadow-lg ${mod.shadow} transition-all duration-300 text-center min-h-[190px] sm:min-h-[230px] flex flex-col items-center justify-center gap-1.5 sm:gap-2 overflow-hidden
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

      {/* English title — top */}
      <p className="relative z-10 text-[11px] sm:text-[13px] font-extrabold text-white tracking-wider leading-tight uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]">{mod.label}</p>

      {/* 3D Icon — centered middle, contrasting colored disc */}
      <div className="relative w-[100px] h-[100px] sm:w-[128px] sm:h-[128px] flex items-center justify-center transition-all duration-300 group-hover:scale-110">
        {/* Dark drop shadow under disc — grounding / 3D depth */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-18 sm:w-22 h-3.5 sm:h-4 rounded-full bg-black/40 blur-sm" />
        {/* Contrasting colored disc — 3D raised platform */}
        <div className={`relative w-[100px] h-[100px] sm:w-[128px] sm:h-[128px] rounded-2xl bg-gradient-to-br ${mod.disc} ring-1 ring-white/60 shadow-[inset_0_3px_8px_rgba(255,255,255,0.55),inset_0_-4px_10px_rgba(0,0,0,0.22),0_6px_18px_rgba(0,0,0,0.3)] flex items-center justify-center overflow-hidden isolation-isolate`}>
          <img
            src={mod.icon}
            alt={mod.label}
            className="relative w-[88px] h-[88px] sm:w-[112px] sm:h-[112px] object-contain mix-blend-darken"
            style={{ filter: "brightness(1.1) contrast(1.1)" }}
          />
        </div>
      </div>

      {/* Urdu title — bottom */}
      <p className="relative z-10 text-[10px] sm:text-[12px] text-white/95 font-semibold drop-shadow-sm" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>{mod.labelUrdu}</p>
    </button>
  );
}