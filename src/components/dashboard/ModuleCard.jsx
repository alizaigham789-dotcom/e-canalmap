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

      {/* 3D Icon — multiply blend dissolves the white PNG background into the
          gradient; radial glow + dark base shadow create a "resting on a lit
          surface" 3D effect. */}
      <div className="relative mb-2 sm:mb-3 w-[56px] h-[56px] sm:w-[72px] sm:h-[72px] flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1">
        {/* Soft radial glow behind icon — lit surface */}
        <div className="absolute inset-0 rounded-full bg-white/20 blur-lg" />
        {/* Dark base shadow — grounding / 3D resting effect */}
        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-10 sm:w-14 h-2.5 sm:h-3 rounded-full bg-black/30 blur-sm" />
        <img
          src={mod.icon}
          alt={mod.label}
          className="relative w-[48px] h-[48px] sm:w-[64px] sm:h-[64px] object-contain mix-blend-multiply"
          style={{ filter: "brightness(1.25) contrast(1.05)" }}
        />
      </div>

      {/* Title — bold, prominent, with depth shadow */}
      <div className="relative z-10">
        <p className="text-[11px] sm:text-[13px] font-extrabold text-white tracking-wider leading-tight uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]">{mod.label}</p>
        <p className="text-[9px] sm:text-[10px] text-white/90 mt-1 font-semibold drop-shadow-sm" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>{mod.labelUrdu}</p>
      </div>
    </button>
  );
}