import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Calculator } from "lucide-react";

const FALLBACK_COLUMNS = [
  { field_key: "sr_no", label_urdu: "نمبر شمار", label_en: "Sr#", width: "w-14" },
  { field_key: "owner_name", label_urdu: "نام مالک", label_en: "Owner Name", width: "flex-1", rtl: true },
  { field_key: "father_name", label_urdu: "ولدیت", label_en: "Father Name", width: "flex-1", rtl: true },
  { field_key: "khewat_no", label_urdu: "خیوط نمبر", label_en: "Khewat", width: "w-20" },
  { field_key: "khatoni_no", label_urdu: "کھتونی نمبر", label_en: "Khatoni", width: "w-20" },
  { field_key: "khasra_no", label_urdu: "خسرہ نمبر", label_en: "Khasra", width: "w-20" },
  { field_key: "area_acre", label_urdu: "ایکڑ", label_en: "Acre", width: "w-16", num: true },
  { field_key: "area_kanal", label_urdu: "کنال", label_en: "Kanal", width: "w-16", num: true },
  { field_key: "area_marla", label_urdu: "مرلہ", label_en: "Marla", width: "w-16", num: true },
  { field_key: "water_share", label_urdu: "حصہ آب", label_en: "Share", width: "w-20" },
  { field_key: "duration_hours", label_urdu: "گھنٹے", label_en: "Hrs", width: "w-14", num: true },
  { field_key: "duration_minutes", label_urdu: "منٹ", label_en: "Min", width: "w-14", num: true },
  { field_key: "remarks", label_urdu: "کیفیت", label_en: "Remarks", width: "w-28", rtl: true },
];

const emptyRow = (sr) => ({
  sr_no: String(sr), owner_name: "", father_name: "", khewat_no: "", khatoni_no: "",
  khasra_no: "", area_acre: "", area_kanal: "", area_marla: "", water_share: "",
  duration_hours: "", duration_minutes: "", remarks: "",
});

export default function ShareholderTable({ rows, onChange }) {
  const { data: configs = [] } = useQuery({
    queryKey: ["form-field-configs", "parat_warabandi_table"],
    queryFn: () => base44.entities.FormFieldConfig.filter({ form_type: "parat_warabandi_table" }, "order"),
  });

  const { data: formulas = [] } = useQuery({
    queryKey: ["formula-configs"],
    queryFn: () => base44.entities.FormulaConfig.filter({ enabled: true }),
  });

  // Resolve formula values from admin config or defaults
  const minutesPerAcre = (() => {
    const f = formulas.find(f => f.formula_key === "water_time_per_acre" && f.enabled);
    return f ? Number(f.value) : 6;
  })();

  const minutesPerKanal = (() => {
    const f = formulas.find(f => f.formula_key === "water_time_per_kanal" && f.enabled);
    return f ? Number(f.value) : 0.75;
  })();

  const columns = configs.length > 0
    ? configs.filter(c => c.visible !== false)
    : FALLBACK_COLUMNS;

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

  // Auto-calculate water time for all rows
  const calculateWaterTime = () => {
    const next = rows.map(row => {
      const acres = parseFloat(row.area_acre) || 0;
      const kanals = parseFloat(row.area_kanal) || 0;
      const marlas = parseFloat(row.area_marla) || 0;
      // 1 acre = 8 kanals = 160 marlas → convert all to acres
      const totalAcres = acres + (kanals / 8) + (marlas / 160);
      const totalMinutes = totalAcres * minutesPerAcre + kanals * minutesPerKanal;
      const hrs = Math.floor(totalMinutes / 60);
      const mins = Math.round(totalMinutes % 60);
      return { ...row, duration_hours: String(hrs), duration_minutes: String(mins) };
    });
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
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={calculateWaterTime}
            className="h-7 text-xs border-blue-200 bg-white text-blue-600 hover:bg-blue-50 gap-1">
            <Calculator className="w-3 h-3" /> Calc ({minutesPerAcre}m/ac)
          </Button>
          <Button size="sm" onClick={addRow} className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1">
            <Plus className="w-3 h-3" /> Add Row
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="bg-blue-50 border-b border-slate-200">
              {columns.map(col => (
                <th key={col.field_key} className="px-1.5 py-2 text-center border-r border-blue-100 last:border-r-0">
                  <div className="text-slate-600 font-semibold text-[10px]">{col.label_en}</div>
                  <div className="text-slate-400 text-[9px]" style={{ fontFamily: "serif" }}>{col.label_urdu}</div>
                </th>
              ))}
              <th className="w-8 px-1"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-blue-50/30">
                {columns.map(col => (
                  <td key={col.field_key} className="px-1 border-r border-slate-50 last:border-r-0">
                    <input
                      type={col.num ? "number" : "text"}
                      value={row[col.field_key] || ""}
                      onChange={e => update(i, col.field_key, e.target.value)}
                      className={inputCls}
                      style={{ direction: col.rtl ? "rtl" : "ltr", textAlign: col.num ? "center" : (col.rtl ? "right" : "left") }}
                      placeholder={col.field_key === "sr_no" ? String(i+1) : "—"}
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
              {columns.some(c => c.field_key === "area_acre") && <td className="text-center text-xs text-slate-800">{totalAcre || "—"}</td>}
              {columns.some(c => c.field_key === "area_kanal") && <td className="text-center text-xs text-slate-800">{totalKanal || "—"}</td>}
              {columns.some(c => c.field_key === "area_marla") && <td className="text-center text-xs text-slate-800">{totalMarla || "—"}</td>}
              {columns.some(c => c.field_key === "water_share") && <td className="text-center text-xs text-slate-800"></td>}
              {columns.some(c => c.field_key === "duration_hours") && <td className="text-center text-xs text-slate-800">{adjustedHours || "—"}</td>}
              {columns.some(c => c.field_key === "duration_minutes") && <td className="text-center text-xs text-slate-800">{adjustedMinutes || "—"}</td>}
              {columns.some(c => c.field_key === "remarks") ? <td colSpan={1}></td> : null}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}