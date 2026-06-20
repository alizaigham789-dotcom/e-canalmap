import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";

const FALLBACK_FIELDS = [
  { field_key: "circle_name", label_urdu: "حلقہ", label_en: "Circle Name", field_type: "text", rtl: true },
  { field_key: "canal_name", label_urdu: "نہر", label_en: "Canal Name", field_type: "text", rtl: true },
  { field_key: "mogha_name", label_urdu: "موغہ نام", label_en: "Mogha Name", field_type: "text", rtl: true },
  { field_key: "mogha_number", label_urdu: "موغہ نمبر", label_en: "Mogha Number", field_type: "text" },
  { field_key: "village_name", label_urdu: "گاؤں", label_en: "Village Name", field_type: "text", rtl: true },
  { field_key: "halqa_patwar", label_urdu: "حلقہ پٹوار", label_en: "Halqa Patwar", field_type: "text", rtl: true },
  { field_key: "tehsil", label_urdu: "تحصیل", label_en: "Tehsil", field_type: "text", rtl: true },
  { field_key: "district", label_urdu: "ضلع", label_en: "District", field_type: "text", rtl: true },
  { field_key: "total_cca", label_urdu: "کل سی سی اے", label_en: "Total CCA", field_type: "text" },
  { field_key: "total_khasra_area", label_urdu: "کل خسرہ رقبہ", label_en: "Total Khasra Area", field_type: "text" },
  { field_key: "warabandi_date", label_urdu: "تاریخ وارابندی", label_en: "Warabandi Date", field_type: "date" },
  { field_key: "order_number", label_urdu: "حکم نمبر", label_en: "Order Number", field_type: "text" },
];

export default function WarabandiForm({ data, onChange }) {
  const { data: configs = [] } = useQuery({
    queryKey: ["form-field-configs", "parat_warabandi_header"],
    queryFn: () => base44.entities.FormFieldConfig.filter({ form_type: "parat_warabandi_header" }, "order"),
  });

  const fields = configs.length > 0
    ? configs.filter(f => f.visible !== false)
    : FALLBACK_FIELDS;

  const set = (key, val) => onChange({ ...data, [key]: val });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800 mb-4 font-heading tracking-wide">Basic Information — بنیادی معلومات</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {fields.map(f => (
          <div key={f.field_key}>
            <label className="text-xs text-slate-500 mb-1 block">
              <span className="font-medium">{f.label_en}</span>
              <span className="text-slate-400 ml-1" style={{ fontFamily: "serif" }}>({f.label_urdu})</span>
            </label>
            <Input
              type={f.field_type || "text"}
              value={data[f.field_key] || ""}
              onChange={e => set(f.field_key, e.target.value)}
              placeholder={f.label_en}
              className="h-9 text-sm bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-300 focus:border-blue-500"
              style={{ direction: f.rtl ? "rtl" : "ltr" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}