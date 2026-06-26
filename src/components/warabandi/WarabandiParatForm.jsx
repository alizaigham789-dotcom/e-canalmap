import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Printer } from "lucide-react";

const DEFAULT_NOTES = [
  "تصدیق کی جاتی ہے کہ نقل مطابق اصل درست ہے۔",
  "پرت وارہ بندی سائل کی درخواست پر مرتب کی گئی ہے۔",
  "موگہ ہذا میں باغ منظور شدہ نہ ہے۔",
  "بحکم جناب SDO صاحب قائد آباد وارہ بندی منظور شدہ کھال ترمیم کر کے رواں کھال پر مرتب کی گئی ہے۔",
  "وارہ بندی CCA/GCA پر مرتب کی گئی ہے۔",
];

const emptyRow = () => ({
  khatoni2: "", owner_name2: "", total_area2: "",
  khalis_waari2_minute: "", khalis_waari2_ghante: "",
  nikha2_lega: "", nikha2_dega: "",
  khatoni: "", owner_name: "", bandubast: "", total_area: "", ghair_mumkin: "", khalis_raqba: "",
  waari_minute: "", waari_ghante: "",
  zaidah_minute: "", zaidah_ghante: "",
  wazgi_minute: "", wazgi_ghante: "",
  khalis_waari_minute: "", khalis_waari_ghante: "",
  nikha_lega: "", nikha_dega: "",
  tashreeh_din: "",
  tashreeh_raat: "",
});

function sumCol(rows, key) {
  const s = rows.reduce((acc, r) => acc + (parseFloat(r[key]) || 0), 0);
  return s === 0 ? "-" : String(s % 1 === 0 ? s : s.toFixed(2));
}

function d(val) { return (val === "" || val === null || val === undefined) ? "-" : val; }

// Render نمبران بندوبست as fraction-style e.g. 87/(3-4-7)
function BandubastDisplay({ value }) {
  if (!value) return <span className="text-slate-300">—</span>;
  // Split on "/" to show as fraction style
  const parts = value.split("/");
  if (parts.length >= 2) {
    return (
      <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1, fontSize: "9px", fontFamily: "serif" }}>
        <span>{parts[0]}</span>
        <span style={{ borderTop: "1px solid currentColor", paddingTop: "1px", fontSize: "8px" }}>{parts.slice(1).join("/")}</span>
      </span>
    );
  }
  return <span style={{ fontFamily: "serif", fontSize: "9px" }}>{value}</span>;
}

// Render لیگا/دیگا as fraction-style
function NikhaDisplay({ value }) {
  if (!value) return <span className="text-slate-300">—</span>;
  const parts = value.split("/");
  if (parts.length >= 2) {
    return (
      <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1, fontSize: "9px", fontFamily: "serif" }}>
        <span>{parts[0]}</span>
        <span style={{ borderTop: "1px solid currentColor", paddingTop: "1px", fontSize: "8px" }}>{parts.slice(1).join("/")}</span>
      </span>
    );
  }
  return <span style={{ fontFamily: "serif", fontSize: "9px" }}>{value}</span>;
}

const COL_LETTERS = ["ا","ب","ج","د","ہ","و","ز","ح","ط","ی","ک","ل","م","ن","س","ع","ف","ص","ق","ر","ش","ت","ث","خ"];

const PRINT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
  @page { size: A4 landscape; margin: 8mm; }
  body { font-family: 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif; margin:0; padding:10px; direction:rtl; color:#000; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1.5px solid #333; padding: 2px 3px; text-align: center; font-size: 7.5px; font-family: 'Noto Nastaliq Urdu', serif; }
  th { background: #e8e8e8; font-weight: bold; }
  .total-row td { background: #fef9e7; font-weight: bold; }
  .frac { display: inline-flex; flex-direction: column; align-items: center; line-height: 1.1; font-size: 7px; }
  .frac .num { border-bottom: 1px solid #000; padding-bottom: 1px; }
  .header-title { text-align: center; font-size: 13px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #333; padding-bottom: 6px; font-family: 'Noto Nastaliq Urdu', serif; }
  .notes-section { font-size: 10px; line-height: 2; direction: rtl; font-family: 'Noto Nastaliq Urdu', serif; }
  .sig-section { display: flex; justify-content: space-between; margin-top: 28px; font-size: 11px; }
  .sig-item { text-align: center; border-top: 1px solid #333; padding-top: 4px; min-width: 140px; }
`;

export default function WarabandiParatForm() {
  const [docType, setDocType] = useState("پرت وارہ بندی");
  const [header, setHeader] = useState({
    mogha_number: "18650", mogha_side: "R", rajbaha: "پیلو مائنر",
    mouza: "روڈہ", section: "گنجیال", sub_division: "قائد آباد", canal_division: "خوشاب",
  });
  const [rows, setRows] = useState(() => Array.from({ length: 5 }, emptyRow));
  const [notes, setNotes] = useState([...DEFAULT_NOTES]);
  const [showPrint, setShowPrint] = useState(false);
  const [showRowSr, setShowRowSr] = useState(true);
  const [showColSr, setShowColSr] = useState(true);
  const [printRowSr, setPrintRowSr] = useState(false);
  const [printColSr, setPrintColSr] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);

  const updateHeader = (key, val) => setHeader(prev => ({ ...prev, [key]: val }));

  const updateRow = (i, key, val) => {
    setRows(prev => {
      const next = prev.map((r, idx) => idx === i ? { ...r, [key]: val } : r);
      const row = next[i];
      // Auto-mirror: ا→ح (khatoni2→khatoni), ب→ط (owner_name2→owner_name), ج→ک (total_area2→total_area... but total_area is source of truth from main side)
      // Mirror rules (source col → dest col):
      if (key === "khatoni2") next[i] = { ...next[i], khatoni: val };
      if (key === "khatoni") next[i] = { ...next[i], khatoni2: val };
      if (key === "owner_name2") next[i] = { ...next[i], owner_name: val };
      if (key === "owner_name") next[i] = { ...next[i], owner_name2: val };
      if (key === "total_area2") next[i] = { ...next[i], total_area: val, khalis_raqba: calcKhalis(val, next[i].ghair_mumkin) };
      if (key === "total_area") {
        const kr = calcKhalis(val, next[i].ghair_mumkin);
        next[i] = { ...next[i], total_area2: val, khalis_raqba: kr };
      }
      if (key === "ghair_mumkin") next[i] = { ...next[i], khalis_raqba: calcKhalis(next[i].total_area, val) };
      // د→ر: khalis_waari2_minute→khalis_waari_minute (and vice versa), ghante too
      if (key === "khalis_waari2_minute") next[i] = { ...next[i], khalis_waari_minute: val };
      if (key === "khalis_waari_minute") next[i] = { ...next[i], khalis_waari2_minute: val };
      if (key === "khalis_waari2_ghante") next[i] = { ...next[i], khalis_waari_ghante: val };
      if (key === "khalis_waari_ghante") next[i] = { ...next[i], khalis_waari2_ghante: val };
      // ہ→ش: nikha2_lega↔nikha_lega, nikha2_dega↔nikha_dega
      if (key === "nikha2_lega") next[i] = { ...next[i], nikha_lega: val };
      if (key === "nikha_lega") next[i] = { ...next[i], nikha2_lega: val };
      if (key === "nikha2_dega") next[i] = { ...next[i], nikha_dega: val };
      if (key === "nikha_dega") next[i] = { ...next[i], nikha2_dega: val };
      return next;
    });
  };

  function calcKhalis(total, ghair) {
    const t = parseFloat(total) || 0;
    const g = parseFloat(ghair) || 0;
    if (t === 0) return "";
    const result = t - g;
    return result % 1 === 0 ? String(result) : result.toFixed(2);
  }

  // Insert row after index i (-1 = prepend)
  const insertRowAfter = (i) => {
    setRows(prev => {
      const next = [...prev];
      next.splice(i + 1, 0, emptyRow());
      return next;
    });
  };

  const removeRow = (i) => setRows(prev => prev.filter((_, idx) => idx !== i));

  const updateNote = (i, val) => setNotes(prev => { const n = [...prev]; n[i] = val; return n; });
  const addNote = () => setNotes(prev => [...prev, ""]);
  const removeNote = (i) => setNotes(prev => prev.filter((_, idx) => idx !== i));

  const moghaFull = `${header.mogha_side}/${header.mogha_number}`;
  // Build header line - skip fields that are empty
  const headerParts = [docType, `موگہ نمبری ${moghaFull}`];
  if (header.rajbaha) headerParts.push(`راجباہ ${header.rajbaha}`);
  if (header.mouza) headerParts.push(`موضع ${header.mouza}`);
  if (header.section) headerParts.push(`سیکشن ${header.section}`);
  if (header.sub_division) headerParts.push(`سب ڈویژن ${header.sub_division}`);
  if (header.canal_division) headerParts.push(`کینال ڈویژن ${header.canal_division}`);
  const headerLine = headerParts.join(" ، ");

  const inputCls = "w-full bg-transparent outline-none text-[10px] text-slate-800 text-center px-0.5 py-0.5 placeholder:text-slate-300";
  const thCls = "border border-slate-500 text-center bg-slate-100 px-0.5 py-0.5 text-[9px] font-bold leading-tight";
  const tdCls = "border border-slate-300 text-center px-0 py-0 text-[10px]";
  const totalCls = "border border-slate-400 text-center px-0.5 py-1 text-[10px] font-bold bg-amber-50";

  const printData = { docType, headerLine, rows, notes, printRowSr, printColSr };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Screen Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <select value={docType} onChange={e => setDocType(e.target.value)} dir="rtl"
            className="border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-400 font-semibold"
            style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
            <option value="پرت وارہ بندی">پرت وارہ بندی</option>
            <option value="کیس ترمیم وارہ بندی">کیس ترمیم وارہ بندی</option>
          </select>
          <div className="flex gap-2 items-center flex-wrap justify-end">
            <label className="flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer">
              <input type="checkbox" checked={printRowSr} onChange={e => setPrintRowSr(e.target.checked)} className="w-3 h-3" />
              پرنٹ قطار نمبرشمار
            </label>
            <label className="flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer">
              <input type="checkbox" checked={printColSr} onChange={e => setPrintColSr(e.target.checked)} className="w-3 h-3" />
              پرنٹ کالم نمبرشمار
            </label>
            <Button size="sm" onClick={() => setShowPrint(true)} className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1">
              <Printer className="w-3 h-3" /> پرنٹ
            </Button>
          </div>
        </div>

        <div dir="rtl" className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] text-slate-500 font-semibold" style={{ fontFamily: "serif" }}>موگہ نمبری</label>
            <div className="flex gap-1" dir="ltr">
              <input value={header.mogha_number} onChange={e => updateHeader("mogha_number", e.target.value)}
                placeholder="18650" dir="ltr"
                className="border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-400 flex-1 min-w-0" />
              <select value={header.mogha_side} onChange={e => updateHeader("mogha_side", e.target.value)}
                className="border border-slate-300 rounded px-1 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-400 w-14">
                <option value="R">R</option>
                <option value="L">L</option>
              </select>
            </div>
          </div>
          {[
            { key: "rajbaha", label: "راجباہ", placeholder: "پیلو مائنر" },
            { key: "mouza", label: "موضع", placeholder: "روڈہ" },
            { key: "section", label: "سیکشن", placeholder: "گنجیال" },
            { key: "sub_division", label: "سب ڈویژن", placeholder: "قائد آباد" },
            { key: "canal_division", label: "کینال ڈویژن", placeholder: "خوشاب" },
          ].map(f => (
            <div key={f.key} className="flex flex-col gap-0.5">
              <label className="text-[9px] text-slate-500 font-semibold" style={{ fontFamily: "serif" }}>{f.label}</label>
              <input value={header[f.key]} onChange={e => updateHeader(f.key, e.target.value)}
                placeholder={f.placeholder} dir="rtl"
                className="border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-400"
                style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }} />
            </div>
          ))}
        </div>

        <div dir="rtl" className="mt-3 p-2 bg-white border border-dashed border-slate-300 rounded text-center text-[11px] text-blue-700 font-bold"
          style={{ fontFamily: "'Noto Nastaliq Urdu', serif", lineHeight: 2.2 }}>
          {headerLine}
        </div>
      </div>

      {/* Table toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-white">
        <span className="text-[10px] text-slate-500 font-semibold">تفصیل حصہ داران</span>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer">
            <input type="checkbox" checked={showRowSr} onChange={e => setShowRowSr(e.target.checked)} className="w-3 h-3" />
            قطار نمبرشمار
          </label>
          <label className="flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer">
            <input type="checkbox" checked={showColSr} onChange={e => setShowColSr(e.target.checked)} className="w-3 h-3" />
            کالم نمبرشمار
          </label>
          <Button size="sm" onClick={() => insertRowAfter(rows.length - 1)} className="h-6 text-[10px] bg-blue-600 hover:bg-blue-700 text-white gap-1 px-2">
            <Plus className="w-3 h-3" /> قطار
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table style={{ borderCollapse: "collapse", minWidth: "1700px", width: "100%", direction: "rtl" }}>
          <thead>
            {showColSr && (
              <tr style={{ backgroundColor: "#f0f4ff" }}>
                {showRowSr && <th className={thCls} style={{ fontSize: "8px", color: "#888", width: 28 }}>#</th>}
                {COL_LETTERS.map((l, i) => (
                  <th key={i} className={thCls} style={{ fontSize: "8px", color: "#1d4ed8", fontWeight: "bold" }}>{l}</th>
                ))}
                <th className={thCls} style={{ width: 40 }}></th>
              </tr>
            )}
            <tr style={{ backgroundColor: "#dbeafe" }}>
              {showRowSr && <th className={thCls} rowSpan={2} style={{ fontSize: "8px", color: "#1d4ed8", width: 28 }}>نمبرشمار</th>}
              <th className={thCls} rowSpan={2}>کھاتہ نمبر</th>
              <th className={thCls} rowSpan={2} style={{ minWidth: 80 }}>نام مالک معہ والدیت</th>
              <th className={thCls} rowSpan={2}>کل رقبہ</th>
              <th className={thCls} colSpan={2}>خالص واری</th>
              <th className={thCls} colSpan={2}>نکہ جات</th>
              <th className={thCls} rowSpan={2}>کھاتہ نمبر</th>
              <th className={thCls} rowSpan={2} style={{ minWidth: 80 }}>نام مالک معہ والدیت</th>
              <th className={thCls} rowSpan={2} style={{ minWidth: 90 }}>نمبران بندوبست</th>
              <th className={thCls} rowSpan={2}>کل رقبہ</th>
              <th className={thCls} rowSpan={2}>غیر ممکن رقبہ</th>
              <th className={thCls} rowSpan={2}>خالص رقبہ</th>
              <th className={thCls} colSpan={2}>واری بحساب رقبہ</th>
              <th className={thCls} colSpan={2}>زائدہ وصولی</th>
              <th className={thCls} colSpan={2}>وضگی</th>
              <th className={thCls} colSpan={2}>خالص واری</th>
              <th className={thCls} colSpan={2}>نکہ جات</th>
              <th className={thCls} rowSpan={2}>تشریح اوقات دن</th>
              <th className={thCls} rowSpan={2}>تشریح اوقات رات</th>
              <th className={thCls} rowSpan={2} style={{ width: 40 }}></th>
            </tr>
            <tr style={{ backgroundColor: "#eff6ff" }}>
              <th className={thCls}>منٹ</th><th className={thCls}>گھنٹے</th>
              <th className={thCls}>لیگا</th><th className={thCls}>دیگا</th>
              <th className={thCls}>منٹ</th><th className={thCls}>گھنٹے</th>
              <th className={thCls}>منٹ</th><th className={thCls}>گھنٹے</th>
              <th className={thCls}>منٹ</th><th className={thCls}>گھنٹے</th>
              <th className={thCls}>منٹ</th><th className={thCls}>گھنٹے</th>
              <th className={thCls}>لیگا</th><th className={thCls}>دیگا</th>
              <th className={thCls} style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {/* Insert-before-first row button */}
            <tr>
              <td colSpan={99} style={{ padding: 0, height: "2px", border: "none" }}>
                <div className="flex justify-center">
                  <button onClick={() => insertRowAfter(-1)}
                    className="opacity-0 hover:opacity-100 focus:opacity-100 text-blue-400 hover:text-blue-600 text-[9px] px-1 transition-opacity"
                    title="قطار شامل کریں">
                    <Plus className="w-2.5 h-2.5 inline" />
                  </button>
                </div>
              </td>
            </tr>
            {rows.map((row, i) => (
              <React.Fragment key={i}>
                <tr className="hover:bg-blue-50/30" onMouseEnter={() => setHoveredRow(i)} onMouseLeave={() => setHoveredRow(null)}>
                  {showRowSr && <td className={tdCls} style={{ fontSize: "9px", color: "#1d4ed8", minWidth: 28, textAlign: "center", fontWeight: "bold" }}>{i + 1}</td>}
                  {/* ا — khatoni2 */}
                  <td className={tdCls}><input value={row.khatoni2} onChange={e => updateRow(i, "khatoni2", e.target.value)} className={inputCls} /></td>
                  {/* ب — owner_name2 */}
                  <td className={tdCls} style={{ minWidth: 80 }}><input value={row.owner_name2} onChange={e => updateRow(i, "owner_name2", e.target.value)} className={inputCls} dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }} /></td>
                  {/* ج — total_area2 */}
                  <td className={tdCls}><input value={row.total_area2} onChange={e => updateRow(i, "total_area2", e.target.value)} className={inputCls} /></td>
                  {/* د — khalis_waari2_minute */}
                  <td className={tdCls}><input value={row.khalis_waari2_minute} onChange={e => updateRow(i, "khalis_waari2_minute", e.target.value)} className={inputCls} /></td>
                  {/* ہ — khalis_waari2_ghante */}
                  <td className={tdCls}><input value={row.khalis_waari2_ghante} onChange={e => updateRow(i, "khalis_waari2_ghante", e.target.value)} className={inputCls} /></td>
                  {/* و — nikha2_lega */}
                  <td className={tdCls}><input value={row.nikha2_lega} onChange={e => updateRow(i, "nikha2_lega", e.target.value)} className={inputCls} style={{ fontFamily: "serif" }} /></td>
                  {/* ز — nikha2_dega */}
                  <td className={tdCls}><input value={row.nikha2_dega} onChange={e => updateRow(i, "nikha2_dega", e.target.value)} className={inputCls} style={{ fontFamily: "serif" }} /></td>
                  {/* ح — khatoni (auto from ا) */}
                  <td className={tdCls}><input value={row.khatoni} onChange={e => updateRow(i, "khatoni", e.target.value)} className={inputCls} /></td>
                  {/* ط — owner_name (auto from ب) */}
                  <td className={tdCls} style={{ minWidth: 80 }}><input value={row.owner_name} onChange={e => updateRow(i, "owner_name", e.target.value)} className={inputCls} dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }} /></td>
                  {/* ی — bandubast (fraction style) */}
                  <td className={tdCls} style={{ minWidth: 90 }}>
                    <input value={row.bandubast} onChange={e => updateRow(i, "bandubast", e.target.value)} className={inputCls}
                      placeholder="87/(3-4)" dir="ltr" style={{ fontFamily: "serif" }} />
                  </td>
                  {/* ک — total_area (auto from ج) */}
                  <td className={tdCls}><input value={row.total_area} onChange={e => updateRow(i, "total_area", e.target.value)} className={inputCls} /></td>
                  {/* ل — ghair_mumkin */}
                  <td className={tdCls}><input value={row.ghair_mumkin} onChange={e => updateRow(i, "ghair_mumkin", e.target.value)} className={inputCls} /></td>
                  {/* م — khalis_raqba (auto-calculated) */}
                  <td className={tdCls} style={{ backgroundColor: "#f0fdf4" }}><input value={row.khalis_raqba} onChange={e => updateRow(i, "khalis_raqba", e.target.value)} className={inputCls} style={{ color: "#166534" }} /></td>
                  {/* ن — waari_minute */}
                  <td className={tdCls}><input value={row.waari_minute} onChange={e => updateRow(i, "waari_minute", e.target.value)} className={inputCls} /></td>
                  {/* س — waari_ghante */}
                  <td className={tdCls}><input value={row.waari_ghante} onChange={e => updateRow(i, "waari_ghante", e.target.value)} className={inputCls} /></td>
                  {/* ع — zaidah_minute */}
                  <td className={tdCls}><input value={row.zaidah_minute} onChange={e => updateRow(i, "zaidah_minute", e.target.value)} className={inputCls} /></td>
                  {/* ف — zaidah_ghante */}
                  <td className={tdCls}><input value={row.zaidah_ghante} onChange={e => updateRow(i, "zaidah_ghante", e.target.value)} className={inputCls} /></td>
                  {/* ص — wazgi_minute */}
                  <td className={tdCls}><input value={row.wazgi_minute} onChange={e => updateRow(i, "wazgi_minute", e.target.value)} className={inputCls} /></td>
                  {/* ق — wazgi_ghante */}
                  <td className={tdCls}><input value={row.wazgi_ghante} onChange={e => updateRow(i, "wazgi_ghante", e.target.value)} className={inputCls} /></td>
                  {/* ر — khalis_waari_minute (auto from د) */}
                  <td className={tdCls}><input value={row.khalis_waari_minute} onChange={e => updateRow(i, "khalis_waari_minute", e.target.value)} className={inputCls} /></td>
                  {/* ش — khalis_waari_ghante (auto from ہ) */}
                  <td className={tdCls}><input value={row.khalis_waari_ghante} onChange={e => updateRow(i, "khalis_waari_ghante", e.target.value)} className={inputCls} /></td>
                  {/* ت — nikha_lega (auto from و) */}
                  <td className={tdCls}><input value={row.nikha_lega} onChange={e => updateRow(i, "nikha_lega", e.target.value)} className={inputCls} style={{ fontFamily: "serif" }} /></td>
                  {/* ث — nikha_dega (auto from ز) */}
                  <td className={tdCls}><input value={row.nikha_dega} onChange={e => updateRow(i, "nikha_dega", e.target.value)} className={inputCls} style={{ fontFamily: "serif" }} /></td>
                  <td className={tdCls}><input value={row.tashreeh_din} onChange={e => updateRow(i, "tashreeh_din", e.target.value)} className={inputCls} /></td>
                  <td className={tdCls}><input value={row.tashreeh_raat} onChange={e => updateRow(i, "tashreeh_raat", e.target.value)} className={inputCls} /></td>
                  <td className={tdCls} style={{ width: 40 }}>
                    <button onClick={() => removeRow(i)} className="text-slate-300 hover:text-red-500 p-0.5" title="قطار حذف کریں">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
                {/* Insert-after row button */}
                <tr style={{ height: "6px", backgroundColor: "#f8faff" }}>
                  <td colSpan={99} style={{ border: "none", padding: 0, textAlign: "center" }}>
                    <button onClick={() => insertRowAfter(i)}
                      className="w-full text-blue-300 hover:text-blue-600 hover:bg-blue-50 text-[8px] py-0.5 transition-colors flex items-center justify-center gap-0.5"
                      title={`قطار ${i + 2} کے بعد شامل کریں`}>
                      <Plus className="w-2 h-2" />
                    </button>
                  </td>
                </tr>
              </React.Fragment>
            ))}
            {/* میزان row */}
            <tr style={{ backgroundColor: "#fef9e7" }}>
              {showRowSr && <td className={totalCls} style={{ fontSize: "9px" }}>—</td>}
              <td className={totalCls}>—</td>
              <td className={totalCls} style={{ minWidth: 80, fontFamily: "'Noto Nastaliq Urdu', serif", fontSize: "10px" }}>میزان</td>
              <td className={totalCls}>{sumCol(rows, "total_area2")}</td>
              <td className={totalCls}>{sumCol(rows, "khalis_waari2_minute")}</td>
              <td className={totalCls}>{sumCol(rows, "khalis_waari2_ghante")}</td>
              <td className={totalCls}>—</td>
              <td className={totalCls}>—</td>
              <td className={totalCls}>—</td>
              <td className={totalCls} style={{ minWidth: 80, fontFamily: "'Noto Nastaliq Urdu', serif", fontSize: "10px" }}>میزان</td>
              <td className={totalCls}>—</td>
              <td className={totalCls}>{sumCol(rows, "total_area")}</td>
              <td className={totalCls}>{sumCol(rows, "ghair_mumkin")}</td>
              <td className={totalCls}>{sumCol(rows, "khalis_raqba")}</td>
              <td className={totalCls}>{sumCol(rows, "waari_minute")}</td>
              <td className={totalCls}>{sumCol(rows, "waari_ghante")}</td>
              <td className={totalCls}>{sumCol(rows, "zaidah_minute")}</td>
              <td className={totalCls}>{sumCol(rows, "zaidah_ghante")}</td>
              <td className={totalCls}>{sumCol(rows, "wazgi_minute")}</td>
              <td className={totalCls}>{sumCol(rows, "wazgi_ghante")}</td>
              <td className={totalCls}>{sumCol(rows, "khalis_waari_minute")}</td>
              <td className={totalCls}>{sumCol(rows, "khalis_waari_ghante")}</td>
              <td className={totalCls}>—</td>
              <td className={totalCls}>—</td>
              <td className={totalCls}>—</td>
              <td className={totalCls}>—</td>
              <td className={totalCls} style={{ width: 40 }}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* جناب عالیٰ Notes Section */}
      <div className="border-t border-slate-200 px-4 py-4 bg-white" dir="rtl">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            {/* جناب عالیٰ label above notes */}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-base font-bold text-slate-800" style={{ fontFamily: "'Noto Nastaliq Urdu', serif", lineHeight: 2 }}>
                جناب عالیٰ
              </span>
              <Button size="sm" onClick={addNote} className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1 px-2">
                <Plus className="w-3 h-3" /> نوٹ شامل کریں
              </Button>
            </div>
            <div className="space-y-1.5">
              {notes.map((note, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[10px] text-slate-600 mt-1.5 shrink-0" style={{ fontFamily: "serif" }}>{i + 1}-</span>
                  <textarea value={note} onChange={e => updateNote(i, e.target.value)} rows={2} dir="rtl"
                    className="flex-1 border border-slate-200 rounded px-2 py-1 text-[10px] text-slate-800 bg-white focus:outline-none focus:border-blue-400 resize-none"
                    style={{ fontFamily: "'Noto Nastaliq Urdu', serif", lineHeight: 1.8 }} />
                  {notes.length > 1 && (
                    <button onClick={() => removeNote(i)} className="text-slate-300 hover:text-red-500 mt-1.5 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showPrint && (
        <PrintModal {...printData} onClose={() => setShowPrint(false)} />
      )}
    </div>
  );
}

function fracHtml(val) {
  if (!val) return "-";
  const parts = val.split("/");
  if (parts.length >= 2) {
    return `<span class="frac"><span class="num">${parts[0]}</span><span>${parts.slice(1).join("/")}</span></span>`;
  }
  return val;
}

function PrintModal({ docType, headerLine, rows, notes, printRowSr, printColSr, onClose }) {
  const thP = { border: "1.5px solid #333", padding: "3px 4px", textAlign: "center", backgroundColor: "#dbeafe", fontSize: "8px", fontWeight: "bold", fontFamily: "'Noto Nastaliq Urdu', serif", color: "#1e3a5f" };
  const tdP = { border: "1.5px solid #555", padding: "2px 3px", textAlign: "center", fontSize: "8px", fontFamily: "'Noto Nastaliq Urdu', serif" };
  const tdTotal = { border: "1.5px solid #333", padding: "2px 3px", textAlign: "center", fontSize: "8px", fontWeight: "bold", backgroundColor: "#fef9e7", fontFamily: "'Noto Nastaliq Urdu', serif" };

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=1300,height=900");
    const content = document.getElementById("parat-print-content").innerHTML;
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><title>${docType}</title>
      <style>${PRINT_CSS}</style>
    </head><body>${content}</body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 800);
  };

  const thStyle = `border:1.5px solid #1e3a5f;padding:3px 4px;text-align:center;background:#dbeafe;font-size:8px;font-weight:bold;font-family:'Noto Nastaliq Urdu',serif;color:#1e3a5f;`;
  const tdStyle = `border:1.5px solid #555;padding:2px 3px;text-align:center;font-size:8px;font-family:'Noto Nastaliq Urdu',serif;`;
  const tdTotalStyle = `border:1.5px solid #333;padding:2px 3px;text-align:center;font-size:8px;font-weight:bold;background:#fef9e7;font-family:'Noto Nastaliq Urdu',serif;`;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-auto py-6">
      <div className="bg-white rounded-xl shadow-2xl max-w-[1300px] w-full mx-4">
        <div className="flex items-center justify-between px-5 py-3 border-b bg-slate-50 rounded-t-xl">
          <h3 className="text-sm font-bold text-slate-800">Print Preview — {docType}</h3>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">🖨 Print / PDF</button>
            <button onClick={onClose} className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs rounded-lg hover:bg-slate-300">بند کریں</button>
          </div>
        </div>

        <div id="parat-print-content" className="p-6 overflow-x-auto" style={{ direction: "rtl", fontFamily: "'Noto Nastaliq Urdu', serif" }}>
          {/* Header */}
          <div style={{ textAlign: "center", fontSize: "14px", fontWeight: "bold", marginBottom: "10px", borderBottom: "2px solid #1e3a5f", paddingBottom: "6px", fontFamily: "'Noto Nastaliq Urdu', serif", color: "#1e3a5f" }}>
            {headerLine}
          </div>

          <table style={{ borderCollapse: "collapse", width: "100%", direction: "rtl" }}>
            <thead>
              {printColSr && (
                <tr style={{ backgroundColor: "#eff6ff" }}>
                  {printRowSr && <th style={{ ...thP, fontSize: "7px" }}>#</th>}
                  {COL_LETTERS.map((l, i) => <th key={i} style={{ ...thP, fontSize: "7px" }}>{l}</th>)}
                </tr>
              )}
              <tr style={{ backgroundColor: "#dbeafe" }}>
                {printRowSr && <th style={thP} rowSpan={2}>نمبرشمار</th>}
                <th style={thP} rowSpan={2}>کھاتہ نمبر</th>
                <th style={{ ...thP, minWidth: 70 }} rowSpan={2}>نام مالک معہ والدیت</th>
                <th style={thP} rowSpan={2}>کل رقبہ</th>
                <th style={thP} colSpan={2}>خالص واری</th>
                <th style={thP} colSpan={2}>نکہ جات</th>
                <th style={thP} rowSpan={2}>کھاتہ نمبر</th>
                <th style={{ ...thP, minWidth: 80 }} rowSpan={2}>نام مالک معہ والدیت</th>
                <th style={{ ...thP, minWidth: 80 }} rowSpan={2}>نمبران بندوبست</th>
                <th style={thP} rowSpan={2}>کل رقبہ</th>
                <th style={thP} rowSpan={2}>غیر ممکن رقبہ</th>
                <th style={thP} rowSpan={2}>خالص رقبہ</th>
                <th style={thP} colSpan={2}>واری بحساب رقبہ</th>
                <th style={thP} colSpan={2}>زائدہ وصولی</th>
                <th style={thP} colSpan={2}>وضگی</th>
                <th style={thP} colSpan={2}>خالص واری</th>
                <th style={thP} colSpan={2}>نکہ جات</th>
                <th style={thP} rowSpan={2}>تشریح اوقات دن</th>
                <th style={thP} rowSpan={2}>تشریح اوقات رات</th>
              </tr>
              <tr style={{ backgroundColor: "#eff6ff" }}>
                <th style={thP}>منٹ</th><th style={thP}>گھنٹے</th>
                <th style={thP}>لیگا</th><th style={thP}>دیگا</th>
                <th style={thP}>منٹ</th><th style={thP}>گھنٹے</th>
                <th style={thP}>منٹ</th><th style={thP}>گھنٹے</th>
                <th style={thP}>منٹ</th><th style={thP}>گھنٹے</th>
                <th style={thP}>منٹ</th><th style={thP}>گھنٹے</th>
                <th style={thP}>لیگا</th><th style={thP}>دیگا</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {printRowSr && <td style={tdP}>{i + 1}</td>}
                  <td style={tdP}>{d(row.khatoni2)}</td>
                  <td style={{ ...tdP, textAlign: "right" }}>{d(row.owner_name2)}</td>
                  <td style={tdP}>{d(row.total_area2)}</td>
                  <td style={tdP}>{d(row.khalis_waari2_minute)}</td>
                  <td style={tdP}>{d(row.khalis_waari2_ghante)}</td>
                  <td style={tdP} dangerouslySetInnerHTML={{ __html: row.nikha2_lega ? fracHtml(row.nikha2_lega) : "-" }} />
                  <td style={tdP} dangerouslySetInnerHTML={{ __html: row.nikha2_dega ? fracHtml(row.nikha2_dega) : "-" }} />
                  <td style={tdP}>{d(row.khatoni)}</td>
                  <td style={{ ...tdP, textAlign: "right" }}>{d(row.owner_name)}</td>
                  <td style={tdP} dangerouslySetInnerHTML={{ __html: row.bandubast ? fracHtml(row.bandubast) : "-" }} />
                  <td style={tdP}>{d(row.total_area)}</td>
                  <td style={tdP}>{d(row.ghair_mumkin)}</td>
                  <td style={tdP}>{d(row.khalis_raqba)}</td>
                  <td style={tdP}>{d(row.waari_minute)}</td>
                  <td style={tdP}>{d(row.waari_ghante)}</td>
                  <td style={tdP}>{d(row.zaidah_minute)}</td>
                  <td style={tdP}>{d(row.zaidah_ghante)}</td>
                  <td style={tdP}>{d(row.wazgi_minute)}</td>
                  <td style={tdP}>{d(row.wazgi_ghante)}</td>
                  <td style={tdP}>{d(row.khalis_waari_minute)}</td>
                  <td style={tdP}>{d(row.khalis_waari_ghante)}</td>
                  <td style={tdP} dangerouslySetInnerHTML={{ __html: row.nikha_lega ? fracHtml(row.nikha_lega) : "-" }} />
                  <td style={tdP} dangerouslySetInnerHTML={{ __html: row.nikha_dega ? fracHtml(row.nikha_dega) : "-" }} />
                  <td style={tdP}>{d(row.tashreeh_din)}</td>
                  <td style={tdP}>{d(row.tashreeh_raat)}</td>
                </tr>
              ))}
              {/* میزان */}
              <tr className="total-row">
                {printRowSr && <td style={tdTotal}>—</td>}
                <td style={tdTotal}>—</td>
                <td style={{ ...tdTotal, textAlign: "right" }}>میزان</td>
                <td style={tdTotal}>{sumCol(rows, "total_area2")}</td>
                <td style={tdTotal}>{sumCol(rows, "khalis_waari2_minute")}</td>
                <td style={tdTotal}>{sumCol(rows, "khalis_waari2_ghante")}</td>
                <td style={tdTotal}>—</td><td style={tdTotal}>—</td>
                <td style={tdTotal}>—</td>
                <td style={{ ...tdTotal, textAlign: "right" }}>میزان</td>
                <td style={tdTotal}>—</td>
                <td style={tdTotal}>{sumCol(rows, "total_area")}</td>
                <td style={tdTotal}>{sumCol(rows, "ghair_mumkin")}</td>
                <td style={tdTotal}>{sumCol(rows, "khalis_raqba")}</td>
                <td style={tdTotal}>{sumCol(rows, "waari_minute")}</td>
                <td style={tdTotal}>{sumCol(rows, "waari_ghante")}</td>
                <td style={tdTotal}>{sumCol(rows, "zaidah_minute")}</td>
                <td style={tdTotal}>{sumCol(rows, "zaidah_ghante")}</td>
                <td style={tdTotal}>{sumCol(rows, "wazgi_minute")}</td>
                <td style={tdTotal}>{sumCol(rows, "wazgi_ghante")}</td>
                <td style={tdTotal}>{sumCol(rows, "khalis_waari_minute")}</td>
                <td style={tdTotal}>{sumCol(rows, "khalis_waari_ghante")}</td>
                <td style={tdTotal}>—</td><td style={tdTotal}>—</td>
                <td style={tdTotal}>—</td><td style={tdTotal}>—</td>
              </tr>
            </tbody>
          </table>

          {/* جناب عالیٰ + Notes */}
          <div style={{ marginTop: "20px", direction: "rtl" }}>
            <div style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Noto Nastaliq Urdu', serif", marginBottom: "8px", textAlign: "right" }}>
              جناب عالیٰ
            </div>
            <div style={{ fontSize: "10px", lineHeight: 2.2, fontFamily: "'Noto Nastaliq Urdu', serif" }}>
              {notes.filter(n => n.trim()).map((note, i) => (
                <div key={i} style={{ marginBottom: "2px" }}>{i + 1}- {note}</div>
              ))}
            </div>
          </div>

          {/* Signatures */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "28px", fontSize: "11px", fontFamily: "'Noto Nastaliq Urdu', serif" }}>
            <div style={{ textAlign: "center", borderTop: "1px solid #333", paddingTop: "4px", minWidth: "140px" }}>دستخط نہری پٹواری</div>
            <div style={{ textAlign: "center", borderTop: "1px solid #333", paddingTop: "4px", minWidth: "140px" }}>دستخط ضلعدار</div>
            <div style={{ textAlign: "center", borderTop: "1px solid #333", paddingTop: "4px", minWidth: "200px" }}>دستخط سب ڈویژنل کینال آفیسر</div>
          </div>
        </div>
      </div>
    </div>
  );
}