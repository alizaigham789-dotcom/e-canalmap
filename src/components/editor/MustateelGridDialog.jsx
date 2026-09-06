import React, { useState } from "react";
import { ArrowRight, ArrowLeft, Grid3x3, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createMustateel, DIMENSIONS } from "@/lib/gisEngine";
import { toast } from "sonner";
import AiMapDrawChat from "@/components/editor/AiMapDrawChat";

// Incremental line-by-line mustateel builder.
// Draw one line -> it stays on the map -> draw the next line below it.
// Each line: Start # / End # / Below # / Direction. After drawing, the next
// line auto-continues from the End # (chaining) but every field stays editable.
// "AI Map Draw" tab: an interactive assistant that asks step-by-step questions
// and draws the full map (mustateels + canal + chakbandi).
export default function MustateelGridDialog({ zoom, pan, canvasRef, objects = [], onAddObjects, onClose }) {
  const [line, setLine] = useState({ start: 1, end: 10, below: "", direction: "ltr" });
  const [history, setHistory] = useState([]);
  const [mode, setMode] = useState("builder");

  const mustW = DIMENSIONS.MUSTATEEL.width;
  const mustH = DIMENSIONS.MUSTATEEL.height;

  const origin = () => {
    let ox = 0, oy = 0;
    const canvas = canvasRef?.current?.getCanvas?.();
    if (canvas && zoom) {
      const worldLeft = -pan.x / zoom;
      const worldTop = -pan.y / zoom;
      ox = Math.round(worldLeft / mustW) * mustW + mustW;
      oy = Math.round(worldTop / mustH) * mustH + mustH;
    }
    return { ox, oy };
  };

  const findAnchor = (labelStr) => {
    if (labelStr === "" || labelStr === undefined || labelStr === null) return null;
    const key = String(labelStr);
    return objects.find(o => o.type === "mustateel" && String(o.label) === key);
  };

  const drawLine = (cfg) => {
    const start = Number(cfg.start) || 0;
    const end = Number(cfg.end) || start;
    const count = Math.max(1, end - start + 1);
    const { ox, oy } = origin();
    const anchor = findAnchor(cfg.below);
    let x = anchor ? anchor.x : ox;
    let y = anchor ? anchor.y + mustH : oy;
    const dir = cfg.direction === "rtl" ? -1 : 1;
    const generated = [];
    for (let i = 0; i < count; i++) {
      const obj = createMustateel(x, y);
      obj.label = String(start + i);
      generated.push(obj);
      x += dir * mustW;
    }
    return generated;
  };

  const handleDrawLine = () => {
    const generated = drawLine(line);
    if (generated.length === 0) { toast.warning("Line is empty"); return; }
    onAddObjects(generated);
    setHistory(h => [...h, { ...line, count: generated.length }]);
    // Auto-advance: next line continues from the End # and toggles direction (snake).
    const endNum = Number(line.end) || Number(line.start) || 0;
    const count = Math.max(1, endNum - (Number(line.start) || 0) + 1);
    const nextStart = endNum + 1;
    setLine({
      start: nextStart,
      end: nextStart + count - 1,
      below: String(endNum),
      direction: line.direction === "ltr" ? "rtl" : "ltr",
    });
    toast.success(`Drew ${generated.length} mustateels (${line.start}–${line.end})`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-5 w-[420px] max-w-full max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid3x3 className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-bold text-slate-800 font-heading">Mustateel Grid Builder</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg">
          <button onClick={() => setMode("builder")}
            className={`flex-1 py-1.5 rounded-md text-[11px] font-medium transition-colors ${mode === "builder" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
            Line Builder
          </button>
          <button onClick={() => setMode("ai")}
            className={`flex-1 py-1.5 rounded-md text-[11px] font-medium transition-colors ${mode === "ai" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
            AI Map Draw
          </button>
        </div>

        {mode === "builder" ? (
          <>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Draw one line of mustateels (<b>Start #</b> → <b>End #</b>) starting <b>below</b> the number you enter. The line stays on the map. The next line auto-continues from the End # — edit any field to place it exactly (e.g. 1120 below 855, drawing back).
            </p>

            <div className="border border-slate-200 rounded-lg p-2.5 space-y-2 bg-slate-50/60">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] text-slate-400 uppercase block mb-0.5">Start #</label>
                  <Input type="number" value={line.start} onChange={e => setLine(l => ({ ...l, start: e.target.value }))} className="h-7 text-xs font-mono" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-400 uppercase block mb-0.5">End #</label>
                  <Input type="number" value={line.end} onChange={e => setLine(l => ({ ...l, end: e.target.value }))} className="h-7 text-xs font-mono" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-400 uppercase block mb-0.5">Below #</label>
                  <Input type="number" value={line.below} onChange={e => setLine(l => ({ ...l, below: e.target.value }))} placeholder="origin" className="h-7 text-xs font-mono" />
                </div>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => setLine(l => ({ ...l, direction: "ltr" }))}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border text-[11px] font-medium transition-colors ${line.direction === "ltr" ? "bg-blue-600 text-white border-blue-500" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}>
                  <ArrowRight className="w-3.5 h-3.5" /> Left → Right
                </button>
                <button onClick={() => setLine(l => ({ ...l, direction: "rtl" }))}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border text-[11px] font-medium transition-colors ${line.direction === "rtl" ? "bg-blue-600 text-white border-blue-500" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}>
                  <ArrowLeft className="w-3.5 h-3.5" /> Right → Left
                </button>
              </div>
            </div>

            <Button size="sm" className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={handleDrawLine}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Draw Line & Continue
            </Button>

            {history.length > 0 && (
              <div className="space-y-1 max-h-28 overflow-y-auto no-scrollbar">
                <p className="text-[9px] text-slate-400 uppercase font-bold">Drawn lines ({history.length})</p>
                {history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 rounded px-2 py-1 text-[10px] text-slate-500">
                    <span className="font-mono">{h.start}–{h.end}</span>
                    <span>{h.direction === "ltr" ? "→" : "←"} below {h.below || "origin"}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <AiMapDrawChat zoom={zoom} pan={pan} canvasRef={canvasRef} objects={objects} onAddObjects={onAddObjects} />
        )}

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}