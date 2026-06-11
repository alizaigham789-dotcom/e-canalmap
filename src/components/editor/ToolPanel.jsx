import React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  Square, MousePointer2, Hand, Eraser, Minus,
  Droplets, Layers, RotateCcw, RotateCw, ZoomIn, ZoomOut, Maximize2
} from "lucide-react";

const TOOLS = [
  { id: "select", label: "Select", icon: MousePointer2, group: "nav" },
  { id: "pan", label: "Pan", icon: Hand, group: "nav" },
  null,
  { id: "acre", label: "Acre (220×198 ft)", icon: Square, group: "draw", color: "text-yellow-400" },
  { id: "mustateel", label: "Mustateel (440×990 ft)", icon: Square, group: "draw", color: "text-amber-400" },
  { id: "muraba", label: "Muraba (1100×990 ft)", icon: Square, group: "draw", color: "text-orange-400" },
  null,
  { id: "canal", label: "Canal Tool", icon: Minus, group: "draw", color: "text-blue-400" },
  { id: "outlet", label: "Outlet/Moga Tool", icon: Droplets, group: "draw", color: "text-cyan-400" },
  null,
  { id: "eraser", label: "Eraser", icon: Eraser, group: "edit", color: "text-red-400" },
];

export default function ToolPanel({ activeTool, onToolChange, onUndo, onRedo, onZoomIn, onZoomOut, onFitView, canUndo, canRedo }) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col gap-1 bg-[#0d1420] border border-slate-700/50 rounded-xl p-2 shadow-2xl">
        {TOOLS.map((tool, i) => {
          if (tool === null) return <Separator key={`sep-${i}`} className="bg-slate-700/50 my-0.5" />;
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`w-9 h-9 rounded-lg transition-all ${
                    isActive
                      ? "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20"
                      : `text-slate-500 hover:text-white hover:bg-slate-700/60 ${tool.color || ""}`
                  }`}
                  onClick={() => onToolChange(tool.id)}
                >
                  <Icon className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-slate-800 text-xs border-slate-700">
                {tool.label}
              </TooltipContent>
            </Tooltip>
          );
        })}

        <Separator className="bg-slate-700/50 my-0.5" />

        {/* Undo/Redo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-9 h-9 text-slate-500 hover:text-white hover:bg-slate-700/60 disabled:opacity-30"
              onClick={onUndo} disabled={!canUndo}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 text-xs border-slate-700">Undo</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-9 h-9 text-slate-500 hover:text-white hover:bg-slate-700/60 disabled:opacity-30"
              onClick={onRedo} disabled={!canRedo}>
              <RotateCw className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 text-xs border-slate-700">Redo</TooltipContent>
        </Tooltip>

        <Separator className="bg-slate-700/50 my-0.5" />

        {/* Zoom */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-9 h-9 text-slate-500 hover:text-white hover:bg-slate-700/60" onClick={onZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 text-xs border-slate-700">Zoom In</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-9 h-9 text-slate-500 hover:text-white hover:bg-slate-700/60" onClick={onZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 text-xs border-slate-700">Zoom Out</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-9 h-9 text-slate-500 hover:text-white hover:bg-slate-700/60" onClick={onFitView}>
              <Maximize2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 text-xs border-slate-700">Fit View</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}