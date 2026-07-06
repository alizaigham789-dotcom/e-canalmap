import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Printer, Loader2, Eye, EyeOff } from "lucide-react";

export default function BulkPrintDialog({ open, onClose, onPrint, selectedCount }) {
  const [pageSize, setPageSize] = useState("A4");
  const [orientation, setOrientation] = useState("landscape");
  const [bwMode, setBwMode] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [printing, setPrinting] = useState(false);

  const handlePrint = async () => {
    setPrinting(true);
    try {
      await onPrint({ pageSize, orientation, bwMode, showLegend });
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !printing && onClose()}>
      <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-base flex items-center gap-2">
            <Printer className="w-4 h-4 text-blue-600" />
            Bulk Print PDF — {selectedCount} Map(s)
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Page Size */}
          <div>
            <label className="text-xs text-slate-500 font-semibold block mb-1.5">Page Size</label>
            <div className="flex gap-2">
              {["A4", "A3", "A2", "A1", "A0"].map(s => (
                <button
                  key={s}
                  onClick={() => setPageSize(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${pageSize === s ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Orientation */}
          <div>
            <label className="text-xs text-slate-500 font-semibold block mb-1.5">Orientation</label>
            <div className="flex gap-2">
              <button
                onClick={() => setOrientation("landscape")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${orientation === "landscape" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
              >
                ⬌ Landscape
              </button>
              <button
                onClick={() => setOrientation("portrait")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${orientation === "portrait" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
              >
                ⬍ Portrait
              </button>
            </div>
          </div>

          {/* B&W Mode */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={bwMode} onChange={e => setBwMode(e.target.checked)} className="w-4 h-4 accent-blue-600" />
            <span className="text-xs text-slate-600">Black & White Mode (⬛)</span>
          </label>

          {/* Legend */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showLegend} onChange={e => setShowLegend(e.target.checked)} className="w-4 h-4 accent-blue-600" />
            <span className="text-xs text-slate-600" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>علامات دکھائیں (Show Legend)</span>
          </label>

          {/* Summary */}
          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
            <div className="flex justify-between mb-1">
              <span>Maps:</span>
              <span className="font-bold text-slate-700">{selectedCount}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Page:</span>
              <span className="font-bold text-slate-700">{pageSize} {orientation}</span>
            </div>
            <div className="flex justify-between">
              <span>Mode:</span>
              <span className="font-bold text-slate-700">{bwMode ? "B&W" : "Colour"} • {showLegend ? "Legend On" : "Legend Off"}</span>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={printing} className="text-slate-500">Cancel</Button>
          <Button
            onClick={handlePrint}
            disabled={printing}
            className="bg-green-600 hover:bg-green-500 text-white gap-2"
          >
            {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            {printing ? "Generating…" : "Generate PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}