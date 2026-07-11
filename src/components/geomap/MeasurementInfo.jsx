import React from "react";
import { fmtDist, fmtArea, fmtDistFeet, sqMetersToUnits } from "@/lib/geoOverlay";

export default function MeasurementInfo({ measurement, draft, zoom }) {
  if (!measurement && !draft) return null;

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-2xl border border-slate-200 flex items-center gap-4 max-w-[90vw]">
      {measurement?.type === "line" && (
        <div className="flex items-center gap-3 text-xs">
          <span className="font-bold text-blue-600 text-sm">{fmtDistFeet(measurement.length)}</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500 font-mono">{measurement.length.toFixed(1)} m</span>
        </div>
      )}
      {measurement?.type === "circle" && (
        <div className="flex items-center gap-3 text-xs">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase">Radius</span>
            <span className="font-bold text-blue-600">{fmtDistFeet(measurement.radius)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase">Diameter</span>
            <span className="font-bold text-slate-700">{fmtDistFeet(measurement.diameter)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase">Circumference</span>
            <span className="font-bold text-slate-700">{fmtDistFeet(measurement.circumference)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase">Area</span>
            <span className="font-bold text-green-600">{fmtArea(measurement.area)}</span>
          </div>
        </div>
      )}
      {measurement?.type === "rectangle" && (
        <div className="flex items-center gap-3 text-xs">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase">Width</span>
            <span className="font-bold text-blue-600">{fmtDistFeet(measurement.width)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase">Height</span>
            <span className="font-bold text-slate-700">{fmtDistFeet(measurement.height)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase">Area</span>
            <span className="font-bold text-green-600">{fmtArea(measurement.area)}</span>
          </div>
        </div>
      )}
      {measurement?.type === "polygon" && (
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase">Perimeter</span>
            <span className="font-bold text-blue-600">{fmtDistFeet(measurement.perimeter)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase">Acres</span>
            <span className="font-bold text-green-600">{sqMetersToUnits(measurement.area).acres.toFixed(3)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase">Kanal</span>
            <span className="font-bold text-green-700">{sqMetersToUnits(measurement.area).kanal.toFixed(2)}</span>
          </div>
        </div>
      )}
      {draft && draft.type === "polygon" && draft.points.length >= 2 && (
        <span className="text-[10px] text-slate-500">Drawing… {draft.points.length} pts · Click to add, double-click to finish</span>
      )}
      {draft && draft.type === "line" && draft.points.length >= 2 && (
        <span className="text-[10px] text-slate-500 font-bold">{fmtDistFeet(draft.length)} · Click to add point</span>
      )}
      {draft && draft.type === "circle" && (
        <span className="text-[10px] text-slate-500">Radius: {fmtDistFeet(draft.radius)} · Click to finish</span>
      )}
      {draft && draft.type === "rectangle" && draft.points.length === 1 && (
        <span className="text-[10px] text-slate-500">Click opposite corner…</span>
      )}
    </div>
  );
}