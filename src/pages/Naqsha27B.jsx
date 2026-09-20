import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2, Printer, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { escapeHtml } from "@/lib/escapeHtml";

const URDU_FONT = "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif";

const emptyRow = (sr) => ({
  id: Date.now() + Math.random(),
  sr: sr,
  pages: "",
  date_inclusion: "",
  name: "",
  remarks: "",
});

const INITIAL_ROWS = Array.from({ length: 14 }, (_, i) => emptyRow(i + 1));

export default function Naqsha27B() {
  const queryClient = useQueryClient();
  const [header, setHeader] = useState({ village: "", tehsil: "", district: "", date_reference: "", date_decision: "", register_number: "" });
  const [rows, setRows] = useState(INITIAL_ROWS);
  const [recordId, setRecordId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Load record if editing via ?id= param
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get("id");

  const { data: editRecord } = useQuery({
    queryKey: ["naqsha27b", editId],
    queryFn: () => base44.entities.Naqsha27B.filter({ id: editId }).then(r => r[0]),
    enabled: !!editId,
  });

  useEffect(() => {
    if (editRecord) {
      setRecordId(editRecord.id);
      setHeader({
        village: editRecord.village || "",
        tehsil: editRecord.tehsil || "",
        district: editRecord.district || "",
        date_reference: editRecord.date_reference || "",
        date_decision: editRecord.date_decision || "",
        register_number: editRecord.register_number || "",
      });
      try {
        const loaded = JSON.parse(editRecord.rows_json || "[]");
        if (loaded.length > 0) setRows(loaded);
      } catch {}
    }
  }, [editRecord?.id]);

  const updateRow = (id, key, val) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r));

  const addRow = () => setRows(prev => [...prev, emptyRow(prev.length + 1)]);

  const removeRow = (id) => setRows(prev => prev.filter(r => r.id !== id));

  const handleSave = async () => {
    if (!header.village.trim()) { toast.error("نام گاؤں ضروری ہے"); return; }
    setSaving(true);
    try {
      const data = {
        village: header.village,
        tehsil: header.tehsil,
        district: header.district,
        date_reference: header.date_reference,
        date_decision: header.date_decision,
        register_number: header.register_number,
        rows_json: JSON.stringify(rows),
      };
      if (recordId) {
        await base44.entities.Naqsha27B.update(recordId, data);
        toast.success("ریکارڈ اپڈیٹ ہو گیا");
      } else {
        const created = await base44.entities.Naqsha27B.create(data);
        setRecordId(created.id);
        toast.success("نیا ریکارڈ محفوظ ہو گیا");
      }
      queryClient.invalidateQueries({ queryKey: ["naqsha27b"] });
    } catch (e) {
      toast.error("محفوظ نہیں ہو سکا");
    }
    setSaving(false);
  };

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=900,height=700");
    const esc = escapeHtml;
    const headerFields = (label, val) =>
      `<span style="display:inline-block; margin: 0 12px;">
        <span style="font-weight:bold;">${label}</span>
        <span style="border-bottom:1.5px solid #000; display:inline-block; min-width:100px; text-align:center; padding:0 8px;">${val ? esc(val) : "&nbsp;"}</span>
      </span>`;

    const tableRows = rows.map((r, i) =>
      `<tr>
        <td style="border:1px solid #000; padding:4px 8px; text-align:center; height:28px;">${esc(r.sr || i + 1)}</td>
        <td style="border:1px solid #000; padding:4px 8px; text-align:center;">${esc(r.pages || "")}</td>
        <td style="border:1px solid #000; padding:4px 8px; text-align:center;">${esc(r.date_inclusion || "")}</td>
        <td style="border:1px solid #000; padding:4px 8px; text-align:right;">${esc(r.name || "")}</td>
        <td style="border:1px solid #000; padding:4px 8px;">${esc(r.remarks || "")}</td>
      </tr>`).join("");

    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>نقشہ نمبر 27B</title>
      <style>
        @font-face { font-family: 'Jameel Noori Nastaleeq'; src: url('https://cdn.jsdelivr.net/gh/tariq-abdullah/urdu-web-font-CDN/JameelNooriNastaleeq.woff') format('woff'); font-display: swap; }
        @page { size: A4 portrait; margin: 12mm; }
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: ${URDU_FONT}; direction:rtl; padding: 16px 24px; }
        h1 { text-align:center; font-size:22px; font-weight:bold; margin-bottom:4px; }
        h2 { text-align:center; font-size:16px; font-weight:bold; margin-bottom:16px; }
        .meta-row { display:flex; justify-content:center; gap:8px; margin-bottom:8px; font-size:13px; }
        .blank-line { border-bottom:1px solid #000; height:18px; margin:8px 0; }
        table { width:100%; border-collapse:collapse; font-size:12px; }
        th { border:1px solid #000; padding:5px 8px; text-align:center; font-weight:bold; background:#f5f5f5; }
        td { font-size:12px; }
      </style></head><body>
      <h1>نقشہ نمبر 27B نہر</h1>
      <h2>انڈیکس کاغزات</h2>
      <div class="meta-row">
        ${headerFields("نام گاؤں", header.village)}
        ${headerFields("تحصیل", header.tehsil)}
        ${headerFields("ضلع", header.district)}
      </div>
      <div class="blank-line"></div>
      <div class="meta-row">
        ${headerFields("تاریخ مرجوعہ", header.date_reference)}
        ${headerFields("تاریخ فیصلہ", header.date_decision)}
        ${headerFields("نمبر رجسٹر", header.register_number)}
      </div>
      <table style="margin-top:10px;">
        <thead><tr>
          <th style="width:8%;">نمبر شمار</th>
          <th style="width:12%;">تعداد اوراق</th>
          <th style="width:18%;">تاریخ شمولیت مثل</th>
          <th style="width:42%;">نام کاغز یا مثل</th>
          <th style="width:20%;">کیفیت</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
      </body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 800);
  };

  const inp = "border-b border-slate-300 bg-transparent text-xs text-center outline-none focus:border-blue-400 px-1 py-0.5";
  const tableInp = "w-full px-1 py-1.5 text-xs outline-none bg-transparent text-center";

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/canal-patwari">
              <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500 hover:text-slate-800">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-sm font-bold font-heading text-slate-800">Naqsha 27-B</h1>
              <p className="text-[9px] text-slate-400" style={{ fontFamily: "serif" }}>نقشہ نمبر 27B نہر — انڈیکس کاغزات</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} variant="outline" className="gap-1.5 text-xs h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} محفوظ کریں
            </Button>
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs h-8">
              <Printer className="w-3.5 h-3.5" /> پرنٹ
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5">
        {/* Form Preview — matches the document layout */}
        <div className="bg-white rounded-xl border border-slate-300 shadow-sm p-6" style={{ direction: "rtl", fontFamily: URDU_FONT }}>
          {/* Title */}
          <h1 className="text-center text-xl font-bold mb-1">نقشہ نمبر 27B نہر</h1>
          <h2 className="text-center text-base font-bold mb-4">انڈیکس کاغزات</h2>

          {/* Metadata Row 1 */}
          <div className="flex justify-center gap-4 mb-2 text-sm">
            <label className="flex items-center gap-1.5">
              <span className="font-bold whitespace-nowrap">نام گاؤں</span>
              <input
                value={header.village}
                onChange={e => setHeader(p => ({ ...p, village: e.target.value }))}
                className={inp + " min-w-[120px]"}
                style={{ fontFamily: URDU_FONT }}
                dir="rtl"
              />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="font-bold whitespace-nowrap">تحصیل</span>
              <input
                value={header.tehsil}
                onChange={e => setHeader(p => ({ ...p, tehsil: e.target.value }))}
                className={inp + " min-w-[100px]"}
                style={{ fontFamily: URDU_FONT }}
                dir="rtl"
              />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="font-bold whitespace-nowrap">ضلع</span>
              <input
                value={header.district}
                onChange={e => setHeader(p => ({ ...p, district: e.target.value }))}
                className={inp + " min-w-[100px]"}
                style={{ fontFamily: URDU_FONT }}
                dir="rtl"
              />
            </label>
          </div>

          {/* Blank line */}
          <div className="border-b border-slate-400 h-5 my-2"></div>

          {/* Metadata Row 3 */}
          <div className="flex justify-center gap-4 mb-3 text-sm">
            <label className="flex items-center gap-1.5">
              <span className="font-bold whitespace-nowrap">تاریخ مرجوعہ</span>
              <input
                value={header.date_reference}
                onChange={e => setHeader(p => ({ ...p, date_reference: e.target.value }))}
                className={inp + " min-w-[100px]"}
                style={{ fontFamily: URDU_FONT }}
                dir="rtl"
                placeholder="—"
              />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="font-bold whitespace-nowrap">تاریخ فیصلہ</span>
              <input
                value={header.date_decision}
                onChange={e => setHeader(p => ({ ...p, date_decision: e.target.value }))}
                className={inp + " min-w-[100px]"}
                style={{ fontFamily: URDU_FONT }}
                dir="rtl"
                placeholder="—"
              />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="font-bold whitespace-nowrap">نمبر رجسٹر</span>
              <input
                value={header.register_number}
                onChange={e => setHeader(p => ({ ...p, register_number: e.target.value }))}
                className={inp + " min-w-[100px]"}
                style={{ fontFamily: URDU_FONT }}
                dir="rtl"
                placeholder="—"
              />
            </label>
          </div>

          {/* Table */}
          <table className="w-full border-collapse" dir="rtl" style={{ fontFamily: URDU_FONT }}>
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-500 px-2 py-2 text-xs font-bold" style={{ width: "8%" }}>نمبر شمار</th>
                <th className="border border-slate-500 px-2 py-2 text-xs font-bold" style={{ width: "12%" }}>تعداد اوراق</th>
                <th className="border border-slate-500 px-2 py-2 text-xs font-bold" style={{ width: "18%" }}>تاریخ شمولیت مثل</th>
                <th className="border border-slate-500 px-2 py-2 text-xs font-bold" style={{ width: "42%" }}>نام کاغز یا مثل</th>
                <th className="border border-slate-500 px-2 py-2 text-xs font-bold" style={{ width: "20%" }}>کیفیت</th>
                <th className="border border-slate-500 px-1 py-2" style={{ width: "32px" }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="border border-slate-400 p-0">
                    <div className="text-center text-xs py-2">{r.sr || i + 1}</div>
                  </td>
                  <td className="border border-slate-400 p-0">
                    <input
                      value={r.pages}
                      onChange={e => updateRow(r.id, "pages", e.target.value)}
                      className={tableInp}
                      style={{ fontFamily: URDU_FONT }}
                      dir="rtl"
                    />
                  </td>
                  <td className="border border-slate-400 p-0">
                    <input
                      value={r.date_inclusion}
                      onChange={e => updateRow(r.id, "date_inclusion", e.target.value)}
                      className={tableInp}
                      style={{ fontFamily: URDU_FONT }}
                      dir="rtl"
                      placeholder="—"
                    />
                  </td>
                  <td className="border border-slate-400 p-0">
                    <input
                      value={r.name}
                      onChange={e => updateRow(r.id, "name", e.target.value)}
                      className={tableInp + " text-right"}
                      style={{ fontFamily: URDU_FONT }}
                      dir="rtl"
                      placeholder="—"
                    />
                  </td>
                  <td className="border border-slate-400 p-0">
                    <input
                      value={r.remarks}
                      onChange={e => updateRow(r.id, "remarks", e.target.value)}
                      className={tableInp}
                      style={{ fontFamily: URDU_FONT }}
                      dir="rtl"
                      placeholder="—"
                    />
                  </td>
                  <td className="border border-slate-400 px-1 py-1 text-center">
                    <button
                      onClick={() => removeRow(r.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                      title="قطار حذف کریں"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Add Row Button */}
          <div className="flex justify-center mt-3">
            <Button size="sm" variant="outline" onClick={addRow} className="gap-1.5 text-xs h-7 border-cyan-300 text-cyan-700 hover:bg-cyan-50">
              <Plus className="w-3.5 h-3.5" /> قطار شامل کریں
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}