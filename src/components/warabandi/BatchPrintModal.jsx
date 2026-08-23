import React, { useState } from "react";
import { Printer, X } from "lucide-react";
import { buildBatchHTML, printParatBatch } from "@/lib/paratPrint";

// Scoped CSS for the on-screen preview only (does not leak to the app).
const PREVIEW_CSS = `
.batch-preview { direction: rtl; }
.batch-preview .frac { display: inline-flex; flex-direction: column; align-items: center; line-height: 1.1; font-size: 7px; }
.batch-preview .frac .num { border-bottom: 1.5px solid #000; padding-bottom: 1px; }
.batch-preview .signatures { display:flex; justify-content:space-between; margin-top: 24px; font-size: 12px; font-family: 'Noto Nastaliq Urdu', serif; }
.batch-preview .sig-item { text-align:center; border-top:1px solid #333; padding-top:4px; width:200px; white-space:nowrap; }
.batch-preview .parat-page { margin-bottom: 28px; padding-bottom: 18px; border-bottom: 2px dashed #cbd5e1; }
.batch-preview .parat-page:last-child { border-bottom: none; margin-bottom: 0; }
`;

export default function BatchPrintModal({ open, records, onClose }) {
  const [pageSize, setPageSize] = useState("A4");
  const [orientation, setOrientation] = useState("landscape");
  const [printRowSr, setPrintRowSr] = useState(true);

  if (!open) return null;

  const html = buildBatchHTML(records, { printRowSr, printColSr: false });

  const handlePrint = () => {
    printParatBatch(records, { pageSize, orientation, printRowSr, printColSr: false });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-auto py-6">
      <div className="bg-white rounded-xl shadow-2xl max-w-[1300px] w-full mx-4">
        <div className="flex items-center justify-between px-5 py-3 border-b bg-slate-50 rounded-t-xl sticky top-0 z-10">
          <h3 className="text-sm font-bold text-slate-800">
            Batch Print — {records.length} پرت
          </h3>
          <div className="flex gap-3 items-center flex-wrap">
            <label className="flex items-center gap-1 text-[11px] text-slate-700 font-medium" dir="rtl">
              صفحہ:
              <select value={pageSize} onChange={(e) => setPageSize(e.target.value)} className="border border-slate-300 rounded px-1.5 py-1 text-xs bg-white">
                <option value="A4">A4</option>
                <option value="A3">A3</option>
                <option value="A5">A5</option>
                <option value="Legal">Legal</option>
                <option value="Letter">Letter</option>
              </select>
            </label>
            <label className="flex items-center gap-1 text-[11px] text-slate-700 font-medium" dir="rtl">
              رخ:
              <select value={orientation} onChange={(e) => setOrientation(e.target.value)} className="border border-slate-300 rounded px-1.5 py-1 text-xs bg-white">
                <option value="landscape">Landscape</option>
                <option value="portrait">Portrait</option>
              </select>
            </label>
            <label className="flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer" dir="rtl">
              <input type="checkbox" checked={printRowSr} onChange={(e) => setPrintRowSr(e.target.checked)} className="w-3 h-3" />
              قطار نمبرشمار
            </label>
            <button onClick={handlePrint} className="px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 flex items-center gap-1">
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </button>
            <button onClick={onClose} className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs rounded-lg hover:bg-slate-300 flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> بند کریں
            </button>
          </div>
        </div>
        <div className="p-6 overflow-x-auto max-h-[78vh] overflow-y-auto">
          <style>{PREVIEW_CSS}</style>
          {records.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">کوئی پرت منتخب نہیں</div>
          ) : (
            <div className="batch-preview" dangerouslySetInnerHTML={{ __html: html }} />
          )}
        </div>
      </div>
    </div>
  );
}