import React from "react";
import { FileText, FileImage, Loader2, Layers } from "lucide-react";

const URDU = "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif";

// Floating export bar for the "Mouza Map Export" sub-module — one map per mouza,
// mustateel/muraba drawn as red lines with the other layers dimmed, over the
// satellite/Earth background. The mouza itself is chosen from the top header
// (District → Tehsil → Mouza cascade).
export default function MouzaExportPanel({ village, placedCount, exporting, onExportPDF, onExportPNG }) {
  const ready = placedCount > 0;
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1100] bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 w-[min(94vw,430px)]">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
          <Layers className="w-4 h-4 text-rose-600" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-800" style={{ fontFamily: URDU }}>موضع وار نقشہ ایکسپورٹ</p>
          <p className="text-[10px] text-slate-500 truncate" style={{ fontFamily: URDU }}>
            {village ? `موضع: ${village} — ${placedCount} پلیس شدہ موگہ` : "اوپر سے ضلع / تحصیل / موضع منتخب کریں"}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onExportPDF}
          disabled={exporting || !ready}
          className="flex-1 h-10 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} PDF
        </button>
        <button
          onClick={onExportPNG}
          disabled={exporting || !ready}
          className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileImage className="w-4 h-4" />} PNG
        </button>
      </div>

      {!ready && (
        <p className="text-[10px] text-amber-600 mt-2 text-center" style={{ fontFamily: URDU }}>
          اس موضع کا کوئی نقشہ ابھی سیٹلائٹ پر پلیس نہیں ہوا
        </p>
      )}
      <p className="text-[9px] text-slate-400 mt-1.5 text-center" style={{ fontFamily: URDU }}>
        سرخ لائنیں = مستطیل و مربع · باقی پرتیں مدھم · سیٹلائٹ / Earth بیک گراؤنڈ
      </p>
    </div>
  );
}