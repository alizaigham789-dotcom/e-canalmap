import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Check, X, Loader2, FileText, Plus, Trash2, AlertTriangle, RotateCw } from "lucide-react";

// Full column set matching the Parat Warabandi table (18 data columns).
const COLUMNS = [
  { key: "khatoni",             label: "کھاتہ",      width: 50, dir: "ltr" },
  { key: "owner_name",          label: "نام مالک",    width: 110, dir: "rtl" },
  { key: "bandubast",           label: "بندوبست",    width: 70, dir: "ltr" },
  { key: "total_area",          label: "کل رقبہ",     width: 52, dir: "ltr" },
  { key: "ghair_mumkin",        label: "غیر ممکن",    width: 52, dir: "ltr" },
  { key: "khalis_raqba",        label: "خالص",        width: 52, dir: "ltr" },
  { key: "waari_minute",        label: "واری منٹ",    width: 44, dir: "ltr" },
  { key: "waari_ghante",        label: "واری گھنٹ",   width: 44, dir: "ltr" },
  { key: "zaidah_minute",       label: "زائدہ منٹ",   width: 44, dir: "ltr" },
  { key: "zaidah_ghante",       label: "زائدہ گھنٹ",  width: 44, dir: "ltr" },
  { key: "wazgi_minute",        label: "وضگی منٹ",    width: 44, dir: "ltr" },
  { key: "wazgi_ghante",        label: "وضگی گھنٹ",   width: 44, dir: "ltr" },
  { key: "khalis_waari_minute", label: "خالص واری منٹ",  width: 48, dir: "ltr" },
  { key: "khalis_waari_ghante", label: "خالص واری گھنٹ", width: 48, dir: "ltr" },
  { key: "nikha_lega",          label: "نکہ لیگا",    width: 70, dir: "rtl" },
  { key: "nikha_dega",          label: "نکہ دیگا",    width: 70, dir: "rtl" },
  { key: "tashreeh_din",        label: "اوقات دن",    width: 90, dir: "rtl" },
  { key: "tashreeh_raat",       label: "اوقات رات",   width: 90, dir: "rtl" },
];

const emptyRow = () => COLUMNS.reduce((acc, c) => (acc[c.key] = "", acc), {});

// Preview of PDF/image/Excel data extracted by AI before it is put into the Parat Warabandi table.
// Shows the header line + an editable table of extracted rows, then lets the user
// confirm (apply to table) or cancel. Edits stay local until "ٹیبل میں ڈال دیں" is pressed.
export default function PdfUploadPreview({ data, onApply, onClose, loading }) {
  const isErr = data && data.__error;
  const [header, setHeader] = useState(isErr ? {} : (data?.header || {}));
  const [rows, setRows] = useState(isErr ? [] : (data?.rows || []));

  useEffect(() => {
    const e = data && data.__error;
    setHeader(e ? {} : (data?.header || {}));
    setRows(e ? [] : (data?.rows || []));
  }, [data]);

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 z-[1200] bg-black/60 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-sm font-semibold text-slate-700" style={{ fontFamily: "serif" }}>
            دستاویز پڑھی جا رہی ہے… ڈیٹا اسکین ہو رہا ہے
          </p>
          <p className="text-[11px] text-slate-400 text-center">
            AI دستاویز سے ہیڈر اور قطاریں نکال رہا ہے — اردو نستعلیق OCR ممکنہ طور پر چند سیکنڈ لگتے ہیں
          </p>
        </div>
      </div>
    );
  }

  // Error state — let the user close and retry
  if (isErr) {
    return (
      <div className="fixed inset-0 z-[1200] bg-black/60 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-sm font-bold text-slate-800 text-center" style={{ fontFamily: "serif" }}>
            اسکین ناکام رہا
          </p>
          <p className="text-[11px] text-slate-500 text-center leading-relaxed" style={{ fontFamily: "serif" }}>
            تصویر واضح نہیں یا دستاویز پڑھنے میں مسئلہ ہے۔ براہ کرم واضح تصویر اپ لوڈ کریں یا دوبارہ کوشش کریں۔
          </p>
          <p className="text-[10px] text-slate-400 font-mono break-all max-w-full">{data.__error}</p>
          <Button onClick={onClose} className="h-9 text-xs gap-1.5 bg-slate-700 hover:bg-slate-800 text-white">
            <RotateCw className="w-3.5 h-3.5" /> بند کریں اور دوبارہ کوشش کریں
          </Button>
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
  const addRow = (i) => setRows(prev => { const n = [...prev]; n.splice(i + 1, 0, emptyRow()); return n; });
  const delRow = (i) => setRows(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);

  // Count how many cells are empty to flag quality
  const totalCells = rows.length * COLUMNS.length;
  const filledCells = rows.reduce((acc, r) => acc + COLUMNS.filter(c => (r[c.key] || "").toString().trim()).length, 0);
  const fillPct = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[1200] bg-black/60 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1100px] max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 bg-gradient-to-r from-amber-600 to-amber-700 text-white shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-bold">AI اسکین پیش منظر</span>
            {rows.length > 0 && (
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
                {rows.length} قطاریں · {fillPct}% بھرا
              </span>
            )}
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/20">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Extracted header preview */}
          <div className="border border-amber-200 rounded-xl bg-amber-50/50 p-3">
            <div className="text-[10px] font-bold text-amber-700 uppercase mb-2 flex items-center gap-1.5">
              <Upload className="w-3 h-3" /> ہیڈر معلومات (دستاویز سے نکلا — ترمیم کریں)
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
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">حصہ داران کی تفصیل — {rows.length} قطاریں</span>
              <Button size="sm" onClick={() => setRows(prev => [...prev, emptyRow()])}
                className="h-6 text-[10px] bg-blue-600 hover:bg-blue-700 text-white gap-1 px-2">
                <Plus className="w-3 h-3" /> قطار شامل
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table style={{ borderCollapse: "collapse", width: "100%", direction: "rtl", fontSize: "10px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#dbeafe" }}>
                    <th style={{ border: "1px solid #94a3b8", padding: "3px 2px", width: 28, position: "sticky", right: 0, backgroundColor: "#dbeafe" }}>#</th>
                    {COLUMNS.map(c => (
                      <th key={c.key} style={{ border: "1px solid #94a3b8", padding: "3px 2px", textAlign: "center", minWidth: c.width, fontFamily: "'Noto Nastaliq Urdu', serif", color: "#1e3a5f", fontSize: "9px" }}>
                        {c.label}
                      </th>
                    ))}
                    <th style={{ border: "1px solid #94a3b8", padding: "3px 2px", width: 40 }}>—</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={COLUMNS.length + 2} className="text-center text-slate-400 py-6" style={{ fontFamily: "serif" }}>
                      کوئی قطار نہیں ملی — خود بھر لیں یا واضح تصویر دوبارہ اپ لوڈ کریں
                    </td></tr>
                  ) : rows.map((r, i) => (
                    <tr key={i} className="even:bg-slate-50/50">
                      <td style={{ border: "1px solid #e2e8f0", padding: "1px", textAlign: "center", fontWeight: "bold", color: "#1d4ed8", position: "sticky", right: 0, backgroundColor: i % 2 === 0 ? "#fff" : "#f8fafc" }}>{i + 1}</td>
                      {COLUMNS.map(c => (
                        <td key={c.key} style={{ border: "1px solid #e2e8f0", padding: "1px", textAlign: "center", minWidth: c.width }}>
                          <input
                            value={r[c.key] || ""}
                            onChange={(e) => setR(i, c.key, e.target.value)}
                            dir={c.dir}
                            className="w-full bg-transparent outline-none text-[10px] text-center"
                            style={{ fontFamily: c.dir === "rtl" ? "'Noto Nastaliq Urdu', serif" : undefined }}
                          />
                        </td>
                      ))}
                      <td style={{ border: "1px solid #e2e8f0", padding: "1px", textAlign: "center" }}>
                        <div className="flex items-center justify-center gap-0.5">
                          <button onClick={() => addRow(i)} title="نیا قطار" className="w-5 h-5 flex items-center justify-center text-blue-500 hover:bg-blue-50 rounded">
                            <Plus className="w-3 h-3" />
                          </button>
                          <button onClick={() => delRow(i)} title="حذف" className="w-5 h-5 flex items-center justify-center text-red-400 hover:bg-red-50 rounded">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-[9px] text-slate-400 text-center" style={{ fontFamily: "serif" }}>
              ہر خلیہ ترمیم کے قابل ہے — غلط ڈیٹا درست کر کے "ٹیبل میں ڈال دیں" دبائیں
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-4 h-14 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
          <Button variant="outline" onClick={onClose} className="h-8 text-xs gap-1">
            <X className="w-3.5 h-3.5" /> منسوخ
          </Button>
          <Button onClick={() => onApply({ header, rows })} disabled={rows.length === 0}
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
            <Check className="w-3.5 h-3.5" /> ٹیبل میں ڈال دیں
          </Button>
        </div>
      </div>
    </div>
  );
}