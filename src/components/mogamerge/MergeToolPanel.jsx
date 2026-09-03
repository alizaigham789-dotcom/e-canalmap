// Slim tool panel for Moga Merge — mirrors the editor's ToolPanel look
// but exposes ONLY Move + Hand (pan) tools, plus zoom utilities.
import React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Move, Hand, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

const TOOLS = [
  { id: "move", label: "Move (D) — drag whole moga", icon: Move },
  { id: "pan", label: "Pan (H) — drag canvas", icon: Hand },
];

export default function MergeToolPanel({ activeTool, onToolChange, onZoomIn, onZoomOut, onFitView }) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col gap-0.5 sm:gap-1 bg-white border border-slate-200 rounded-xl p-1.5 sm:p-2 shadow-lg max-h-[calc(100vh-180px)] sm:max-h-none overflow-y-auto">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          const activeClass = "bg-gradient-to-br from-blue-500 to-blue-700 border-blue-400 text-white shadow-lg shadow-blue-500/30";
          return (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onToolChange(tool.id)}
                  className={`${
                    isActive
                      ? "w-11 h-11 sm:w-[52px] sm:h-[52px] rounded-xl border-2 " + activeClass
                      : "w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  } transition-all duration-200 flex items-center justify-center shrink-0`}
                >
                  <Icon className={isActive ? "w-5 h-5 sm:w-6 sm:h-6" : "w-4 h-4"} />
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
            <Button variant="ghost" size="icon" className="w-8 h-8 sm:w-9 sm:h-9 text-slate-500 hover:text-slate-800 hover:bg-slate-100 shrink-0" onClick={onZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 text-white text-xs border-slate-700">Zoom In (+)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8 sm:w-9 sm:h-9 text-slate-500 hover:text-slate-800 hover:bg-slate-100 shrink-0" onClick={onZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 text-white text-xs border-slate-700">Zoom Out (-)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8 sm:w-9 sm:h-9 text-slate-500 hover:text-slate-800 hover:bg-slate-100 shrink-0" onClick={onFitView}>
              <Maximize2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 text-white text-xs border-slate-700">Fit View (F)</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}