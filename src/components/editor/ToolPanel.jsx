import React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  Square, RectangleVertical, RectangleHorizontal,
  MousePointer2, Hand, Eraser,
  RotateCcw, RotateCw, ZoomIn, ZoomOut, Maximize2, Move, Waves, AlertTriangle
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

const TOOLS = [
  { id: "select", label: "Select (V)", icon: MousePointer2, group: "nav" },
  { id: "pan", label: "Pan (H)", icon: Hand, group: "nav" },
  null,
  { id: "move", label: "Move (D) — drag parcels", icon: Move, group: "edit", color: "text-orange-400" },
  null,
  { id: "acre", label: "Acre 220×198 ft (A)", icon: Square, group: "draw", color: "text-yellow-400" },
  { id: "mustateel", label: "Mustateel 440×990 ft (M)", icon: RectangleVertical, group: "draw", color: "text-red-400" },
  { id: "muraba", label: "Muraba 1100×990 ft (B)", icon: RectangleHorizontal, group: "draw", color: "text-red-500" },
  null,
  { id: "canal", label: "Canal Tool (C)", icon: CanalIcon, group: "draw", color: "text-blue-400" },
  { id: "chakbandi", label: "Chakbandi Line (K)", icon: ChakbandiIcon, group: "draw", color: "text-green-400" },
  { id: "outlet", label: "Outlet / Moga (O)", icon: MogaIcon, group: "draw", color: "text-cyan-400" },
  { id: "khal", label: "Khal / Watercourse (W)", icon: Waves, group: "draw", color: "text-blue-500" },
  { id: "road", label: "Road (R)", icon: RoadIcon, group: "draw", color: "text-amber-400" },
  { id: "mouza", label: "Mouza Boundary (U)", icon: MouzaIcon, group: "draw", color: "text-slate-700" },
  { id: "damageMarker", label: "Canal Damage Marker (G)", icon: AlertTriangle, group: "draw", color: "text-red-500" },
  null,
  { id: "eraser", label: "Eraser (E)", icon: Eraser, group: "edit", color: "text-red-400" },
];

export default function ToolPanel({ activeTool, onToolChange, onUndo, onRedo, onZoomIn, onZoomOut, onFitView, canUndo, canRedo }) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col gap-1 bg-white border border-slate-200 rounded-xl p-2 shadow-lg">
        {TOOLS.map((tool, i) => {
          if (tool === null) return <Separator key={`sep-${i}`} className="bg-slate-200 my-0.5" />;
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          const activeClass = tool.id === "chakbandi"
            ? "bg-green-700 text-white hover:bg-green-600 shadow-lg shadow-green-500/20"
            : "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20";
          return (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`w-9 h-9 rounded-lg transition-all ${
                    isActive
                      ? activeClass
                      : `text-slate-500 hover:text-slate-800 hover:bg-slate-100 ${tool.color || ""}`
                  }`}
                  onClick={() => onToolChange(tool.id)}
                >
                  <Icon className="w-4 h-4" />
                </Button>
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
            <Button variant="ghost" size="icon" className="w-9 h-9 text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30"
              onClick={onUndo} disabled={!canUndo}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 text-white text-xs border-slate-700">Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-9 h-9 text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30"
              onClick={onRedo} disabled={!canRedo}>
              <RotateCw className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 text-white text-xs border-slate-700">Redo (Ctrl+Y)</TooltipContent>
        </Tooltip>

        <Separator className="bg-slate-200 my-0.5" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-9 h-9 text-slate-500 hover:text-slate-800 hover:bg-slate-100" onClick={onZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 text-white text-xs border-slate-700">Zoom In (+)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-9 h-9 text-slate-500 hover:text-slate-800 hover:bg-slate-100" onClick={onZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 text-white text-xs border-slate-700">Zoom Out (-)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-9 h-9 text-slate-500 hover:text-slate-800 hover:bg-slate-100" onClick={onFitView}>
              <Maximize2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 text-white text-xs border-slate-700">Fit View (F)</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}