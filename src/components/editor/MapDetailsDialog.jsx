import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import AutocompleteInput from "@/components/editor/AutocompleteInput";

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

// Fields that get autocomplete suggestions from previously saved maps
const AUTOCOMPLETE_KEYS = ["rajbah", "village", "zilladar_section", "tehsil", "district", "moga_number"];

export default function MapDetailsDialog({ mapData, open, onClose, onSave }) {
  const [form, setForm] = useState({
    title: "", moga_number: "", rajbah: "", village: "",
    zilladar_section: "", tehsil: "", district: "", mogha_side: "L",
  });

  // Fetch existing maps once — shared/cached with MapList via the same query key
  const { data: maps = [] } = useQuery({
    queryKey: ["maps"],
    queryFn: () => base44.entities.LandMap.list("-created_date", 200),
    staleTime: 60 * 1000,
  });

  // Build unique sorted suggestion lists per field from previously saved values
  const suggestions = AUTOCOMPLETE_KEYS.reduce((acc, key) => {
    const set = new Set();
    maps.forEach(m => { const v = m[key]; if (v) set.add(String(v)); });
    acc[key] = Array.from(set).sort((a, b) => a.localeCompare(b, "ur"));
    return acc;
  }, {});

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

        {/* Form fields — order: moga number/side → rajbah → mozah →
            zilladar section → sub-division → division → map title (auto = moga no.) */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          {/* Moga number: side dropdown + number, same row — top of form */}
          <Field label="موگہ نمبری">
            <div className="flex gap-2">
              <select value={form.mogha_side} onChange={e => f("mogha_side", e.target.value)}
                className="w-20 h-10 px-2 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                <option value="L">L</option>
                <option value="R">R</option>
              </select>
              <AutocompleteInput
                value={form.moga_number}
                onChange={v => { f("moga_number", v); f("title", v); }}
                suggestions={suggestions.moga_number}
                inputMode="numeric"
                numeric
                placeholder="e.g. 13223"
                className={`${inputClass} flex-1 font-mono`}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Saved value: {form.moga_number ? `${form.moga_number}/${form.mogha_side}` : "—"}
            </p>
          </Field>

          <Field label="راجباہ">
            <AutocompleteInput value={form.rajbah} onChange={v => f("rajbah", v)}
              suggestions={suggestions.rajbah} placeholder="Canal / Minor name" className={inputClass} />
          </Field>

          <Field label="موضع">
            <AutocompleteInput value={form.village} onChange={v => f("village", v)}
              suggestions={suggestions.village} placeholder="Village / Mozah" className={inputClass} />
          </Field>

          <Field label="ضلعداری سیکشن">
            <AutocompleteInput value={form.zilladar_section} onChange={v => f("zilladar_section", v)}
              suggestions={suggestions.zilladar_section} placeholder="Zilladar Section" className={inputClass} />
          </Field>

          <Field label="سب ڈویژن">
            <AutocompleteInput value={form.tehsil} onChange={v => f("tehsil", v)}
              suggestions={suggestions.tehsil} placeholder="Sub Division / Tehsil" className={inputClass} />
          </Field>

          <Field label="ڈویژن">
            <AutocompleteInput value={form.district} onChange={v => f("district", v)}
              suggestions={suggestions.district} placeholder="Division / District" className={inputClass} />
          </Field>

          {/* Map Title — at the end, auto-filled with the moga number */}
          <Field label="Map Title *">
            <input value={form.title} onChange={e => f("title", e.target.value)}
              className={inputClass} placeholder="Auto-filled from moga number" />
            <p className="text-[11px] text-slate-400 mt-1">Auto-set to moga number — editable</p>
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