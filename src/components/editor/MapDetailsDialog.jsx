import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MapDetailsDialog({ mapData, open, onClose, onSave }) {
  const [form, setForm] = useState({
    title: "", moga_number: "", rajbah: "", section: "",
    zilladar_section: "", tehsil: "", district: "", mogha_side: "L",
  });

  useEffect(() => {
    if (mapData) {
      setForm({
        title: mapData.title || "",
        moga_number: mapData.moga_number || "",
        rajbah: mapData.rajbah || "",
        section: mapData.section || "",
        zilladar_section: mapData.zilladar_section || "",
        tehsil: mapData.tehsil || "",
        district: mapData.district || "",
        mogha_side: mapData.mogha_side || "L",
      });
    }
  }, [mapData, open]);

  if (!open) return null;

  const f = (key, val) => setForm(p => {
    // Auto-fill zilladar_section from section (user wants same name in both)
    if (key === "section") {
      return { ...p, section: val, zilladar_section: val };
    }
    return { ...p, [key]: val };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-[440px] max-w-[95vw] overflow-hidden">
        {/* Header — matches PDF title bar style */}
        <div className="bg-slate-900 px-5 py-3 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-sm font-heading tracking-wide">Map Details</p>
            <p className="text-slate-400 text-[11px]" dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>
              خاکہ دستی موگہ — تفصیلات
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Urdu header preview (like PDF) */}
        <div className="mx-4 mt-4 border border-slate-800 rounded px-4 py-2 text-center"
          dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', Rajdhani, sans-serif" }}>
          <span className="text-sm font-bold text-slate-800">
            خاکہ دستی&nbsp;&nbsp;
            موگہ نمبری {form.moga_number ? `${form.moga_number}/${form.mogha_side}` : "_____"}&nbsp;&nbsp;
            راجباہ {form.rajbah || "_____"}&nbsp;&nbsp;
            موضع {form.section || "_____"}&nbsp;&nbsp;
            ضلعداری سیکشن {form.zilladar_section || "_____"}&nbsp;&nbsp;
            تحصیل {form.tehsil || "_____"}&nbsp;&nbsp;
            ضلع {form.district || "_____"}
          </span>
        </div>

        {/* Form fields */}
        <div className="px-5 py-4 space-y-3">
          {/* Map name */}
          <div>
            <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1">Map Title</label>
            <input value={form.title} onChange={e => f("title", e.target.value)}
              className="w-full border border-slate-200 rounded-lg h-8 px-3 text-sm text-slate-800 focus:outline-none focus:border-blue-400"
              placeholder="Map name" />
          </div>

          {/* Moga number + side */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1" dir="rtl"
                style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>موگہ نمبری</label>
              <input value={form.moga_number} onChange={e => f("moga_number", e.target.value)}
                className="w-full border border-slate-200 rounded-lg h-8 px-3 text-sm text-slate-800 focus:outline-none focus:border-blue-400"
                placeholder="e.g. 18500" />
            </div>
            <div className="w-20">
              <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1">Side</label>
              <select value={form.mogha_side} onChange={e => f("mogha_side", e.target.value)}
                className="w-full border border-slate-200 rounded-lg h-8 px-2 text-sm text-slate-800 focus:outline-none focus:border-blue-400">
                <option value="L">L</option>
                <option value="R">R</option>
              </select>
            </div>
          </div>

          {/* Rajbah */}
          <div>
            <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1" dir="rtl"
              style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>راجباہ — روڈہ مائنر</label>
            <input value={form.rajbah} onChange={e => f("rajbah", e.target.value)}
              className="w-full border border-slate-200 rounded-lg h-8 px-3 text-sm text-slate-800 focus:outline-none focus:border-blue-400"
              placeholder="Canal / Minor name" />
          </div>

          {/* Section / Mouza */}
          <div>
            <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1" dir="rtl"
              style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>موضع (سیکشن)</label>
            <input value={form.section} onChange={e => f("section", e.target.value)}
              className="w-full border border-slate-200 rounded-lg h-8 px-3 text-sm text-slate-800 focus:outline-none focus:border-blue-400"
              placeholder="Section / Village" />
          </div>

          {/* Zilladar Section */}
          <div>
            <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1" dir="rtl"
              style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>ضلعداری سیکشن</label>
            <input value={form.zilladar_section} onChange={e => f("zilladar_section", e.target.value)}
              className="w-full border border-slate-200 rounded-lg h-8 px-3 text-sm text-slate-800 focus:outline-none focus:border-blue-400"
              placeholder="Zilladar Section" />
          </div>

          {/* Sub division */}
          <div>
            <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1" dir="rtl"
              style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>تحصیل (سب ڈویژن)</label>
            <input value={form.tehsil} onChange={e => f("tehsil", e.target.value)}
              className="w-full border border-slate-200 rounded-lg h-8 px-3 text-sm text-slate-800 focus:outline-none focus:border-blue-400"
              placeholder="Sub Division / Tehsil" />
          </div>

          {/* Division */}
          <div>
            <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1" dir="rtl"
              style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>ضلع (ڈویژن)</label>
            <input value={form.district} onChange={e => f("district", e.target.value)}
              className="w-full border border-slate-200 rounded-lg h-8 px-3 text-sm text-slate-800 focus:outline-none focus:border-blue-400"
              placeholder="Division / District" />
          </div>
        </div>

        <div className="px-5 pb-4 flex gap-2 justify-end border-t border-slate-100 pt-3">
          <Button variant="outline" size="sm" onClick={onClose}>لغو</Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white gap-1.5" onClick={() => { onSave(form); onClose(); }}>
            <Save className="w-3.5 h-3.5" /> محفوظ کریں
          </Button>
        </div>
      </div>
    </div>
  );
}