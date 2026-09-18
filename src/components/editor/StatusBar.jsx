import React from "react";
import { DIMENSIONS } from "@/lib/gisEngine";

export default function StatusBar({ zoom, snapPos, activeTool, objectCount, canalDraftLen, onUndo, onRedo, canUndo, canRedo }) {
  const toolInfo = {
    select: "Click to select • Double-click parcel to edit centroid label",
    move: "Drag parcels — snaps to grid & adjacent edges automatically",
    pan: "Drag to pan • Scroll to zoom",
    acre: `Click to place Acre block (${DIMENSIONS.ACRE.width}×${DIMENSIONS.ACRE.height} ft)`,
    mustateel: `Click to place Mustateel — auto-labels M-1, M-2… (${DIMENSIONS.MUSTATEEL.width}×${DIMENSIONS.MUSTATEEL.height} ft)`,
    muraba: `Click to place Muraba — auto-labels MR-1, MR-2… (${DIMENSIONS.MURABA.width}×${DIMENSIONS.MURABA.height} ft)`,
    canal: `Two parallel lines • Click to add points • Double-click to finish${canalDraftLen > 0 ? ` • ${canalDraftLen} pts` : ""}`,
    outlet: `Click canal start point${canalDraftLen === 0 ? "" : " • Click end point for arrow direction"}`,
    khal: `Two parallel lines • Click to add points • Double-click to finish${canalDraftLen > 0 ? ` • ${canalDraftLen} pts` : ""}`,
    road: `Two parallel lines • Click to add points • Double-click to finish${canalDraftLen > 0 ? ` • ${canalDraftLen} pts` : ""}`,
    chakbandi: `Click to add points • Double-click to finish${canalDraftLen > 0 ? ` • ${canalDraftLen} pts` : ""}`,
    eraser: "Click object to delete",
  }[activeTool] || "";

  return (
    <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 bg-white border-t border-slate-200 text-[10px] font-mono text-slate-500 select-none shadow-sm overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <span className="text-blue-600/80">TOOL: <span className="text-blue-700 font-semibold">{activeTool?.toUpperCase()}</span></span>
        <span className="text-slate-500 hidden sm:inline">{toolInfo}</span>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {snapPos && (
          <span className="text-slate-500">
            X:<span className="text-slate-700">{Math.round(snapPos.x)}</span>
            &nbsp;Y:<span className="text-slate-700">{Math.round(snapPos.y)}</span>
          </span>
        )}
        <span>Obj: <span className="text-slate-700">{objectCount}</span></span>
        <span className="hidden sm:inline">Zoom: <span className="text-slate-700">{Math.round(zoom * 100)}%</span></span>
      </div>
    </div>
  );
}