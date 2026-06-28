import React, { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Calculator, Languages, Camera, Loader2 } from "lucide-react";

// ====== Area format helpers ======
// Parse area string like "24-3-15" (Murabba-Acre-Kanal-Marla) or plain acres
// Display format: "24 MB 3 Acre 2 Kanal 5 Marla" (English) or just raw value (Urdu)
function formatAreaDisplay(val) {
  if (!val) return "";
  // if it contains MB notation already
  if (/mb/i.test(val)) return val;
  const num = parseFloat(val);
  if (isNaN(num) || num === 0) return val;
  // Convert total acres to MB-Acre-Kanal-Marla
  const totalAcres = num;
  const mb = Math.floor(totalAcres / 25);
  const remAfterMB = totalAcres - mb * 25;
  const acre = Math.floor(remAfterMB);
  const kanalFloat = (remAfterMB - acre) * 8;
  const kanal = Math.floor(kanalFloat);
  const marla = Math.round((kanalFloat - kanal) * 20);
  let parts = [];
  if (mb > 0) parts.push(`${mb} MB`);
  if (acre > 0) parts.push(`${acre} Ac`);
  if (kanal > 0) parts.push(`${kanal} Kn`);
  if (marla > 0) parts.push(`${marla} Ml`);
  return parts.length ? parts.join(" ") : val;
}

function isEnglishOrDigit(val) {
  if (!val) return false;
  return /^[\x00-\x7F\d\s\.\-\/]+$/.test(val.trim());
}

const FALLBACK_COLUMNS = [
  { field_key: "sr_no", label_urdu: "نمبر شمار", label_en: "Sr#", width: "w-14" },
  { field_key: "owner_name", label_urdu: "نام مالک", label_en: "Owner Name", width: "flex-1", rtl: true },
  { field_key: "father_name", label_urdu: "ولدیت", label_en: "Father Name", width: "flex-1", rtl: true },
  { field_key: "khewat_no", label_urdu: "کھسوٹ نمبر", label_en: "Khewat", width: "w-20" },
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
  const [isUrduMode, setIsUrduMode] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scanRef = useRef();
  const { data: configs = [] } = useQuery({
    queryKey: ["form-field-configs", "parat_warabandi_table"],
    queryFn: () => base44.entities.FormFieldConfig.filter({ form_type: "parat_warabandi_table" }, "order"),
  });

  const { data: formulas = [] } = useQuery({
    queryKey: ["formula-configs"],
    queryFn: () => base44.entities.FormulaConfig.filter({ enabled: true }),
  });

  // Total week minutes = 7 days × 24 hours × 60 min = 10080 min/week
  // Water share per acre = 10080 / total_culturable_area (acres)
  // Default formula: total commanded area is fetched from FormulaConfig "total_area"
  // Fallback: 6 min/acre (classic Punjab standard)
  const totalWeekMinutes = 7 * 24 * 60; // 10080

  const minutesPerAcre = (() => {
    const f = formulas.find(f => f.formula_key === "water_time_per_acre" && f.enabled);
    if (f) return Number(f.value);
    // Auto-calculate from total_area config if available
    const ta = formulas.find(f => f.formula_key === "total_area" && f.enabled);
    if (ta && Number(ta.value) > 0) return totalWeekMinutes / Number(ta.value);
    return 6; // default 6 min/acre
  })();

  const minutesPerKanal = minutesPerAcre / 8; // 1 acre = 8 kanals

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

  const calculateWaterTime = () => {
    // Formula: total time per share = (area in acres × minutesPerAcre)
    // 1 acre = 8 kanals = 160 marlas
    const next = rows.map(row => {
      const acres = parseFloat(row.area_acre) || 0;
      const kanals = parseFloat(row.area_kanal) || 0;
      const marlas = parseFloat(row.area_marla) || 0;
      // Convert everything to acres
      const totalAcres = acres + (kanals / 8) + (marlas / 160);
      const totalMinutes = totalAcres * minutesPerAcre;
      const hrs = Math.floor(totalMinutes / 60);
      const mins = Math.round(totalMinutes % 60);
      return { ...row, duration_hours: String(hrs), duration_minutes: String(mins) };
    });
    onChange(next);
  };

  const sum = (key) => rows.reduce((s, r) => s + (parseFloat(r[key]) || 0), 0);
  const totalAcre = sum("area_acre");
  const totalKanal = sum("area_kanal");
  const totalMarla = sum("area_marla");
  const totalHours = sum("duration_hours");
  const totalMinutes = sum("duration_minutes");
  const adjustedHours = totalHours + Math.floor(totalMinutes / 60);
  const adjustedMinutes = totalMinutes % 60;

  const handleScan = async (file) => {
    if (!file) return;
    setScanning(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `This is a scanned Khasra / Jamabandi or Parat Warabandi register page. Extract all rows of land holder data. For each row, return a JSON object with these fields:
- sr_no: row number
- owner_name: name of occupier / مالک کا نام (Urdu)
- father_name: father name / ولدیت (Urdu)
- khewat_no: khewat number
- khatoni_no: khatoni / khata number
- khasra_no: khasra number(s)
- area_acre: total area in acres (number only)
- area_kanal: kanal portion (number only)
- area_marla: marla portion (number only)
- water_share: water share / حصہ آب
- remarks: any remarks or Ghair Mumkin / Zaid Wasoli / Wazgi notes (Urdu)
Return ONLY a JSON array of objects, no extra text.`,
        file_urls: [file_url],
        model: "claude_sonnet_4_6",
        response_json_schema: {
          type: "object",
          properties: {
            rows: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  sr_no: { type: "string" },
                  owner_name: { type: "string" },
                  father_name: { type: "string" },
                  khewat_no: { type: "string" },
                  khatoni_no: { type: "string" },
                  khasra_no: { type: "string" },
                  area_acre: { type: "string" },
                  area_kanal: { type: "string" },
                  area_marla: { type: "string" },
                  water_share: { type: "string" },
                  remarks: { type: "string" },
                },
              },
            },
          },
        },
      });
      if (result?.rows?.length > 0) {
        const parsed = result.rows.map((r, i) => ({
          sr_no: r.sr_no || String(i + 1),
          owner_name: r.owner_name || "",
          father_name: r.father_name || "",
          khewat_no: r.khewat_no || "",
          khatoni_no: r.khatoni_no || "",
          khasra_no: r.khasra_no || "",
          area_acre: r.area_acre || "",
          area_kanal: r.area_kanal || "",
          area_marla: r.area_marla || "",
          water_share: r.water_share || "",
          duration_hours: "",
          duration_minutes: "",
          remarks: r.remarks || "",
        }));
        onChange(parsed);
      }
    } catch (e) {
      alert("اسکین ناکام — دوبارہ کوشش کریں");
    }
    setScanning(false);
    if (scanRef.current) scanRef.current.value = "";
  };

  const inputCls = "w-full bg-transparent outline-none text-xs text-slate-800 px-1 py-1 placeholder:text-slate-300";

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-800 font-heading tracking-wide">
            Khasra Details — حصہ داران کی تفصیل
          </h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Language toggle checkbox */}
          <label className="flex items-center gap-1.5 cursor-pointer bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-sm hover:border-blue-300 transition-colors">
            <input
              type="checkbox"
              checked={isUrduMode}
              onChange={e => setIsUrduMode(e.target.checked)}
              className="w-3.5 h-3.5 accent-blue-600"
            />
            <Languages className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] font-medium text-slate-600">
              {isUrduMode ? (
                <span style={{ fontFamily: "serif" }}>اردو</span>
              ) : "English"}
            </span>
          </label>
          <Button size="sm" variant="outline" onClick={calculateWaterTime}
            className="h-7 text-xs border-blue-200 bg-white text-blue-600 hover:bg-blue-50 gap-1"
            title={`Formula: 7×24×60=${totalWeekMinutes} min/week ÷ total area = ${minutesPerAcre.toFixed(2)} min/acre`}>
            <Calculator className="w-3 h-3" /> حساب ({minutesPerAcre.toFixed(2)}m/ac)
          </Button>
          <Button size="sm" onClick={() => scanRef.current?.click()} disabled={scanning}
            className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white gap-1">
            {scanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
            {scanning ? "اسکین..." : "AI اسکین"}
          </Button>
          <input ref={scanRef} type="file" accept="image/*" className="hidden"
            onChange={e => handleScan(e.target.files[0])} />
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
                  {isUrduMode ? (
                    <div className="text-slate-700 font-semibold text-[10px]" style={{ fontFamily: "serif" }}>{col.label_urdu}</div>
                  ) : (
                    <>
                      <div className="text-slate-600 font-semibold text-[10px]">{col.label_en}</div>
                      <div className="text-slate-400 text-[9px]" style={{ fontFamily: "serif" }}>{col.label_urdu}</div>
                    </>
                  )}
                </th>
              ))}
              <th className="w-8 px-1"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-blue-50/30">
                {columns.map(col => {
                  const isAreaField = ["area_acre", "area_kanal", "area_marla"].includes(col.field_key);
                  const rawVal = row[col.field_key] || "";
                  // For area fields in English mode, show MB format as placeholder/display
                  const showMBHint = isAreaField && !isUrduMode && rawVal && isEnglishOrDigit(rawVal);
                  // Name fields direction based on language mode
                  const isNameField = col.rtl;
                  const direction = isUrduMode
                    ? (isNameField ? "rtl" : "ltr")
                    : "ltr";
                  const textAlign = col.num ? "center" : (isUrduMode && isNameField ? "right" : "left");

                  return (
                    <td key={col.field_key} className={`px-1 border-r border-slate-50 last:border-r-0 ${showMBHint ? "bg-blue-50/40" : ""}`}>
                      <input
                        type={col.num && !isAreaField ? "number" : "text"}
                        value={rawVal}
                        onChange={e => update(i, col.field_key, e.target.value)}
                        className={inputCls}
                        style={{
                          direction,
                          textAlign,
                          fontFamily: isUrduMode && isNameField ? "'Noto Nastaliq Urdu', serif" : undefined,
                        }}
                        placeholder={
                          col.field_key === "sr_no" ? String(i + 1)
                          : isAreaField && !isUrduMode ? (col.field_key === "area_acre" ? "Ac" : col.field_key === "area_kanal" ? "Kn" : "Ml")
                          : "—"
                        }
                      />
                      {showMBHint && (
                        <div className="text-[8px] text-blue-600 text-center font-mono leading-tight pb-0.5">
                          {col.field_key === "area_acre" ? formatAreaDisplay(rawVal) : ""}
                        </div>
                      )}
                    </td>
                  );
                })}
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