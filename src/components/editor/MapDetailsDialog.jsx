import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { X, Save, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import AutocompleteInput from "@/components/editor/AutocompleteInput";

// Parses a legacy combined value like "L/13223" or "R/13223" into { side, number }.
function splitMogaValue(value, fallbackSide) {
  if (value) {
    const m = String(value).match(/^([LR]|T\.L|T\.R|T-F\.L|T-F\.R)\/(\d+)$/i);
    if (m) return { side: m[1].toUpperCase(), number: m[2] };
  }
  return { side: fallbackSide || "L", number: value ? String(value).replace(/\D/g, "") : "" };
}

// Auto-build the map title from Moga number/side + Rajbah + Village — mirrors the
// create-dialog logic. Stops overwriting once the user manually edits the title.
function buildAutoTitle(m) {
  const parts = [];
  if (m.moga_number) parts.push(`${m.moga_number}${m.mogha_side ? `/${m.mogha_side}` : ""}`);
  if (m.rajbah) parts.push(`راجباہ ${m.rajbah}`);
  if (m.village) parts.push(`موضع ${m.village}`);
  return parts.join(" - ");
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
  const titleTouched = useRef(false);
  // مواضعات — one box per village (min 2), joined with "و" into the saved village string
  const [villages, setVillages] = useState(["", ""]);

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
  // Individual village names for the مواضعات boxes — split previously joined values ("X و Y")
  const villageSuggestions = [...new Set(suggestions.village.flatMap(s => String(s).split(/\s+و\s+/)))]
    .filter(Boolean).sort((a, b) => a.localeCompare(b, "ur"));

  useEffect(() => {
    if (mapData) {
      const { side, number } = splitMogaValue(mapData.moga_number, mapData.mogha_side);
      const next = {
        title: mapData.title || "",
        moga_number: number,
        rajbah: mapData.rajbah || "",
        village: mapData.village || "",
        zilladar_section: mapData.zilladar_section || "",
        tehsil: mapData.tehsil || "",
        district: mapData.district || "",
        mogha_side: side,
      };
      // If the saved title is custom (≠ auto-derived), don't overwrite it on field changes.
      titleTouched.current = !!mapData.title && mapData.title !== buildAutoTitle(next);
      setForm(next);
      // Parse the joined village string ("X و Y") into one box per village
      const parsed = (mapData.village || "").split(/\s+و\s+/).map(s => s.trim()).filter(Boolean);
      setVillages(parsed.length ? [...parsed, ...Array(Math.max(0, 2 - parsed.length)).fill("")] : ["", ""]);
    }
  }, [mapData, open]);

  if (!open) return null;

  const f = (key, val) => setForm(p => {
    const next = { ...p, [key]: val };
    // Rebuild the auto title when moga number/side/rajbah/village change, unless
    // the user has manually customized the title.
    if ((key === "moga_number" || key === "mogha_side" || key === "rajbah" || key === "village") && !titleTouched.current) {
      next.title = buildAutoTitle(next);
    }
    return next;
  });

  // مواضعات — update one village box; syncs the joined "X و Y" string + auto title
  const setVillageAt = (i, val) => {
    const next = [...villages];
    next[i] = val;
    setVillages(next);
    const joined = next.map(s => s.trim()).filter(Boolean).join(" و ");
    setForm(p => {
      const nf = { ...p, village: joined };
      if (!titleTouched.current) nf.title = buildAutoTitle(nf);
      return nf;
    });
  };
  const addVillage = () => setVillages(prev => [...prev, ""]);

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
            {(form.village || "").split(/\s+و\s+/).filter(Boolean).length > 1 ? "مواضعات" : "موضع"} {form.village || "_____"}&nbsp;&nbsp;
            ضلعداری سیکشن {form.zilladar_section || "_____"}&nbsp;&nbsp;
            تحصیل {form.tehsil || "_____"}&nbsp;&nbsp;
            ضلع {form.district || "_____"}
          </span>
        </div>

        {/* Form fields */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          <Field label="Map Title *">
            <input value={form.title} onChange={e => { titleTouched.current = true; f("title", e.target.value); }}
              className={inputClass} placeholder="Map name" />
          </Field>

          {/* Moga number: side dropdown + number, same row */}
          <Field label="موگہ نمبری">
            <div className="flex gap-2">
              <select value={form.mogha_side} onChange={e => f("mogha_side", e.target.value)}
                className="w-20 h-10 px-2 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                <option value="L">L</option>
                <option value="R">R</option>
                <option value="T.L">T.L</option>
                <option value="T.R">T.R</option>
                <option value="T-F.R">T-F.R</option>
                <option value="T-F.L">T-F.L</option>
              </select>
              <AutocompleteInput
                value={form.moga_number}
                onChange={v => f("moga_number", v)}
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

          <Field label="مواضعات">
            <div className="flex flex-wrap items-center gap-2">
              {villages.map((v, i) => (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <span className="text-sm font-bold text-slate-700" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>و</span>
                  )}
                  <AutocompleteInput value={v} onChange={val => setVillageAt(i, val)}
                    suggestions={villageSuggestions} placeholder="Village / Mozah" className={`${inputClass} flex-1 min-w-[120px]`} />
                </React.Fragment>
              ))}
              <button onClick={addVillage} title="مزید موضع شامل کریں"
                className="h-10 w-10 shrink-0 border border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </button>
            </div>
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