import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const FALLBACK_COLUMNS = [
  { field_key: "sr_no", label_urdu: "نمبر شمار", label_en: "Sr#" },
  { field_key: "owner_name", label_urdu: "نام مالک", label_en: "Owner" },
  { field_key: "father_name", label_urdu: "ولدیت", label_en: "Father" },
  { field_key: "khewat_no", label_urdu: "کھسوٹ", label_en: "Khewat" },
  { field_key: "khatoni_no", label_urdu: "کھتونی", label_en: "Khatoni" },
  { field_key: "khasra_no", label_urdu: "خسرہ", label_en: "Khasra" },
  { field_key: "area_acre", label_urdu: "ایکڑ", label_en: "Acre" },
  { field_key: "area_kanal", label_urdu: "کنال", label_en: "Kanal" },
  { field_key: "area_marla", label_urdu: "مرلہ", label_en: "Marla" },
  { field_key: "water_share", label_urdu: "حصہ آب", label_en: "Share" },
  { field_key: "duration_hours", label_urdu: "گھنٹے", label_en: "Hrs" },
  { field_key: "duration_minutes", label_urdu: "منٹ", label_en: "Min" },
  { field_key: "remarks", label_urdu: "کیفیت", label_en: "Remarks" },
];

export default function WarabandiPrint({ data, rows, onClose }) {
  const { data: configs = [] } = useQuery({
    queryKey: ["form-field-configs", "parat_warabandi_table"],
    queryFn: () => base44.entities.FormFieldConfig.filter({ form_type: "parat_warabandi_table" }, "order"),
  });

  const columns = configs.length > 0
    ? configs.filter(c => c.visible !== false)
    : FALLBACK_COLUMNS;

  const moghaDisplay = [data.mogha_number, data.mogha_side].filter(Boolean).join(" / ");
  const sum = (key) => rows.reduce((s, r) => s + (parseFloat(r[key]) || 0), 0);
  const totalAcre = sum("area_acre");
  const totalKanal = sum("area_kanal");
  const totalMarla = sum("area_marla");
  const totalHours = sum("duration_hours");
  const totalMinutes = sum("duration_minutes");
  const adjH = totalHours + Math.floor(totalMinutes / 60);
  const adjM = totalMinutes % 60;

  const handlePrint = () => {
    const printArea = document.getElementById("warabandi-print-area");
    const w = window.open("", "_blank", "width=1100,height=800");
    w.document.write(`<!DOCTYPE html><html><head><title>پرت وارابندی</title>
      <style>
        @page { size: A4 landscape; margin: 12mm; }
        body { font-family: 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif; margin:0; padding:20px; direction:rtl; color:#000; font-size:13px; line-height:1.8; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1.5px solid #333; padding: 4px 6px; text-align: center; }
        th { background: #f0f0f0; font-weight: bold; font-size: 10px; }
        .header { text-align: center; margin-bottom: 12px; }
        .header h1 { font-size: 16px; margin: 0; }
        .meta-table { width: 100%; border: none; margin-bottom: 10px; }
        .meta-table td { border: none; padding: 2px 8px; text-align: right; font-size: 11px; }
        .meta-label { font-weight: bold; }
        .footer-sign { display: flex; justify-content: space-between; margin-top: 24px; font-size: 11px; }
        .totals td { font-weight: bold; background: #f5f5f0; }
      </style>
    </head><body>${printArea.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-auto py-8">
      <div className="bg-white rounded-xl shadow-2xl max-w-[1100px] w-full mx-4">
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-slate-50 rounded-t-xl print:hidden">
          <h3 className="text-sm font-bold text-slate-800 font-heading">Print Preview — پرت وارابندی</h3>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
              🖨 Print / PDF
            </button>
            <button onClick={onClose} className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs rounded-lg hover:bg-slate-300">
              Close
            </button>
          </div>
        </div>

        <div id="warabandi-print-area" className="p-8" style={{ direction: "rtl", fontFamily: "serif" }}>
          {/* Header */}
          <div className="text-center mb-4">
            <h1 className="text-base font-bold mb-1" style={{ fontSize: "16px" }}>
              {data.warabandi_type || "پرت وارہ بندی"}
            </h1>
            <p className="text-xs text-slate-600 mb-1">
              موگہ نمبری {moghaDisplay || "___"} — واجبہ آبیانہ تحقیقات موسم خریف رنجی غلطنگ وادی نکال / ساب ایران قناۃ آراضی {data.village_name || "___"} خرقوب
            </p>
          </div>

          {/* Meta Info — new fields */}
          <table className="w-full mb-4" style={{ borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td className="border border-slate-400 px-2 py-1 text-xs bg-slate-50 font-bold">نہر</td>
                <td className="border border-slate-400 px-2 py-1 text-xs">{data.canal_name || "___"}</td>
                <td className="border border-slate-400 px-2 py-1 text-xs bg-slate-50 font-bold">موگہ نام</td>
                <td className="border border-slate-400 px-2 py-1 text-xs">{data.mogha_name || "___"}</td>
                <td className="border border-slate-400 px-2 py-1 text-xs bg-slate-50 font-bold">موگہ نمبری</td>
                <td className="border border-slate-400 px-2 py-1 text-xs font-mono">{moghaDisplay || "___"}</td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 text-xs bg-slate-50 font-bold">گاؤں</td>
                <td className="border border-slate-400 px-2 py-1 text-xs">{data.village_name || "___"}</td>
                <td className="border border-slate-400 px-2 py-1 text-xs bg-slate-50 font-bold">سب ڈویژن</td>
                <td className="border border-slate-400 px-2 py-1 text-xs">{data.sub_division || "___"}</td>
                <td className="border border-slate-400 px-2 py-1 text-xs bg-slate-50 font-bold">ڈویژن</td>
                <td className="border border-slate-400 px-2 py-1 text-xs">{data.division || "___"}</td>
              </tr>
              {(data.applicant_name || data.applicant_father || data.applicant_cnic) && (
                <tr>
                  <td className="border border-slate-400 px-2 py-1 text-xs bg-slate-50 font-bold">درخواست گزار</td>
                  <td className="border border-slate-400 px-2 py-1 text-xs">{data.applicant_name || "___"}</td>
                  <td className="border border-slate-400 px-2 py-1 text-xs bg-slate-50 font-bold">ولدیت</td>
                  <td className="border border-slate-400 px-2 py-1 text-xs">{data.applicant_father || "___"}</td>
                  <td className="border border-slate-400 px-2 py-1 text-xs bg-slate-50 font-bold">شناختی کارڈ</td>
                  <td className="border border-slate-400 px-2 py-1 text-xs font-mono">{data.applicant_cnic || "___"}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Main Data Table */}
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.field_key} className="border border-slate-400 px-1 py-1.5 bg-slate-50 text-[10px]">
                    {col.label_urdu}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {columns.map(col => (
                    <td key={col.field_key} className={`border border-slate-400 px-1 py-1 text-[10px] ${col.num ? "text-center" : ""}`}>
                      {row[col.field_key] || (col.field_key === "sr_no" ? i + 1 : "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} className="border border-slate-400 px-2 py-1.5 text-[10px] font-bold text-left">مجموعہ</td>
                {columns.some(c => c.field_key === "area_acre") && <td className="border border-slate-400 px-1 py-1.5 text-[10px] text-center font-bold">{totalAcre || ""}</td>}
                {columns.some(c => c.field_key === "area_kanal") && <td className="border border-slate-400 px-1 py-1.5 text-[10px] text-center font-bold">{totalKanal || ""}</td>}
                {columns.some(c => c.field_key === "area_marla") && <td className="border border-slate-400 px-1 py-1.5 text-[10px] text-center font-bold">{totalMarla || ""}</td>}
                {columns.some(c => c.field_key === "water_share") && <td className="border border-slate-400 px-1 py-1.5 text-[10px] text-center font-bold"></td>}
                {columns.some(c => c.field_key === "duration_hours") && <td className="border border-slate-400 px-1 py-1.5 text-[10px] text-center font-bold">{adjH || ""}</td>}
                {columns.some(c => c.field_key === "duration_minutes") && <td className="border border-slate-400 px-1 py-1.5 text-[10px] text-center font-bold">{adjM || ""}</td>}
                {columns.some(c => c.field_key === "remarks") ? <td className="border border-slate-400 px-1 py-1.5 text-[10px]"></td> : null}
              </tr>
            </tfoot>
          </table>

          {/* Footer Signatures */}
          <div className="flex justify-between mt-8 text-xs">
            <div className="text-center">
              <div className="border-t border-slate-400 pt-1 px-8">دستخط ملہدار</div>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-400 pt-1 px-8">وضاحت نقشہ</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}