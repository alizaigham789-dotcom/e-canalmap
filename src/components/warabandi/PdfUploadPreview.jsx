import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Check, X, Loader2, FileText } from "lucide-react";

// Preview of PDF/image data extracted by AI before it is put into the Parat Warabandi table.
// Shows the header line + an editable table of extracted rows, then lets the user
// confirm (apply to table) or cancel. Edits stay local until "ٹیبل میں ڈال دیں" is pressed.
export default function PdfUploadPreview({ data, onApply, onClose, loading }) {
  const [header, setHeader] = useState(data?.header || {});
  const [rows, setRows] = useState(data?.rows || []);

  useEffect(() => {
    setHeader(data?.header || {});
    setRows(data?.rows || []);
  }, [data]);

  if (loading || !data) {
    return (
      <div className="fixed inset-0 z-[1200] bg-black/60 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-sm font-semibold text-slate-700" style={{ fontFamily: "serif" }}>
            PDF پڑھی جا رہی ہے… ڈیٹا اسکین ہو رہا ہے
          </p>
          <p className="text-[11px] text-slate-400">AI دستاویز سے ہیڈر اور قطاریں نکال رہا ہے</p>
        </div>
      </div>
    );
  }

  const headerLine = [
    "پرت وارہ بندی",
    header.mogha_side && header.mogha_number ? `موگہ نمبری ${header.mogha_side}/${header.mogha_number}` : "",
    header.rajbaha ? `راجباہ ${header.rajbaha}` : "",
    header.mouza ? `موضع ${header.mouza}` : "",
    header.section ? `سیکشن ${header.section}` : "",
    header.sub_division ? `سب ڈویژن ${header.sub_division}` : "",
    header.canal_division ? `کینال ڈویژن ${header.canal_division}` : "",
  ].filter(Boolean).join(" ، ");

  const setH = (k, v) => setHeader(prev => ({ ...prev, [k]: v }));
  const setR = (i, k, v) => setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [k]: v } : r));

  return (
    <div className="fixed inset-0 z-[1200] bg-black/60 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 bg-gradient-to-r from-amber-600 to-amber-700 text-white shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-bold">PDF اسکین پیش منظر</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/20">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Extracted header preview */}
          <div className="border border-amber-200 rounded-xl bg-amber-50/50 p-3">
            <div className="text-[10px] font-bold text-amber-700 uppercase mb-2 flex items-center gap-1.5">
              <Upload className="w-3 h-3" /> ہیڈر معلومات (دستاویز سے نکلا)
            </div>
            <div dir="rtl" className="text-center text-[12px] font-bold text-blue-800 p-2 bg-white rounded-lg border border-slate-200"
              style={{ fontFamily: "'Noto Nastaliq Urdu', serif", lineHeight: 2 }}>
              {headerLine || "ہیڈر نہیں ملا"}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-[10px]">
              {[
                { k: "mogha_number", l: "موگہ نمبری" },
                { k: "mogha_side", l: "موگہ طرف" },
                { k: "rajbaha", l: "راجباہ" },
                { k: "mouza", l: "موضع" },
                { k: "section", l: "سیکشن" },
                { k: "sub_division", l: "سب ڈویژن" },
                { k: "canal_division", l: "کینال ڈویژن" },
              ].map(f => (
                <div key={f.k} className="bg-white border border-slate-200 rounded px-2 py-1">
                  <div className="text-slate-400" style={{ fontFamily: "serif" }}>{f.l}</div>
                  <input
                    value={header[f.k] || ""}
                    onChange={(e) => setH(f.k, e.target.value)}
                    dir="rtl"
                    className="w-full bg-transparent outline-none font-semibold text-slate-700 text-[10px]"
                    style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Extracted rows preview table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700">حصہ داران کی تفصیل — {rows.length} قطاریں (ترمیم ممکن)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]" style={{ borderCollapse: "collapse", direction: "rtl" }}>
                <thead>
                  <tr style={{ backgroundColor: "#dbeafe" }}>
                    {["کھاتہ", "نام مالک", "بندوبست", "کل رقبہ", "غیر ممکن", "خالص", "واری منٹ", "واری گھنٹ", "زائدہ منٹ", "زائدہ گھنٹ", "وضگی منٹ", "وضگی گھنٹ", "لیگا", "دیگا"].map((h, i) => (
                      <th key={i} style={{ border: "1px solid #94a3b8", padding: "3px 2px", textAlign: "center", fontFamily: "'Noto Nastaliq Urdu', serif", color: "#1e3a5f" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={14} className="text-center text-slate-400 py-6">کوئی قطار نہیں ملی — خود بھر لیں یا دوبارہ اپ لوڈ کریں</td></tr>
                  ) : rows.map((r, i) => (
                    <tr key={i} className="even:bg-slate-50/50">
                      {["khatoni","owner_name","bandubast","total_area","ghair_mumkin","khalis_raqba","waari_minute","waari_ghante","zaidah_minute","zaidah_ghante","wazgi_minute","wazgi_ghante","nikha_lega","nikha_dega"].map((k, j) => (
                        <td key={j} style={{ border: "1px solid #e2e8f0", padding: "1px", textAlign: "center", minWidth: 48 }}>
                          <input
                            value={r[k] || ""}
                            onChange={(e) => setR(i, k, e.target.value)}
                            dir={k === "owner_name" ? "rtl" : "ltr"}
                            className="w-full bg-transparent outline-none text-[10px] text-center"
                            style={{ fontFamily: k === "owner_name" ? "'Noto Nastaliq Urdu', serif" : undefined }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-4 h-14 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
          <Button variant="outline" onClick={onClose} className="h-8 text-xs gap-1">
            <X className="w-3.5 h-3.5" /> منسوخ
          </Button>
          <Button onClick={() => onApply({ header, rows })} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
            <Check className="w-3.5 h-3.5" /> ٹیبل میں ڈال دیں
          </Button>
        </div>
      </div>
    </div>
  );
}