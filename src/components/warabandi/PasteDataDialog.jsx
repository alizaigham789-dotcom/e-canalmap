import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClipboardPaste, X, ArrowDownToLine } from "lucide-react";

// Column order for pasted Excel data (left-to-right as copied from Excel).
// This matches the main table's data columns (excluding serial numbers).
const PASTE_COLUMNS = [
  "khatoni", "owner_name", "bandubast", "total_area", "ghair_mumkin",
  "khalis_raqba", "waari_minute", "waari_ghante",
  "zaidah_minute", "zaidah_ghante", "wazgi_minute", "wazgi_ghante",
  "khalis_waari_minute", "khalis_waari_ghante",
  "nikha_lega", "nikha_dega", "tashreeh_din", "tashreeh_raat",
];

const COLUMN_LABELS_URDU = {
  khatoni: "کھاتہ نمبر",
  owner_name: "نام مالک",
  bandubast: "بندوبست",
  total_area: "کل رقبہ",
  ghair_mumkin: "غیر ممکن",
  khalis_raqba: "خالص رقبہ",
  waari_minute: "واری منٹ",
  waari_ghante: "واری گھنٹہ",
  zaidah_minute: "زائدہ منٹ",
  zaidah_ghante: "زائدہ گھنٹہ",
  wazgi_minute: "وضگی منٹ",
  wazgi_ghante: "وضگی گھنٹہ",
  khalis_waari_minute: "خالص واری منٹ",
  khalis_waari_ghante: "خالص واری گھنٹہ",
  nikha_lega: "نکہ لیگا",
  nikha_dega: "نکہ دیگا",
  tashreeh_din: "اوقات دن",
  tashreeh_raat: "اوقات رات",
};

// Parse pasted text (tab or multi-space separated, newline-separated rows)
function parsePastedData(text) {
  if (!text || !text.trim()) return [];
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  return lines.map(line => {
    // Split on tab first; if no tabs, split on 2+ spaces
    let cells = line.includes("\t") ? line.split("\t") : line.split(/\s{2,}/);
    // Trim each cell
    cells = cells.map(c => c.trim());
    const row = {};
    PASTE_COLUMNS.forEach((key, idx) => {
      row[key] = cells[idx] !== undefined ? cells[idx] : "";
    });
    return row;
  });
}

export default function PasteDataDialog({ onClose, onApply }) {
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState([]);

  const handleParse = () => {
    setParsed(parsePastedData(raw));
  };

  const handleApply = () => {
    const rows = parsePastedData(raw);
    if (rows.length === 0) return;
    onApply(rows);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-auto py-6">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 flex flex-col" style={{ maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-slate-50 rounded-t-xl">
          <div className="flex items-center gap-2">
            <ClipboardPaste className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">کاپی پیسٹ ڈیٹا — Excel سے جدول میں</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto" dir="rtl">
          {/* Instructions */}
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-800 leading-relaxed">
            <p className="font-bold mb-1" style={{ fontFamily: "serif" }}>طریقہ:</p>
            <ol className="list-decimal pr-4 space-y-0.5" style={{ fontFamily: "serif" }}>
              <li>Excel میں اپنا ڈیٹا منتخب کریں (کالم کی ترتیب نیچے دی گئی ہے)۔</li>
              <li>Ctrl+C سے کاپی کریں اور نیچے باکس میں Ctrl+V سے پیسٹ کریں۔</li>
              <li>"پیش نظارہ" دبائیں — ڈیٹا قطاروں میں تبدیل ہو جائے گا۔</li>
              <li>"جدول میں ڈالیں" دبائیں — نیچے والی جدول میں خود بخود بھر جائے گا۔</li>
            </ol>
          </div>

          {/* Column order hint */}
          <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded">
            <p className="text-[10px] font-bold text-amber-800 mb-1" style={{ fontFamily: "serif" }}>
              کالم کی ترتیب (بائیں سے دائیں):
            </p>
            <div className="flex flex-wrap gap-1" dir="ltr">
              {PASTE_COLUMNS.map((key, i) => (
                <span key={key} className="text-[9px] bg-white border border-amber-300 rounded px-1.5 py-0.5 text-amber-700">
                  {i + 1}. {COLUMN_LABELS_URDU[key]}
                </span>
              ))}
            </div>
          </div>

          {/* Textarea */}
          <textarea
            value={raw}
            onChange={e => setRaw(e.target.value)}
            rows={8}
            dir="ltr"
            placeholder="یہاں Excel سے کاپی کردہ ڈیٹا پیسٹ کریں..."
            className="w-full border border-slate-300 rounded-lg p-3 text-xs font-mono text-slate-800 bg-white focus:outline-none focus:border-blue-400 resize-y"
            style={{ direction: "ltr", textAlign: "left" }}
          />

          {/* Preview */}
          {parsed.length > 0 && (
            <div className="mt-4 border border-slate-200 rounded overflow-x-auto">
              <p className="text-[10px] font-bold text-slate-600 p-2 bg-slate-50 border-b" style={{ fontFamily: "serif" }}>
                پیش نظارہ ({parsed.length} قطاریں)
              </p>
              <table style={{ borderCollapse: "collapse", fontSize: "9px", width: "100%", direction: "ltr" }}>
                <thead>
                  <tr style={{ backgroundColor: "#dbeafe" }}>
                    <th style={{ border: "1px solid #ccc", padding: "2px 3px", fontSize: "8px" }}>#</th>
                    {PASTE_COLUMNS.map(key => (
                      <th key={key} style={{ border: "1px solid #ccc", padding: "2px 3px", fontSize: "8px" }}>
                        {COLUMN_LABELS_URDU[key]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(0, 10).map((row, i) => (
                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#f8faff" : "#fff" }}>
                      <td style={{ border: "1px solid #ccc", padding: "2px 3px", textAlign: "center" }}>{i + 1}</td>
                      {PASTE_COLUMNS.map(key => (
                        <td key={key} style={{ border: "1px solid #ccc", padding: "2px 3px", textAlign: "center" }}>
                          {row[key] || "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.length > 10 && (
                <p className="text-[9px] text-slate-400 p-1 text-center">... اور {parsed.length - 10} قطاریں</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t bg-slate-50 rounded-b-xl">
          <Button size="sm" variant="outline" onClick={onClose} className="h-8 text-xs gap-1">
            <X className="w-3 h-3" /> بند کریں
          </Button>
          <Button size="sm" variant="outline" onClick={handleParse} disabled={!raw.trim()}
            className="h-8 text-xs gap-1 border-blue-200 text-blue-700 hover:bg-blue-50">
            پیش نظارہ
          </Button>
          <Button size="sm" onClick={handleApply} disabled={!raw.trim()}
            className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
            <ArrowDownToLine className="w-3 h-3" /> جدول میں ڈالیں
          </Button>
        </div>
      </div>
    </div>
  );
}

export { PASTE_COLUMNS };