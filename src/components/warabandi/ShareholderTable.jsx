import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

const COLUMNS = [
  { key: "sr_no", label: "نمبر شمار", labelEn: "Sr#", width: "w-14" },
  { key: "owner_name", label: "نام مالک", labelEn: "Owner Name", width: "flex-1", rtl: true },
  { key: "father_name", label: "ولدیت", labelEn: "Father Name", width: "flex-1", rtl: true },
  { key: "khewat_no", label: "خیوط نمبر", labelEn: "Khewat", width: "w-20" },
  { key: "khatoni_no", label: "کھتونی نمبر", labelEn: "Khatoni", width: "w-20" },
  { key: "khasra_no", label: "خسرہ نمبر", labelEn: "Khasra", width: "w-20" },
  { key: "area_acre", label: "ایکڑ", labelEn: "Acre", width: "w-16", num: true },
  { key: "area_kanal", label: "کنال", labelEn: "Kanal", width: "w-16", num: true },
  { key: "area_marla", label: "مرلہ", labelEn: "Marla", width: "w-16", num: true },
  { key: "water_share", label: "حصہ آب", labelEn: "Share", width: "w-20" },
  { key: "duration_hours", label: "گھنٹے", labelEn: "Hrs", width: "w-14", num: true },
  { key: "duration_minutes", label: "منٹ", labelEn: "Min", width: "w-14", num: true },
  { key: "remarks", label: "کیفیت", labelEn: "Remarks", width: "w-28", rtl: true },
];

const emptyRow = (sr) => ({
  sr_no: String(sr), owner_name: "", father_name: "", khewat_no: "", khatoni_no: "",
  khasra_no: "", area_acre: "", area_kanal: "", area_marla: "", water_share: "",
  duration_hours: "", duration_minutes: "", remarks: "",
});

export default function ShareholderTable({ rows, onChange }) {
  const update = (i, key, val) => {
    const next = [...rows];
    next[i] = { ...next[i], [key]: val };
    onChange(next);
  };
  const addRow = () => onChange([...rows, emptyRow(rows.length + 1)]);
  const removeRow = (i) => {
    const next = rows.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, sr_no: String(idx + 1) }));
    onChange(next);
  };

  // Totals
  const sum = (key) => rows.reduce((s, r) => s + (parseFloat(r[key]) || 0), 0);
  const totalAcre = sum("area_acre");
  const totalKanal = sum("area_kanal");
  const totalMarla = sum("area_marla");
  const totalHours = sum("duration_hours");
  const totalMinutes = sum("duration_minutes");
  const adjustedHours = totalHours + Math.floor(totalMinutes / 60);
  const adjustedMinutes = totalMinutes % 60;

  const inputCls = "w-full bg-transparent outline-none text-xs text-slate-800 px-1 py-1 placeholder:text-slate-300";

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <h3 className="text-sm font-bold text-slate-800 font-heading tracking-wide">
          Shareholders — حصہ داران کی تفصیل
        </h3>
        <Button size="sm" onClick={addRow} className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1">
          <Plus className="w-3 h-3" /> Add Row
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="bg-blue-50 border-b border-slate-200">
              {COLUMNS.map(col => (
                <th key={col.key} className="px-1.5 py-2 text-center border-r border-blue-100 last:border-r-0">
                  <div className="text-slate-600 font-semibold text-[10px]">{col.labelEn}</div>
                  <div className="text-slate-400 text-[9px]" style={{ fontFamily: "serif" }}>{col.label}</div>
                </th>
              ))}
              <th className="w-8 px-1"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-blue-50/30">
                {COLUMNS.map(col => (
                  <td key={col.key} className="px-1 border-r border-slate-50 last:border-r-0">
                    <input
                      type={col.num ? "number" : "text"}
                      value={row[col.key] || ""}
                      onChange={e => update(i, col.key, e.target.value)}
                      className={inputCls}
                      style={{ direction: col.rtl ? "rtl" : "ltr", textAlign: col.num ? "center" : (col.rtl ? "right" : "left") }}
                      placeholder={col.key === "sr_no" ? String(i+1) : "—"}
                    />
                  </td>
                ))}
                <td className="px-1">
                  <button onClick={() => removeRow(i)} className="text-slate-300 hover:text-red-500 p-0.5">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-amber-50 border-t-2 border-slate-200 font-semibold">
              <td colSpan={6} className="px-2 py-2 text-right text-xs text-slate-600">مجموعہ / Total:</td>
              <td className="text-center text-xs text-slate-800">{totalAcre || "—"}</td>
              <td className="text-center text-xs text-slate-800">{totalKanal || "—"}</td>
              <td className="text-center text-xs text-slate-800">{totalMarla || "—"}</td>
              <td className="text-center text-xs text-slate-800"></td>
              <td className="text-center text-xs text-slate-800">{adjustedHours || "—"}</td>
              <td className="text-center text-xs text-slate-800">{adjustedMinutes || "—"}</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}