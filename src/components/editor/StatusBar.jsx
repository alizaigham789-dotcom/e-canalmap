import React from "react";
import { ftToPx, pxToFt, DIMENSIONS } from "@/lib/drawingEngine";

export default function StatusBar({ zoom, snapPos, activeTool, objectCount, canalDraftLen }) {
  const toolInfo = {
    select: "Click to select objects",
    pan: "Drag to pan • Scroll to zoom",
    acre: `Click to place Acre block (${DIMENSIONS.ACRE.width}×${DIMENSIONS.ACRE.height} ft)`,
    mustateel: `Click to place Mustateel (${DIMENSIONS.MUSTATEEL.width}×${DIMENSIONS.MUSTATEEL.height} ft)`,
    muraba: `Click to place Muraba (${DIMENSIONS.MURABA.width}×${DIMENSIONS.MURABA.height} ft)`,
    canal: `Click to add points • Double-click to finish${canalDraftLen > 0 ? ` • ${canalDraftLen} points` : ""}`,
    outlet: `Click canal start point${canalDraftLen === 0 ? "" : " • Click end point for arrow direction"}`,
    eraser: "Click object to delete",
  }[activeTool] || "";

  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-[#080d14] border-t border-slate-800/80 text-[10px] font-mono text-slate-500 select-none">
      <div className="flex items-center gap-4">
        <span className="text-blue-500/70">TOOL: <span className="text-blue-400">{activeTool?.toUpperCase()}</span></span>
        <span>{toolInfo}</span>
      </div>
      <div className="flex items-center gap-4">
        {snapPos && (
          <span className="text-slate-600">
            X: <span className="text-slate-400">{Math.round(snapPos.x)}</span> ft
            &nbsp;Y: <span className="text-slate-400">{Math.round(snapPos.y)}</span> ft
          </span>
        )}
        <span>Objects: <span className="text-slate-400">{objectCount}</span></span>
        <span>Zoom: <span className="text-slate-400">{Math.round(zoom * 100)}%</span></span>
      </div>
    </div>
  );
}