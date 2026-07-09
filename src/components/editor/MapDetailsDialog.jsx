import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

// Parses a legacy combined value like "L/13223" or "R/13223" into { side, number }.
function splitMogaValue(value, fallbackSide) {
  if (value) {
    const m = String(value).match(/^([LR])\/(\d+)$/i);
    if (m) return { side: m[1].toUpperCase(), number: m[2] };
  }
  return { side: fallbackSide || "L", number: value ? String(value).replace(/\D/g, "") : "" };
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-800 mb-1.5 text-left">{label}</label>
      {children}
    </div>
  );
}

const inputClass = "w-full border border-slate-300 rounded-xl h-10 px-3 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors";

export default function MapDetailsDialog({ mapData, open, onClose, onSave }) {
  const [form, setForm] = useState({
    title: "", moga_number: "", rajbah: "", village: "",
    zilladar_section: "", tehsil: "", district: "", mogha_side: "L",
  });

  useEffect(() => {
    if (mapData) {
      const { side, number } = splitMogaValue(mapData.moga_number, mapData.mogha_side);
      setForm({
        title: mapData.title || "",
        moga_number: number,
        rajbah: mapData.rajbah || "",
        village: mapData.village || "",
        zilladar_section: mapData.zilladar_section || "",
        tehsil: mapData.tehsil || "",
        district: mapData.district || "",
        mogha_side: side,
      });
    }
  }, [mapData, open]);

  if (!open) return null;

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleSave = () => {
    onSave({ ...form, moga_number: form.moga_number.replace(/\D/g, "") });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-[460px] max-w-full overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 px-5 py-3 flex items-center justify-between shrink-0">
          <div>
            <p className="text-white font-bold text-sm font-heading tracking-wide">Header Information</p>
            <p className="text-slate-400 text-[11px]" dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>
              خاکہ دستی موگہ — تفصیلات
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Urdu header preview (like PDF) */}
        <div className="mx-4 mt-4 border border-slate-800 rounded px-4 py-2 text-center shrink-0"
          dir="rtl" style={{ fontFamily: "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', sans-serif" }}>
          <span className="text-sm font-bold text-slate-800">
            خاکہ دستی&nbsp;&nbsp;
            موگہ نمبری <bdi dir="ltr">{form.moga_number ? `${form.moga_number}/${form.mogha_side}` : "_____"}</bdi>&nbsp;&nbsp;
            راجباہ {form.rajbah || "_____"}&nbsp;&nbsp;
            موضع {form.village || "_____"}&nbsp;&nbsp;
            ضلعداری سیکشن {form.zilladar_section || "_____"}&nbsp;&nbsp;
            تحصیل {form.tehsil || "_____"}&nbsp;&nbsp;
            ضلع {form.district || "_____"}
          </span>
        </div>

        {/* Form fields */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          <Field label="Map Title *">
            <input value={form.title} onChange={e => f("title", e.target.value)}
              className={inputClass} placeholder="Map name" />
          </Field>

          {/* Moga number: side dropdown + number, same row */}
          <Field label="موگہ نمبری">
            <div className="flex gap-2">
              <select value={form.mogha_side} onChange={e => f("mogha_side", e.target.value)}
                className="w-20 h-10 px-2 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                <option value="L">L</option>
                <option value="R">R</option>
              </select>
              <input
                value={form.moga_number}
                onChange={e => f("moga_number", e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                placeholder="e.g. 13223"
                className={`${inputClass} flex-1 font-mono`}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Saved value: {form.moga_number ? `${form.mogha_side}/${form.moga_number}` : "—"}
            </p>
          </Field>

          <Field label="راجباہ">
            <input value={form.rajbah} onChange={e => f("rajbah", e.target.value)}
              className={inputClass} placeholder="Canal / Minor name" />
          </Field>

          <Field label="موضع">
            <input value={form.village} onChange={e => f("village", e.target.value)}
              className={inputClass} placeholder="Village / Mozah" />
          </Field>

          <Field label="ضلعداری سیکشن">
            <input value={form.zilladar_section} onChange={e => f("zilladar_section", e.target.value)}
              className={inputClass} placeholder="Zilladar Section" />
          </Field>

          <Field label="سب ڈویژن">
            <input value={form.tehsil} onChange={e => f("tehsil", e.target.value)}
              className={inputClass} placeholder="Sub Division / Tehsil" />
          </Field>

          <Field label="ڈویژن">
            <input value={form.district} onChange={e => f("district", e.target.value)}
              className={inputClass} placeholder="Division / District" />
          </Field>
        </div>

        <div className="px-5 pb-4 pt-3 flex gap-2 justify-end border-t border-slate-100 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>لغو</Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white gap-1.5" onClick={handleSave}>
            <Save className="w-3.5 h-3.5" /> محفوظ کریں
          </Button>
        </div>
      </div>
    </div>
  );
}