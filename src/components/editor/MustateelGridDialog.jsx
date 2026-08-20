import React, { useState } from "react";
import { ArrowRight, ArrowLeft, Grid3x3, X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createMustateel, DIMENSIONS } from "@/lib/gisEngine";

let rowIdSeq = 1;

// Easy mustateel grid builder. Each row draws a line of mustateels:
//   Start #  → first mustateel number
//   Next     → how many mustateels in this row
//   Below #  → the upper mustateel number this row starts directly under
//   Direction → Left→Right or Right→Left (per row)
// "Below #" resolves against existing map mustateels AND mustateels generated
// by earlier rows in this same batch, so rows stack under the exact mustateel
// the user names. Add Row to keep drawing more lines.
export default function MustateelGridDialog({ zoom, pan, canvasRef, objects = [], onAddObjects, onClose }) {
  const [rows, setRows] = useState([
    { id: rowIdSeq++, start: 1, count: 10, below: "", direction: "ltr" },
  ]);

  const updateRow = (id, key, val) => setRows(rs => rs.map(r => r.id === id ? { ...r, [key]: val } : r));

  const addRow = () => setRows(rs => {
    const last = rs[rs.length - 1];
    const lastStart = Number(last.start) || 0;
    const lastCount = Number(last.count) || 0;
    return [...rs, {
      id: rowIdSeq++,
      start: lastStart + lastCount,
      count: last.count || 10,
      below: String(lastStart + lastCount - 1),
      direction: last.direction === "ltr" ? "rtl" : "ltr",
    }];
  });

  const removeRow = (id) => setRows(rs => rs.length > 1 ? rs.filter(r => r.id !== id) : rs);

  const findAnchor = (labelStr, generated) => {
    if (labelStr === "" || labelStr === undefined || labelStr === null) return null;
    const key = String(labelStr);
    const g = generated.find(o => String(o.label) === key);
    if (g) return g;
    return objects.find(o => o.type === "mustateel" && String(o.label) === key);
  };

  const handleDraw = () => {
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
    const generated = [];
    for (const row of rows) {
      const start = Number(row.start) || 0;
      const count = Math.max(1, Number(row.count) || 1);
      const anchor = findAnchor(row.below, generated);
      let x = anchor ? anchor.x : ox;
      let y = anchor ? anchor.y + mustH : oy;
      const dir = row.direction === "rtl" ? -1 : 1;
      for (let i = 0; i < count; i++) {
        const obj = createMustateel(x, y);
        obj.label = String(start + i);
        generated.push(obj);
        x += dir * mustW;
      }
    }
    if (generated.length === 0) return;
    onAddObjects(generated);
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
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Each row draws a line of mustateels. Set <b>Start #</b>, how many (<b>Next</b>), which upper mustateel to start <b>below</b>, and the direction. Each row aligns directly under the mustateel number you enter.
        </p>

        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div key={row.id} className="border border-slate-200 rounded-lg p-2.5 space-y-2 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Row {idx + 1}</span>
                {rows.length > 1 && (
                  <button onClick={() => removeRow(row.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] text-slate-400 uppercase block mb-0.5">Start #</label>
                  <Input type="number" value={row.start} onChange={e => updateRow(row.id, "start", e.target.value)} className="h-7 text-xs font-mono" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-400 uppercase block mb-0.5">Next</label>
                  <Input type="number" value={row.count} onChange={e => updateRow(row.id, "count", e.target.value)} className="h-7 text-xs font-mono" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-400 uppercase block mb-0.5">Below #</label>
                  <Input type="number" value={row.below} onChange={e => updateRow(row.id, "below", e.target.value)} placeholder="origin" className="h-7 text-xs font-mono" />
                </div>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => updateRow(row.id, "direction", "ltr")}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border text-[11px] font-medium transition-colors ${row.direction === "ltr" ? "bg-blue-600 text-white border-blue-500" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}>
                  <ArrowRight className="w-3.5 h-3.5" /> Left → Right
                </button>
                <button onClick={() => updateRow(row.id, "direction", "rtl")}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border text-[11px] font-medium transition-colors ${row.direction === "rtl" ? "bg-blue-600 text-white border-blue-500" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}>
                  <ArrowLeft className="w-3.5 h-3.5" /> Right → Left
                </button>
              </div>
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" className="w-full border-dashed text-slate-500" onClick={addRow}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
        </Button>

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDraw}>Draw Mustateels</Button>
        </div>
      </div>
    </div>
  );
}