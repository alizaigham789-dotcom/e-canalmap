import React from "react";
import { Lock } from "lucide-react";

export default function ModuleCard({ mod, locked, subLocked, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={locked}
      className={`group relative rounded-[20px] sm:rounded-[24px] bg-gradient-to-br ${mod.bg} p-3 sm:p-4 shadow-lg ${mod.shadow} transition-all duration-300 text-center min-h-[130px] sm:min-h-[155px] flex flex-col items-center justify-center overflow-hidden
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

      {/* 3D Icon — frosted glass disc (light) contrasts with dark icons so they pop.
          mix-blend-darken dissolves the white PNG background into the disc color
          without darkening the icon and without any hover white flash. */}
      <div className="relative mb-2 sm:mb-3 w-[56px] h-[56px] sm:w-[72px] sm:h-[72px] flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1">
        {/* Dark drop shadow under disc — grounding / 3D depth */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-11 sm:w-14 h-2.5 sm:h-3 rounded-full bg-black/35 blur-sm" />
        {/* Frosted glass disc — light surface for dark icons */}
        <div className="relative w-[54px] h-[54px] sm:w-[68px] sm:h-[68px] rounded-2xl bg-gradient-to-br from-white/90 to-slate-200/80 ring-1 ring-white/70 shadow-[inset_0_2px_5px_rgba(255,255,255,0.9),inset_0_-3px_6px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.25)] flex items-center justify-center overflow-hidden isolation-isolate">
          <img
            src={mod.icon}
            alt={mod.label}
            className="w-[40px] h-[40px] sm:w-[52px] sm:h-[52px] object-contain mix-blend-darken"
            style={{ filter: "brightness(1.08) contrast(1.08)" }}
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