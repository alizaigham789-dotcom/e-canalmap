import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  RectangleVertical, RectangleHorizontal,
  MousePointer2, Hand, Eraser, Move,
  RotateCcw, RotateCw, ZoomIn, ZoomOut, Maximize2, Waves, AlertTriangle, Ruler
} from "lucide-react";

// ---- Custom SVG Icons matching technical tool names ----

// Canal: distinct double bank lines with light blue accent
const CanalIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 7h18" />
    <path d="M3 17h18" />
    <path d="M3 12h18" strokeWidth="1" strokeOpacity="0.5" />
  </svg>
);

// Road: parallel solid casing edges with dashed lane divider
const RoadIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M8 3v18" />
    <path d="M16 3v18" />
    <path d="M12 5v2M12 10v2M12 15v2" strokeWidth="2" strokeOpacity="0.7" />
  </svg>
);

// Moga / Outlet: structured block with directional arrow
const MogaIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="9" height="9" rx="1" />
    <path d="M12 7.5h6" />
    <path d="M15 4.5l3.5 3-3.5 3" />
  </svg>
);

// Chakbandi: structured grid / cadastral boundary layout
const ChakbandiIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="1" />
    <path d="M3 9h18M3 15h18M9 3v18M15 3v18" strokeWidth="1.3" strokeOpacity="0.6" />
  </svg>
);

// Mouza Boundary: dotted dashed line representing village/mouza boundary
const MouzaIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4l16 16" strokeDasharray="2 3" />
    <path d="M20 4L4 20" strokeDasharray="2 3" />
  </svg>
);

// Bridge (پل): red dotted ladder lines representing a bridge
const BridgeIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 6h16" strokeDasharray="3 2" />
    <path d="M4 18h16" strokeDasharray="3 2" />
    <path d="M6 6v12M10 6v12M14 6v12M18 6v12" strokeWidth="1.5" strokeDasharray="2 2" />
  </svg>
);

// Railway (ریلوے): two rails with perpendicular sleepers
const RailwayIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 4v16" />
    <path d="M19 4v16" />
    <path d="M5 8h14M5 13h14M5 18h14" strokeWidth="1.4" strokeOpacity="0.7" />
  </svg>
);

// Each tool carries a short English `name` shown under the icon.
const TOOLS = [
  { id: "select", name: "Select", label: "Select / Move (V) — click to select, drag to move", icon: MousePointer2, group: "nav" },
  { id: "pan", name: "Pan", label: "Pan (H)", icon: Hand, group: "nav" },
  { id: "canalMove", name: "Canal Move", label: "Canal Move — drag only canals (attached chakbandis & mogas follow)", icon: Move, group: "nav", color: "text-blue-400" },
  null,
  { id: "eraser", name: "Eraser", label: "Eraser (E)", icon: Eraser, group: "edit", color: "text-red-400" },
  { id: "mustateel", name: "Mustateel", label: "Mustateel 440×990 ft (M)", icon: RectangleVertical, group: "draw", color: "text-red-400" },
  { id: "muraba", name: "Muraba", label: "Muraba 1100×990 ft (B)", icon: RectangleHorizontal, group: "draw", color: "text-red-500" },
  null,
  { id: "canal", name: "Canal", label: "Canal Tool (C)", icon: CanalIcon, group: "draw", color: "text-blue-400" },
  { id: "chakbandi", name: "Chakbandi", label: "Chakbandi Line (K)", icon: ChakbandiIcon, group: "draw", color: "text-green-400" },
  { id: "outlet", name: "Moga", label: "Outlet / Moga (O)", icon: MogaIcon, group: "draw", color: "text-cyan-400" },
  { id: "khal", name: "Khal", label: "Watercourse (W)", icon: Waves, group: "draw", color: "text-blue-500" },
  { id: "road", name: "Road", label: "Road (R)", icon: RoadIcon, group: "draw", color: "text-amber-400" },
  { id: "railway", name: "Railway", label: "Railway Track / ریلوے (T)", icon: RailwayIcon, group: "draw", color: "text-slate-600" },
  { id: "mouza", name: "Mouza", label: "Mouza Boundary (U)", icon: MouzaIcon, group: "draw", color: "text-slate-700" },
  { id: "damageMarker", name: "Damage", label: "Canal Damage Marker (G)", icon: AlertTriangle, group: "draw", color: "text-red-500" },
  { id: "measure", name: "Measure", label: "Measure Distance (X)", icon: Ruler, group: "draw", color: "text-purple-500" },
];

export default function ToolPanel({ activeTool, onToolChange, onUndo, onRedo, onZoomIn, onZoomOut, onFitView, canUndo, canRedo }) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col gap-0.5 sm:gap-1 bg-white border border-slate-200 rounded-xl p-1.5 sm:p-2 shadow-lg max-h-[calc(100vh-180px)] sm:max-h-none overflow-y-auto">
        {TOOLS.map((tool, i) => {
          if (tool === null) return <Separator key={`sep-${i}`} className="bg-slate-200 my-0.5" />;
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          const isChakbandi = tool.id === "chakbandi";

          // Active colour theme per tool group
          const activeTheme = isChakbandi
            ? "bg-gradient-to-br from-green-500 to-emerald-700 border-green-400 text-white shadow-green-500/40"
            : "bg-gradient-to-br from-blue-500 to-blue-700 border-blue-400 text-white shadow-lg shadow-blue-500/30";
          const inactiveTheme = isChakbandi
            ? "bg-gradient-to-br from-green-50 to-emerald-100 border-green-300 text-green-700 hover:from-green-500 hover:to-emerald-700 hover:text-white hover:border-green-400"
            : `border border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100 ${tool.color || ""}`;

          return (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onToolChange(tool.id)}
                  className={`
                    relative w-[52px] h-[50px] sm:w-[64px] sm:h-[58px] rounded-xl transition-all duration-200 flex flex-col items-center justify-center gap-0.5
                    border-2 shadow-sm shrink-0 group overflow-hidden
                    ${isActive ? activeTheme : inactiveTheme}
                  `}
                >
                  {isActive && <span className="absolute inset-0 rounded-xl bg-white/10 animate-pulse pointer-events-none" />}
                  <Icon className={isActive ? "w-4 h-4 sm:w-5 sm:h-5 drop-shadow-sm" : "w-4 h-4"} />
                  <span className={`text-[7px] sm:text-[8px] font-bold leading-none tracking-wide uppercase truncate max-w-full px-0.5 ${isActive ? "text-white/95" : "text-slate-600 group-hover:text-white"}`}>
                    {tool.name}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-slate-800 text-white text-xs border-slate-700">
                {tool.label}
              </TooltipContent>
            </Tooltip>
          );
        })}

        <Separator className="bg-slate-200 my-0.5" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={onUndo} disabled={!canUndo} className="w-[52px] h-[42px] sm:w-[64px] rounded-lg border border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 shrink-0 flex flex-col items-center justify-center gap-0.5">
              <RotateCcw className="w-4 h-4" />
              <span className="text-[7px] sm:text-[8px] font-bold uppercase text-slate-500">Undo</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 text-white text-xs border-slate-700">Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={onRedo} disabled={!canRedo} className="w-[52px] h-[42px] sm:w-[64px] rounded-lg border border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 shrink-0 flex flex-col items-center justify-center gap-0.5">
              <RotateCw className="w-4 h-4" />
              <span className="text-[7px] sm:text-[8px] font-bold uppercase text-slate-500">Redo</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 text-white text-xs border-slate-700">Redo (Ctrl+Y)</TooltipContent>
        </Tooltip>

        <Separator className="bg-slate-200 my-0.5" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={onZoomIn} className="w-[52px] h-[42px] sm:w-[64px] rounded-lg border border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100 shrink-0 flex flex-col items-center justify-center gap-0.5">
              <ZoomIn className="w-4 h-4" />
              <span className="text-[7px] sm:text-[8px] font-bold uppercase text-slate-500">Zoom+</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 text-white text-xs border-slate-700">Zoom In (+)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={onZoomOut} className="w-[52px] h-[42px] sm:w-[64px] rounded-lg border border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100 shrink-0 flex flex-col items-center justify-center gap-0.5">
              <ZoomOut className="w-4 h-4" />
              <span className="text-[7px] sm:text-[8px] font-bold uppercase text-slate-500">Zoom−</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 text-white text-xs border-slate-700">Zoom Out (−)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={onFitView} className="w-[52px] h-[42px] sm:w-[64px] rounded-lg border border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100 shrink-0 flex flex-col items-center justify-center gap-0.5">
              <Maximize2 className="w-4 h-4" />
              <span className="text-[7px] sm:text-[8px] font-bold uppercase text-slate-500">Fit</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 text-white text-xs border-slate-700">Fit View (F)</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}