import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Printer, Save } from "lucide-react";

const URDU = "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif";
const EMPTY_ROW = { name: "", khasra: "", area: "", crop: "خریف", abiana: "", signature: "" };

// Composed header line — same fields as the Map Editor / Warabandi Parat header,
// prefixed with "Fard Masrooba Najaiz Aabpashi Mogha Number".
function buildFardHeader(d) {
  const mogha = d.mogha_number ? `${d.mogha_number}${d.mogha_side ? `/${d.mogha_side}` : ""}` : "_____";
  return `فرد مسروبہ ناجائز آبپاشی موگہ نمبری\u2009${mogha}،\u2009راجباہ ${d.rajbah || "_____"}،\u2009موضع ${d.village || "_____"}،\u2009ضلعداری سیکشن ${d.section || "_____"}،\u2009سب ڈویژن ${d.tehsil || "_____"}،\u2009کینال ڈویژن ${d.district || "_____"}`;
}

const HEADER_FIELDS = [
  { key: "mogha_number", label: "موگہ نمبری" },
  { key: "mogha_side", label: "سائیڈ", side: true },
  { key: "rajbah", label: "راجباہ" },
  { key: "village", label: "موضع" },
  { key: "section", label: "ضلعداری سیکشن" },
  { key: "tehsil", label: "سب ڈویژن" },
  { key: "district", label: "کینال ڈویژن" },
];

export default function FardMasroobaForm({ initial, onSave }) {
  const [data, setData] = useState(() => ({
    mogha_number: "", mogha_side: "", rajbah: "", village: "", section: "", tehsil: "", district: "",
    ...(initial || {}),
  }));
  const [rows, setRows] = useState(() => {
    try { return JSON.parse(initial?.rows_json || "[]"); } catch { return []; }
  });

  useEffect(() => {
    if (!initial) return;
    setData(d => ({ mogha_number: "", mogha_side: "", rajbah: "", village: "", section: "", tehsil: "", district: "", ...d, ...initial }));
    try { setRows(JSON.parse(initial.rows_json || "[]")); } catch { setRows([]); }
  }, [initial?.id]);

  const setField = (k, v) => setData(d => ({ ...d, [k]: v }));
  const setRow = (i, k, v) => setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addRow = () => setRows(rs => [...rs, { ...EMPTY_ROW }]);
  const delRow = (i) => setRows(rs => rs.filter((_, idx) => idx !== i));

  const totalAbiana = rows.reduce((s, r) => s + (parseFloat(r.abiana) || 0), 0);
  const totalArea = rows.reduce((s, r) => s + (parseFloat(r.area) || 0), 0);

  const handleSave = () => {
    onSave({
      ...data,
      rows_json: JSON.stringify(rows),
      total_abiana: totalAbiana,
      total_area: totalArea,
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .fm-input { border: none !important; background: transparent !important; box-shadow: none !important; }
          .fm-table { box-shadow: none !important; }
        }
      `}</style>

      {/* Header input fields */}
      <div className="no-print grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 bg-white p-3 rounded-lg border border-slate-200">
        {HEADER_FIELDS.map(f => (
          <div key={f.key}>
            <label className="text-[10px] text-slate-500 block mb-0.5" style={{ fontFamily: URDU }}>{f.label}</label>
            {f.side ? (
              <select value={data[f.key] || ""} onChange={e => setField(f.key, e.target.value)}
                className="fm-input w-full h-8 text-sm border border-slate-200 rounded px-1 bg-white">
                <option value="">—</option><option value="L">L</option><option value="R">R</option>
              </select>
            ) : (
              <Input value={data[f.key] || ""} onChange={e => setField(f.key, e.target.value)} dir="auto" className="fm-input h-8 text-sm" />
            )}
          </div>
        ))}
      </div>

      {/* Composed header line */}
      <div dir="rtl" className="text-center border-2 border-slate-700 rounded-md bg-slate-50 px-4 py-2.5 mb-3"
        style={{ fontFamily: URDU, fontSize: "clamp(13px, 2.4vw, 18px)", fontWeight: "bold", color: "#1e293b", lineHeight: 1.8 }}>
        {buildFardHeader(data)}
      </div>

      {/* Toolbar */}
      <div className="no-print flex flex-wrap items-center gap-2 mb-2">
        <Button onClick={addRow} size="sm" className="gap-1 text-xs"><Plus className="w-3.5 h-3.5" /> صف شامل کریں</Button>
        <Button onClick={handleSave} size="sm" variant="default" className="gap-1 text-xs"><Save className="w-3.5 h-3.5" /> محفوظ کریں</Button>
        <Button onClick={() => window.print()} size="sm" variant="outline" className="gap-1 text-xs ml-auto"><Printer className="w-3.5 h-3.5" /> پرنٹ</Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto fm-table">
        <table dir="rtl" className="w-full border-collapse text-sm" style={{ fontFamily: URDU }}>
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-400 px-1 py-1.5 w-10">نمبر شمار</th>
              <th className="border border-slate-400 px-1 py-1.5">نام و ولدیت</th>
              <th className="border border-slate-400 px-1 py-1.5">خسرہ نمبران</th>
              <th className="border border-slate-400 px-1 py-1.5 w-16">رقبہ</th>
              <th className="border border-slate-400 px-1 py-1.5 w-20">فصل</th>
              <th className="border border-slate-400 px-1 py-1.5 w-20">آبیانہ</th>
              <th className="border border-slate-400 px-1 py-1.5 w-16">دستخط</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="bg-white even:bg-slate-50/40">
                <td className="border border-slate-400 text-center px-1 py-0.5">{i + 1}</td>
                <td className="border border-slate-400 px-1 py-0.5"><Input value={r.name} onChange={e => setRow(i, "name", e.target.value)} dir="rtl" className="fm-input h-8 text-sm border-0 px-1" style={{ fontFamily: URDU }} /></td>
                <td className="border border-slate-400 px-1 py-0.5"><Input value={r.khasra} onChange={e => setRow(i, "khasra", e.target.value)} dir="auto" className="fm-input h-8 text-sm border-0 px-1" /></td>
                <td className="border border-slate-400 px-1 py-0.5"><Input value={r.area} onChange={e => setRow(i, "area", e.target.value)} type="number" className="fm-input h-8 text-sm border-0 px-1 text-center" /></td>
                <td className="border border-slate-400 px-1 py-0.5"><Input value={r.crop} onChange={e => setRow(i, "crop", e.target.value)} dir="rtl" className="fm-input h-8 text-sm border-0 px-1" style={{ fontFamily: URDU }} /></td>
                <td className="border border-slate-400 px-1 py-0.5"><Input value={r.abiana} onChange={e => setRow(i, "abiana", e.target.value)} type="number" className="fm-input h-8 text-sm border-0 px-1 text-center" /></td>
                <td className="border border-slate-400 px-1 py-0.5">
                  <div className="flex items-center gap-1">
                    <Input value={r.signature} onChange={e => setRow(i, "signature", e.target.value)} className="fm-input h-8 text-xs border-0 px-1" />
                    <button onClick={() => delRow(i)} className="no-print text-red-400 hover:text-red-600 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {/* Total row */}
            <tr className="bg-slate-100 font-bold">
              <td className="border border-slate-400 px-1 py-1 text-center" colSpan={3}>کل</td>
              <td className="border border-slate-400 px-1 py-1 text-center">{totalArea}</td>
              <td className="border border-slate-400 px-1 py-1"></td>
              <td className="border border-slate-400 px-1 py-1 text-center">{totalAbiana}/-</td>
              <td className="border border-slate-400 px-1 py-1"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div dir="rtl" className="mt-2 text-sm font-bold" style={{ fontFamily: URDU }}>کل رقم: {totalAbiana}/-</div>

      {/* Signature footer */}
      <div dir="rtl" className="mt-8 flex justify-between items-end" style={{ fontFamily: URDU }}>
        <div className="text-right">
          <p className="text-sm font-semibold">دستخط پٹواری</p>
          <p className="text-xs text-slate-400 mt-8">__________________</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold">دستخط ظلعدار</p>
          <p className="text-xs text-slate-400 mt-8">__________________</p>
          <p className="text-[10px] text-slate-600">Zilladar Section, Canal Division</p>
        </div>
      </div>
    </div>
  );
}