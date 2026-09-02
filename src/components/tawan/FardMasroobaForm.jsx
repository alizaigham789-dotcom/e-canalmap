import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash2, Printer, FileText, Save } from "lucide-react";
import BandubastPicker from "@/components/warabandi/BandubastPicker";
import FractionCell from "@/components/warabandi/FractionCell";
import { printFardRecord } from "@/lib/fardPrint";
import RateAbianaBox, { computeAbiana, DEFAULT_RATE_CONFIG, cropOptionsFor, SEASON_LABEL } from "@/components/tawan/RateAbianaBox";

const URDU = "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif";
const EMPTY_ROW = { name: "", khasra: "", area: "", crop: "خریف", abiana: "", phone: "", mozah: "" };

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
  // Each field auto-detects direction: English/Latin → LTR, Urdu → RTL.
  const V = (v) => <span dir="auto">{v || "_____"}</span>;
  const villagePart = d.village2 ? <>{V(d.village)} و {V(d.village2)}</> : V(d.village);
  // Mogha number (e.g. 6000/L) is forced LTR so it reads left-to-right inside the Urdu RTL line.
  return (
    <>
      فرد مسروبہ ناجائز آبپاشی موگہ نمبری{"\u2009"}
      <span dir="ltr" style={{ display: "inline-block" }}>{mogha}</span>
      {"\u2009"}،{"\u2009"}راجباہ {V(d.rajbah)}،{"\u2009"}موضع {villagePart}،{"\u2009"}ضلعداری سیکشن {V(d.section)}،{"\u2009"}سب ڈویژن {V(d.tehsil)}،{"\u2009"}کینال ڈویژن {V(d.district)}
    </>
  );
}

export default function FardMasroobaForm({ record, onSave, onBack }) {
  const [rows, setRows] = useState(() => { try { return JSON.parse(record.rows_json || "[]"); } catch { return []; } });
  const [picker, setPicker] = useState(null);
  const [rateConfig, setRateConfig] = useState(() => {
    try { return { ...DEFAULT_RATE_CONFIG, ...JSON.parse(record.rate_config_json || "{}") }; }
    catch { return { ...DEFAULT_RATE_CONFIG }; }
  });

  const updateRow = (i, k, v) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const newCrop = () => rateConfig.mode === "fasal"
    ? (rateConfig.selectedCrop || cropOptionsFor(rateConfig).find((c) => c !== SEASON_LABEL.k && c !== SEASON_LABEL.r) || "")
    : SEASON_LABEL[rateConfig.selectedSeason || "k"];
  const addRow = () => setRows((rs) => [...rs, { ...EMPTY_ROW, crop: newCrop() }]);
  // Insert a blank row ABOVE row index i (the "+" on row 5 adds a row above row 5).
  const insertAbove = (i) => setRows((rs) => [...rs.slice(0, i), { ...EMPTY_ROW, crop: newCrop() }, ...rs.slice(i)]);
  const delRow = (i) => setRows((rs) => rs.filter((_, idx) => idx !== i));

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
      {/* Toolbar — cutar / save / print / PDF at the right corner (RTL start); back button at the left. */}
      <div dir="rtl" className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={addRow} size="sm" className="gap-1 text-xs"><Plus className="w-3.5 h-3.5" /> قطار</Button>
          <Button onClick={save} size="sm" className="gap-1 text-xs"><Save className="w-3.5 h-3.5" /> محفوظ</Button>
          <Button onClick={print} size="sm" variant="outline" className="gap-1 text-xs"><Printer className="w-3.5 h-3.5" /> پرنٹ</Button>
          <Button onClick={print} size="sm" variant="outline" className="gap-1 text-xs"><FileText className="w-3.5 h-3.5" /> PDF</Button>
        </div>
        <Button onClick={onBack} variant="ghost" size="icon" className="w-8 h-8 text-slate-500"><ArrowLeft className="w-4 h-4" /></Button>
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
              <th className="border border-slate-400 px-1 py-1.5 w-12">+ / حذف</th>
              <th className="border border-slate-400 px-1 py-1.5 w-10">نمبر شمار</th>
              <th className="border border-slate-400 px-1 py-1.5">نام و ولدیت</th>
              <th className="border border-slate-400 px-1 py-1.5 w-28">خسرہ نمبران</th>
              <th className="border border-slate-400 px-1 py-1.5 w-20">رقبہ <span className="text-[10px] font-normal text-slate-500">(کنال)</span></th>
              <th className="border border-slate-400 px-1 py-1.5 w-20">فصل</th>
              <th className="border border-slate-400 px-1 py-1.5 w-20">آبیانہ</th>
              <th className="border border-slate-400 px-1 py-1.5 w-28">فون نمبر<div className="text-[9px] font-normal text-slate-500">Phone Number</div></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-slate-400 py-6 text-xs border border-slate-200" style={{ fontFamily: URDU }}>کوئی قطار نہیں — "قطار" دبائیں</td></tr>
            ) : rows.map((r, i) => (
                <tr key={i} className="bg-white">
                  <td className="border border-slate-400 text-center px-1 py-0.5">
                    <div className="flex flex-col items-center gap-0.5">
                      <button onClick={() => insertAbove(i)} title="اس قطار کے اوپر نئی قطار" className="text-green-600 hover:text-green-700"><Plus className="w-3.5 h-3.5" /></button>
                      <button onClick={() => delRow(i)} title="قطار حذف" className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                  <td className="border border-slate-400 text-center px-1 py-0.5">{i + 1}</td>
                  <td className="border border-slate-400 px-1 py-0.5">
                    <Input value={r.name} onChange={(e) => updateRow(i, "name", e.target.value)} dir="rtl" className="h-8 text-sm border-0 px-1" style={{ fontFamily: URDU }} />
                    {record.village2 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <select
                          value={r.mozah || ""}
                          onChange={(e) => updateRow(i, "mozah", e.target.value)}
                          dir="rtl"
                          className="h-6 text-[10px] border border-slate-300 rounded px-0.5 bg-white"
                          style={{ fontFamily: URDU }}
                        >
                          <option value="">موضع</option>
                          <option value="1">{record.village || "موضع ۱"}</option>
                          <option value="2">{record.village2}</option>
                        </select>
                        {r.mozah && (r.mozah === "1" ? record.village : record.village2) ? (
                          <span className="text-[10px] text-slate-600 truncate" style={{ fontFamily: URDU }}>({r.mozah === "1" ? record.village : record.village2})</span>
                        ) : null}
                      </div>
                    )}
                  </td>
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
                </tr>
              ))}
            <tr className="bg-slate-100 font-bold">
              <td className="border border-slate-400"></td>
              <td className="border border-slate-400 px-1 py-1 text-center" colSpan={3}>کل</td>
              <td className="border border-slate-400 px-1 py-1 text-center">{totalArea}</td>
              <td className="border border-slate-400 px-1 py-1"></td>
              <td className="border border-slate-400 px-1 py-1 text-center">{totalAbiana}/-</td>
              <td className="border border-slate-400 px-1 py-1"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div dir="rtl" className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <Button onClick={addRow} size="sm" variant="outline" className="gap-1 text-xs"><Plus className="w-3.5 h-3.5" /> قطار</Button>
        <span className="text-sm font-bold" style={{ fontFamily: URDU }}>کل رقم: {totalAbiana}/-</span>
      </div>

      {/* Signature footer */}
      <div dir="rtl" className="mt-8 flex justify-between items-end" style={{ fontFamily: URDU }}>
        <div className="text-right"><p className="text-sm font-semibold">دستخط پٹواری</p><p className="text-xs text-slate-400 mt-8">__________________</p></div>
        <div className="text-center"><p className="text-sm font-semibold">دستخط ظلعدار</p><p className="text-xs text-slate-400 mt-8">__________________</p></div>
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