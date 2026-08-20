import React, { useState } from "react";
import { ArrowRight, ArrowLeft, Grid3x3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createMustateel, DIMENSIONS } from "@/lib/gisEngine";

// Easy mustateel grid builder — type one number range per line (e.g. "1-10",
// "22-32") and the tool lays mustateels out in rows. Each new row starts
// directly below the previous row's LAST mustateel and the direction
// alternates (snake / boustrophedon), so "22" lands below "10". The first-row
// direction (Left→Right / Right→Left) is chosen with the arrow buttons.
export default function MustateelGridDialog({ zoom, pan, canvasRef, onAddObjects, onClose }) {
  const [rangesText, setRangesText] = useState("");
  const [direction, setDirection] = useState("ltr");

  const parseRange = (line) => {
    const m = line.trim().match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (m) {
      const a = parseInt(m[1], 10), b = parseInt(m[2], 10);
      const nums = [];
      if (a <= b) for (let i = a; i <= b; i++) nums.push(i);
      else for (let i = a; i >= b; i--) nums.push(i);
      return nums;
    }
    const single = parseInt(line.trim(), 10);
    if (!isNaN(single)) return [single];
    return [];
  };

  const handleDraw = () => {
    const lines = rangesText.split(/\n+/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    const mustW = DIMENSIONS.MUSTATEEL.width;
    const mustH = DIMENSIONS.MUSTATEEL.height;

    // Origin = visible top-left, snapped to the mustateel grid (keeps alignment)
    let ox = 0, oy = 0;
    const canvas = canvasRef?.current?.getCanvas?.();
    if (canvas && zoom) {
      const worldLeft = -pan.x / zoom;
      const worldTop = -pan.y / zoom;
      ox = Math.round(worldLeft / mustW) * mustW + mustW;
      oy = Math.round(worldTop / mustH) * mustH + mustH;
    }

    let dir = direction === "rtl" ? -1 : 1;
    let curX = ox, curY = oy;
    const objs = [];
    for (const line of lines) {
      const nums = parseRange(line);
      if (nums.length === 0) continue;
      let x = curX;
      const y = curY;
      for (const n of nums) {
        const obj = createMustateel(x, y);
        obj.label = String(n);
        objs.push(obj);
        x += dir * mustW;
      }
      curX = x - dir * mustW; // last placed mustateel's x → next row starts below it
      curY = y + mustH;
      dir = -dir; // snake: alternate direction each row
    }

    if (objs.length === 0) return;
    onAddObjects(objs);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-5 w-[360px] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid3x3 className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-bold text-slate-800 font-heading">Mustateel Grid Builder</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Enter mustateel number ranges — one row per line (e.g. <span className="font-mono text-slate-700">1-10</span>).
          Each new row starts directly below the previous row's last mustateel and the direction alternates (snake),
          so <span className="font-mono text-slate-700">22</span> lands below <span className="font-mono text-slate-700">10</span>.
        </p>
        <div>
          <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Ranges (one row per line)</label>
          <textarea
            value={rangesText}
            onChange={e => setRangesText(e.target.value)}
            placeholder={"1-10\n22-32\n41-50"}
            rows={5}
            className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-md p-2 focus:border-red-400 focus:outline-none"
            autoFocus
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">Direction (first row)</label>
          <div className="flex gap-2">
            <button
              onClick={() => setDirection("ltr")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md border text-xs font-medium transition-colors ${direction === "ltr" ? "bg-blue-600 text-white border-blue-500" : "bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300"}`}>
              <ArrowRight className="w-4 h-4" /> Left → Right
            </button>
            <button
              onClick={() => setDirection("rtl")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md border text-xs font-medium transition-colors ${direction === "rtl" ? "bg-blue-600 text-white border-blue-500" : "bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300"}`}>
              <ArrowLeft className="w-4 h-4" /> Right → Left
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Subsequent rows alternate automatically (snake layout).</p>
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDraw}>Draw Mustateels</Button>
        </div>
      </div>
    </div>
  );
}