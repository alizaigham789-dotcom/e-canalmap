import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash2, Printer, FileText, Save, Search } from "lucide-react";
import BandubastPicker from "@/components/warabandi/BandubastPicker";
import FractionCell from "@/components/warabandi/FractionCell";
import { printFardRecord } from "@/lib/fardPrint";
import RateAbianaBox, { computeAbiana, DEFAULT_RATE_CONFIG, cropOptionsFor, SEASON_LABEL } from "@/components/tawan/RateAbianaBox";

const URDU = "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif";
const EMPTY_ROW = { name: "", khasra: "", area: "", crop: "Khareef", abiana: "", phone: "" };

// Pakistani mobile format: 11 digits, "03" prefix fixed, dash after 4 → 0300-1234567
function formatPkPhone(raw) {
  let d = (raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("03")) d = d.slice(2);
  else if (d.startsWith("0")) d = d.slice(1);
  d = d.slice(0, 9);
  const full = ("03" + d).slice(0, 11);
  if (full.length <= 4) return full;
  return full.slice(0, 4) + "-" + full.slice(4);
}

function buildFardHeader(d) {
  const mogha = d.mogha_number ? `${d.mogha_number}${d.mogha_side ? `/${d.mogha_side}` : ""}` : "_____";
  return `فرد مسروبہ ناجائز آبپاشی موگہ نمبری\u2009${mogha}،\u2009راجباہ ${d.rajbah || "_____"}،\u2009موضع ${d.village || "_____"}،\u2009ضلعداری سیکشن ${d.section || "_____"}،\u2009سب ڈویژن ${d.tehsil || "_____"}،\u2009کینال ڈویژن ${d.district || "_____"}`;
}

export default function FardMasroobaForm({ record, onSave, onBack }) {
  const [rows, setRows] = useState(() => { try { return JSON.parse(record.rows_json || "[]"); } catch { return []; } });
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [picker, setPicker] = useState(null);
  const [rateConfig, setRateConfig] = useState(() => {
    try { return { ...DEFAULT_RATE_CONFIG, ...JSON.parse(record.rate_config_json || "{}") }; }
    catch { return { ...DEFAULT_RATE_CONFIG }; }
  });

  const updateRow = (i, k, v) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addRow = () => {
    const crop = rateConfig.mode === "fasal"
      ? (rateConfig.selectedCrop || cropOptionsFor(rateConfig).find((c) => c !== SEASON_LABEL.k && c !== SEASON_LABEL.r) || "")
      : SEASON_LABEL[rateConfig.selectedSeason || "k"];
    setRows((rs) => [...rs, { ...EMPTY_ROW, crop }]);
  };
  const delRow = (i) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  const filteredIdx = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = rows.map((_, i) => i);
    if (!q) return all;
    return all.filter((i) => {
      const r = rows[i];
      return (r.name || "").toLowerCase().includes(q) || (r.khasra || "").toLowerCase().includes(q);
    });
  }, [rows, search]);

  const allSelected = filteredIdx.length > 0 && filteredIdx.every((i) => selected.has(i));
  const toggleAll = () => {
    if (allSelected) setSelected((p) => { const n = new Set(p); filteredIdx.forEach((i) => n.delete(i)); return n; });
    else setSelected((p) => { const n = new Set(p); filteredIdx.forEach((i) => n.add(i)); return n; });
  };
  const toggleRow = (i) => setSelected((p) => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const deleteSelected = () => {
    if (!confirm("منتخب صفات حذف کریں؟")) return;
    setRows((rs) => rs.filter((_, i) => !selected.has(i)));
    setSelected(new Set());
  };

  const totalAbiana = rows.reduce((s, r) => s + computeAbiana(r, rateConfig), 0);
  const totalArea = rows.reduce((s, r) => s + (parseFloat(r.area) || 0), 0);

  const save = () => {
    // Bake computed abiana into rows so print/PDF show correct amounts.
    const rowsToSave = rows.map((r) => ({ ...r, abiana: String(computeAbiana(r, rateConfig)) }));
    onSave({
      rows_json: JSON.stringify(rowsToSave),
      rate_config_json: JSON.stringify(rateConfig),
      total_abiana: totalAbiana,
      total_area: totalArea,
    });
  };
  const print = () => printFardRecord({ ...record, rows_json: JSON.stringify(rows) });

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4">
      {/* Toolbar — search / select-all / delete / add / save / print / pdf */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Button onClick={onBack} variant="ghost" size="icon" className="w-8 h-8 text-slate-500"><ArrowLeft className="w-4 h-4" /></Button>
        <div className="relative flex-1 min-w-[140px] max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="نام / خسرہ تلاش کریں" className="h-8 text-xs pl-7" dir="rtl" style={{ fontFamily: URDU }} />
        </div>
        <Button onClick={toggleAll} variant="outline" size="sm" className="text-xs">{allSelected ? "سب ہٹا" : "سب منتخب"}</Button>
        {selected.size > 0 && (
          <Button onClick={deleteSelected} variant="outline" size="sm" className="text-xs text-red-500 gap-1"><Trash2 className="w-3.5 h-3.5" /> حذف</Button>
        )}
        <Button onClick={save} size="sm" className="gap-1 text-xs"><Save className="w-3.5 h-3.5" /> محفوظ</Button>
        <Button onClick={print} size="sm" variant="outline" className="gap-1 text-xs"><Printer className="w-3.5 h-3.5" /> پرنٹ</Button>
        <Button onClick={print} size="sm" variant="outline" className="gap-1 text-xs"><FileText className="w-3.5 h-3.5" /> PDF</Button>
      </div>

      {/* Composed header line — same fields as map editor / warabandi parat */}
      <div dir="rtl" className="text-center border-2 border-slate-700 rounded-md bg-slate-50 px-4 py-2.5 mb-2"
        style={{ fontFamily: URDU, fontSize: "clamp(12px,2.2vw,17px)", fontWeight: "bold", color: "#1e293b", lineHeight: 1.8 }}>
        {buildFardHeader(record)}
      </div>

      {/* Rate Abiana box — fix rate / fasal war rate / manual */}
      <RateAbianaBox config={rateConfig} onChange={setRateConfig} />

      {/* Table */}
      <div className="overflow-x-auto">
        <table dir="rtl" className="w-full border-collapse text-sm" style={{ fontFamily: URDU }}>
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-400 px-1 py-1.5 w-8"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-3.5 h-3.5" /></th>
              <th className="border border-slate-400 px-1 py-1.5 w-10">نمبر شمار</th>
              <th className="border border-slate-400 px-1 py-1.5">نام و ولدیت</th>
              <th className="border border-slate-400 px-1 py-1.5 w-28">خسرہ نمبران</th>
              <th className="border border-slate-400 px-1 py-1.5 w-20">رقبہ <span className="text-[10px] font-normal text-slate-500">(کنال)</span></th>
              <th className="border border-slate-400 px-1 py-1.5 w-20">فصل</th>
              <th className="border border-slate-400 px-1 py-1.5 w-20">آبیانہ</th>
              <th className="border border-slate-400 px-1 py-1.5 w-28">فون نمبر<div className="text-[9px] font-normal text-slate-500">Phone Number</div></th>
              <th className="border border-slate-400 px-1 py-1.5 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {filteredIdx.length === 0 ? (
              <tr><td colSpan={9} className="text-center text-slate-400 py-6 text-xs border border-slate-200" style={{ fontFamily: URDU }}>کوئی قطار نہیں — "قطار" دبائیں</td></tr>
            ) : filteredIdx.map((i) => {
              const r = rows[i];
              const sel = selected.has(i);
              return (
                <tr key={i} className={sel ? "bg-blue-50" : "bg-white"}>
                  <td className="border border-slate-400 text-center px-1 py-0.5"><input type="checkbox" checked={sel} onChange={() => toggleRow(i)} className="w-3.5 h-3.5" /></td>
                  <td className="border border-slate-400 text-center px-1 py-0.5">{i + 1}</td>
                  <td className="border border-slate-400 px-1 py-0.5"><Input value={r.name} onChange={(e) => updateRow(i, "name", e.target.value)} dir="rtl" className="h-8 text-sm border-0 px-1" style={{ fontFamily: URDU }} /></td>
                  <td className="border border-slate-400 px-1 py-0.5"><FractionCell value={r.khasra} onChange={(v) => updateRow(i, "khasra", v)} onPicker={() => setPicker({ row: i })} /></td>
                  <td className="border border-slate-400 px-1 py-0.5"><Input value={r.area} onChange={(e) => updateRow(i, "area", e.target.value)} type="number" className="h-8 text-sm border-0 px-1 text-center" /></td>
                  <td className="border border-slate-400 px-1 py-0.5">
                    <select
                      value={r.crop}
                      onChange={(e) => {
                        const v = e.target.value;
                        updateRow(i, "crop", v);
                        if (rateConfig.mode === "fasal" && v !== SEASON_LABEL.k && v !== SEASON_LABEL.r) {
                          setRateConfig((rc) => ({ ...rc, selectedCrop: v }));
                        }
                      }}
                      dir="rtl"
                      className="h-8 w-full text-sm border border-slate-300 rounded px-1 bg-white"
                      style={{ fontFamily: URDU }}
                    >
                      {cropOptionsFor(rateConfig).map((c) => (
                        <option key={c} value={c} style={{ fontFamily: URDU }}>{c}</option>
                      ))}
                    </select>
                  </td>
                  <td className="border border-slate-400 px-1 py-0.5"><Input value={String(computeAbiana(r, rateConfig))} readOnly type="number" className="h-8 text-sm border-0 px-1 text-center bg-slate-100 cursor-not-allowed" /></td>
                  <td className="border border-slate-400 px-1 py-0.5">
                    <input
                      value={r.phone || ""}
                      onChange={(e) => updateRow(i, "phone", formatPkPhone(e.target.value))}
                      inputMode="tel"
                      maxLength={12}
                      placeholder="03XX-XXXXXXX"
                      className="h-8 w-full text-xs border border-slate-300 rounded px-1 bg-white text-left"
                      dir="ltr"
                    />
                  </td>
                  <td className="border border-slate-400 text-center"><button onClick={() => delRow(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button></td>
                </tr>
              );
            })}
            <tr className="bg-slate-100 font-bold">
              <td className="border border-slate-400"></td>
              <td className="border border-slate-400 px-1 py-1 text-center" colSpan={3}>کل</td>
              <td className="border border-slate-400 px-1 py-1 text-center">{totalArea}</td>
              <td className="border border-slate-400 px-1 py-1"></td>
              <td className="border border-slate-400 px-1 py-1 text-center">{totalAbiana}/-</td>
              <td className="border border-slate-400 px-1 py-1"></td>
              <td className="border border-slate-400"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Add-row (قطار) button — at table end, above total */}
      <div dir="rtl" className="mt-2 flex justify-end">
        <Button onClick={addRow} size="sm" className="gap-1 text-xs"><Plus className="w-3.5 h-3.5" /> قطار</Button>
      </div>
      <div dir="rtl" className="mt-1.5 text-sm font-bold" style={{ fontFamily: URDU }}>کل رقم: {totalAbiana}/-</div>

      {/* Signature footer */}
      <div dir="rtl" className="mt-8 flex justify-between items-end" style={{ fontFamily: URDU }}>
        <div className="text-right"><p className="text-sm font-semibold">دستخط پٹواری</p><p className="text-xs text-slate-400 mt-8">__________________</p></div>
        <div className="text-center"><p className="text-sm font-semibold">دستخط ظلعدار</p><p className="text-xs text-slate-400 mt-8">__________________</p><p className="text-[10px] text-slate-600">Zilladar Section, Canal Division</p></div>
      </div>

      {/* Khasra / bandubast picker — works from the selected map's mustateels,
          or falls back to manual "new mustateel" entry when map_id is absent. */}
      <BandubastPicker
        open={!!picker}
        value={picker ? (rows[picker.row]?.khasra || "") : ""}
        onChange={(v) => { if (picker) updateRow(picker.row, "khasra", v); }}
        mogaNumber={record.mogha_number}
        mapId={record.map_id}
        title="خسرہ نمبران"
        onClose={() => setPicker(null)}
      />
    </div>
  );
}