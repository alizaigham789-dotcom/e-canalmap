import React, { useState } from "react";
import { FormWrapper } from "./FormBase";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

const emptyRow = () => ({ srNo: "", kaysKiAimNumber: "", aazadAimNumber: "", naamKagaz: "", kifiyat: "" });

export default function Form3_NaqshRegister() {
  const [header, setHeader] = useState({ naamGaon: "", tehsil: "", zila: "", naqshNo: "" });
  const [dateMeta, setDateMeta] = useState({ tarMujoodah: "", tarFaisalah: "", frNmber: "" });
  const [rows, setRows] = useState(Array.from({ length: 8 }, emptyRow));
  const sh = (k) => (v) => setHeader(p => ({ ...p, [k]: v }));
  const sd = (k) => (v) => setDateMeta(p => ({ ...p, [k]: v }));
  const updateRow = (i, k, v) => setRows(prev => { const next = [...prev]; next[i] = { ...next[i], [k]: v }; return next; });
  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = (i) => setRows(prev => prev.filter((_, idx) => idx !== i));
  const inputCls = "bg-transparent border-b-2 border-slate-300 focus:border-blue-500 outline-none text-slate-800 text-xs px-1 py-0.5 w-full";

  return (
    <FormWrapper title="نقش رجسٹر" titleEn="Form 3 — Naqsh Register (Record Register)">
      <div className="grid grid-cols-3 gap-3 mb-4" style={{ direction: "rtl" }}>
        <div>
          <p className="text-[10px] text-slate-500 mb-1 font-medium" style={{ fontFamily: "serif" }}>نقش نمبر 27 نمبر</p>
          <input type="text" value={header.naqshNo} onChange={e => sh("naqshNo")(e.target.value)} className={inputCls} style={{ direction: "rtl", fontFamily: "serif" }} />
        </div>
        <div>
          <p className="text-[10px] text-slate-500 mb-1 font-medium" style={{ fontFamily: "serif" }}>نام گاؤں</p>
          <input type="text" value={header.naamGaon} onChange={e => sh("naamGaon")(e.target.value)} className={inputCls} style={{ direction: "rtl", fontFamily: "serif" }} />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <p className="text-[10px] text-slate-500 mb-1 font-medium" style={{ fontFamily: "serif" }}>تحصیل</p>
            <input type="text" value={header.tehsil} onChange={e => sh("tehsil")(e.target.value)} className={inputCls} style={{ direction: "rtl", fontFamily: "serif" }} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-slate-500 mb-1 font-medium" style={{ fontFamily: "serif" }}>ضلع</p>
            <input type="text" value={header.zila} onChange={e => sh("zila")(e.target.value)} className={inputCls} style={{ direction: "rtl", fontFamily: "serif" }} />
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-5" style={{ direction: "rtl" }}>
        <div className="flex-1">
          <p className="text-[10px] text-slate-500 mb-1 font-medium" style={{ fontFamily: "serif" }}>تاریخ مرجومہ</p>
          <input type="date" value={dateMeta.tarMujoodah} onChange={e => sd("tarMujoodah")(e.target.value)} className={inputCls} />
        </div>
        <div className="flex-1">
          <p className="text-[10px] text-slate-500 mb-1 font-medium" style={{ fontFamily: "serif" }}>تاریخ فیصلہ</p>
          <input type="date" value={dateMeta.tarFaisalah} onChange={e => sd("tarFaisalah")(e.target.value)} className={inputCls} />
        </div>
        <div className="flex-1">
          <p className="text-[10px] text-slate-500 mb-1 font-medium" style={{ fontFamily: "serif" }}>فیصلہ نمبر</p>
          <input type="text" value={dateMeta.frNmber} onChange={e => sd("frNmber")(e.target.value)} className={inputCls} style={{ direction: "rtl", fontFamily: "serif" }} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-amber-50 border-b border-slate-200">
              <th className="p-2 text-slate-600 border-r border-slate-200 text-right font-semibold" style={{ fontFamily: "serif" }}>نمبر</th>
              <th className="p-2 text-slate-600 border-r border-slate-200 text-right font-semibold" style={{ fontFamily: "serif" }}>کیس کی عائم نمبر</th>
              <th className="p-2 text-slate-600 border-r border-slate-200 text-right font-semibold" style={{ fontFamily: "serif" }}>آزاد عائم نمبر</th>
              <th className="p-2 text-slate-600 border-r border-slate-200 text-right font-semibold" style={{ fontFamily: "serif" }}>نام کاغذ یا مشل</th>
              <th className="p-2 text-slate-600 border-r border-slate-200 text-right font-semibold" style={{ fontFamily: "serif" }}>کیفیت</th>
              <th className="p-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-amber-50/40">
                {["srNo", "kaysKiAimNumber", "aazadAimNumber", "naamKagaz", "kifiyat"].map(k => (
                  <td key={k} className="p-1 border-r border-slate-100">
                    <input type="text" value={row[k]} onChange={e => updateRow(i, k, e.target.value)}
                      className="bg-transparent outline-none text-slate-800 text-xs w-full px-1 text-right" style={{ direction: "rtl", fontFamily: "serif" }} />
                  </td>
                ))}
                <td className="p-1">
                  <button onClick={() => removeRow(i)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button size="sm" variant="outline" className="mt-3 h-7 text-xs border-slate-300 text-slate-500 gap-1 hover:bg-amber-50" onClick={addRow}>
        <Plus className="w-3 h-3" /> قطار شامل کریں
      </Button>
    </FormWrapper>
  );
}