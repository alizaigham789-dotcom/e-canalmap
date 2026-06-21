import React from "react";
import { ftToPx, pxToFt, DIMENSIONS } from "@/lib/drawingEngine";

export default function StatusBar({ zoom, snapPos, activeTool, objectCount, canalDraftLen }) {
  const toolInfo = {
    select: "Click to select objects",
    move: "Drag mustateel/muraba parcels to reposition",
    pan: "Drag to pan • Scroll to zoom",
    acre: `Click to place Acre block (${DIMENSIONS.ACRE.width}×${DIMENSIONS.ACRE.height} ft)`,
    mustateel: `Click to place Mustateel (${DIMENSIONS.MUSTATEEL.width}×${DIMENSIONS.MUSTATEEL.height} ft)`,
    muraba: `Click to place Muraba (${DIMENSIONS.MURABA.width}×${DIMENSIONS.MURABA.height} ft)`,
    canal: `Click to add points • Double-click to finish${canalDraftLen > 0 ? ` • ${canalDraftLen} points` : ""}`,
    outlet: `Click canal start point${canalDraftLen === 0 ? "" : " • Click end point for arrow direction"}`,
    khal: `Click to add points • Double-click to finish${canalDraftLen > 0 ? ` • ${canalDraftLen} points` : ""}`,
    road: `Click to add points • Double-click to finish${canalDraftLen > 0 ? ` • ${canalDraftLen} points` : ""}`,
    chakbandi: `Click to add points • Double-click to finish${canalDraftLen > 0 ? ` • ${canalDraftLen} points` : ""}`,
    eraser: "Click object to delete",
  }[activeTool] || "";

  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-white border-t border-slate-200 text-[10px] font-mono text-slate-500 select-none shadow-sm">
      <div className="flex items-center gap-4">
        <span className="text-blue-600/80">TOOL: <span className="text-blue-700 font-semibold">{activeTool?.toUpperCase()}</span></span>
        <span className="text-slate-500">{toolInfo}</span>
      </div>
      <div className="flex items-center gap-4">
        {snapPos && (
          <span className="text-slate-500">
            X: <span className="text-slate-700">{Math.round(snapPos.x)}</span> ft
            &nbsp;Y: <span className="text-slate-700">{Math.round(snapPos.y)}</span> ft
          </span>
        )}
        <span>Objects: <span className="text-slate-700">{objectCount}</span></span>
        <span>Zoom: <span className="text-slate-700">{Math.round(zoom * 100)}%</span></span>
      </div>
    </div>
  );
}