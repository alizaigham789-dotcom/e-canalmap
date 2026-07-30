import React from "react";
import { FileText, MousePointerClick, PenTool } from "lucide-react";

// Responsive toolbar for the Form-1 allocation actions (Killa toggle, Form 1
// Register, Cell Allocate, Draw Patch). On desktop it sits at the top-right;
// on mobile/tablet it becomes a full-width, horizontally scrollable row below
// the header so every option stays visible and usable.
export default function AllocationToolbar({
  killaVisible,
  onToggleKilla,
  onForm1,
  allocTool,
  onSetAllocTool,
}) {
  const btn =
    "h-8 rounded-full shadow-xl text-[10px] font-bold transition-all flex items-center gap-1 whitespace-nowrap shrink-0";

  return (
    <div className="absolute z-[1000] flex items-center gap-1.5 overflow-x-auto no-scrollbar top-28 left-2 right-2 sm:top-14 sm:left-auto sm:right-3 sm:max-w-none sm:justify-end">
      <button
        onClick={onToggleKilla}
        className={`${btn} px-2 ${killaVisible ? "bg-emerald-500 text-white" : "bg-white text-slate-400"}`}
      >
        Killa #{killaVisible ? "On" : "Off"}
      </button>
      <button
        onClick={onForm1}
        className={`${btn} px-3 bg-amber-600 text-white hover:bg-amber-700`}
      >
        <FileText className="w-3 h-3" />
        Form 1 Register
      </button>
      <button
        onClick={() => onSetAllocTool(allocTool === "cell" ? null : "cell")}
        className={`${btn} px-3 ${allocTool === "cell" ? "bg-green-600 text-white" : "bg-white text-slate-600"}`}
      >
        <MousePointerClick className="w-3 h-3" />
        Cell Allocate
      </button>
      <button
        onClick={() => onSetAllocTool(allocTool === "draw" ? null : "draw")}
        className={`${btn} px-3 ${allocTool === "draw" ? "bg-indigo-600 text-white" : "bg-white text-slate-600"}`}
      >
        <PenTool className="w-3 h-3" />
        Draw Patch
      </button>
    </div>
  );
}