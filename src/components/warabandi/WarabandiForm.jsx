import React from "react";
import { Input } from "@/components/ui/input";

const FIELDS = [
  { key: "circle_name", label: "حلقہ / Circle", labelEn: "Circle Name" },
  { key: "canal_name", label: "نہر / Canal", labelEn: "Canal Name" },
  { key: "mogha_name", label: "موغہ نام / Mogha", labelEn: "Mogha Name" },
  { key: "mogha_number", label: "موغہ نمبر", labelEn: "Mogha Number" },
  { key: "village_name", label: "گاؤں / Village", labelEn: "Village Name" },
  { key: "halqa_patwar", label: "حلقہ پٹوار", labelEn: "Halqa Patwar" },
  { key: "tehsil", label: "تحصیل", labelEn: "Tehsil" },
  { key: "district", label: "ضلع", labelEn: "District" },
  { key: "total_cca", label: "کل سی سی اے", labelEn: "Total CCA" },
  { key: "total_khasra_area", label: "کل خسرہ رقبہ", labelEn: "Total Khasra Area" },
  { key: "warabandi_date", label: "تاریخ وارابندی", labelEn: "Warabandi Date", type: "date" },
  { key: "order_number", label: "حکم نمبر", labelEn: "Order Number" },
];

export default function WarabandiForm({ data, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800 mb-4 font-heading tracking-wide">Basic Information — بنیادی معلومات</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FIELDS.map(f => (
          <div key={f.key}>
            <label className="text-xs text-slate-500 mb-1 block">
              <span className="font-medium">{f.labelEn}</span>
              <span className="text-slate-400 ml-1" style={{ fontFamily: "serif" }}>({f.label})</span>
            </label>
            <Input
              type={f.type || "text"}
              value={data[f.key] || ""}
              onChange={e => set(f.key, e.target.value)}
              placeholder={f.labelEn}
              className="h-9 text-sm bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-300 focus:border-blue-500"
              style={{ direction: f.key.includes("name") || f.key === "halqa_patwar" ? "rtl" : "ltr" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}