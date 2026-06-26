import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Printer, Clock } from "lucide-react";

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

// Convert total minutes to hours+minutes string
function minsToStr(totalMins) {
  const m = Math.round(totalMins);
  const h = Math.floor(m / 60);
  const mn = m % 60;
  return { h: String(h), m: String(mn) };
}

// Calc خالص واری = واری + زائدہ − وضگی (in total minutes)
function calcKhalisWaari(row) {
  const waariMin = (parseFloat(row.waari_ghante) || 0) * 60 + (parseFloat(row.waari_minute) || 0);
  const zaidahMin = (parseFloat(row.zaidah_ghante) || 0) * 60 + (parseFloat(row.zaidah_minute) || 0);
  const wazgiMin = (parseFloat(row.wazgi_ghante) || 0) * 60 + (parseFloat(row.wazgi_minute) || 0);
  const total = waariMin + zaidahMin - wazgiMin;
  if (waariMin === 0 && zaidahMin === 0) return { khalis_waari_minute: "", khalis_waari_ghante: "" };
  const { h, m } = minsToStr(Math.max(0, total));
  return { khalis_waari_minute: m, khalis_waari_ghante: h };
}

function calcKhalis(total, ghair) {
  const t = parseFloat(total) || 0;
  const g = parseFloat(ghair) || 0;
  if (t === 0) return "";
  const result = t - g;
  return result % 1 === 0 ? String(result) : result.toFixed(2);
}

const COL_LETTERS = ["ا","ب","ج","د","ہ","و","ز","ح","ط","ی","ک","ل","م","ن","س","ع","ف","ص","ق","ر","ش","ت","ث","خ"];

const PRINT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
  @page { size: A4 landscape; margin: 8mm; }
  body { font-family: 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif; margin:0; padding:10px; direction:rtl; color:#000; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1.5px solid #333; padding: 2px 3px; text-align: center; font-size: 7.5px; font-family: 'Noto Nastaliq Urdu', serif; }
  th { background: #dbeafe; font-weight: bold; color: #1e3a5f; }
  .total-row td { background: #fef9e7; font-weight: bold; }
  .frac { display: inline-flex; flex-direction: column; align-items: center; line-height: 1.1; font-size: 7px; }
  .frac .num { border-bottom: 1px solid #000; padding-bottom: 1px; }
  .tashreeh-table th { font-size: 7px; padding: 2px; }
  .tashreeh-table td { font-size: 7px; padding: 2px; }
`;

function fracHtml(val) {
  if (!val) return "-";
  const parts = val.split("/");
  if (parts.length >= 2) {
    return `<span class="frac"><span class="num">${parts[0]}</span><span>${parts.slice(1).join("/")}</span></span>`;
  }
  return val;
}

// Parse time string like "6:00" → total minutes from midnight
function parseTime(str) {
  if (!str) return null;
  const m = str.trim().match(/(\d+):(\d+)/);
  if (!m) return null;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
}

// Format minutes-from-midnight back to "H:MM"
function formatTime(totalMins) {
  const h = Math.floor(((totalMins % 1440) + 1440) % 1440 / 60);
  const m = ((totalMins % 1440) + 1440) % 1440 % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

// Build tashreeh schedule from rows' خالص واری and a start time
function buildTashreehSchedule(rows, startTimeStr) {
  const startMins = parseTime(startTimeStr);
  if (startMins === null) return [];
  
  const URDU_DAYS = ["اتوار","سوموار","منگل","بدھ","جمعرات","جمعہ","ہفتہ"];
  const URDU_TIMES = [
    { from: 0, to: 360, label: "الصبح" },
    { from: 360, to: 720, label: "صبح" },
    { from: 720, to: 1260, label: "دوپہر" },
    { from: 1260, to: 1560, label: "شام" },
    { from: 1560, to: 1440, label: "رات" },
  ];
  
  function timeLabel(mins) {
    const mOfDay = ((mins % 1440) + 1440) % 1440;
    let period = "رات";
    if (mOfDay < 360) period = "الصبح";
    else if (mOfDay < 720) period = "صبح";
    else if (mOfDay < 1260) period = "دوپہر";
    else if (mOfDay < 1560) period = "شام";
    const dayIdx = Math.floor(((mins % (7 * 1440)) + 7 * 1440) % (7 * 1440) / 1440);
    return `${URDU_DAYS[dayIdx % 7]} ${period} ${formatTime(mOfDay)}`;
  }

  const schedule = [];
  let cursor = startMins;

  rows.forEach((row, i) => {
    const hh = parseFloat(row.khalis_waari_ghante) || 0;
    const mm = parseFloat(row.khalis_waari_minute) || 0;
    const dur = hh * 60 + mm;
    if (dur === 0) return;
    const from = cursor;
    const to = cursor + dur;
    schedule.push({
      sr: i + 1,
      name: row.owner_name || row.owner_name2 || `حصہ دار ${i + 1}`,
      khatoni: row.khatoni || row.khatoni2 || "",
      from: timeLabel(from),
      to: timeLabel(to),
      dur: `${String(Math.floor(dur / 60))} گھ ${String(dur % 60)} منٹ`,
    });
    cursor = to;
  });

  return schedule;
}

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
  // Automation toggle
  const [autoOn, setAutoOn] = useState(true);
  // Acre-to-time rate
  const [acreMinutes, setAcreMinutes] = useState("6");
  // Tashreeh start time
  const [tashreehStart, setTashreehStart] = useState("6:00");
  const [showTashreeh, setShowTashreeh] = useState(false);

  const updateHeader = (key, val) => setHeader(prev => ({ ...prev, [key]: val }));

  const updateRow = (i, key, val) => {
    setRows(prev => {
      let next = prev.map((r, idx) => idx === i ? { ...r, [key]: val } : r);

      if (!autoOn) return next; // automation off — just store raw value

      let row = { ...next[i] };

      // === MIRROR RULES ===
      if (key === "khatoni2") row.khatoni = val;
      if (key === "khatoni") row.khatoni2 = val;
      if (key === "owner_name2") row.owner_name = val;
      if (key === "owner_name") row.owner_name2 = val;

      // کل رقبہ mirror and خالص رقبہ calc
      if (key === "total_area2") {
        row.total_area = val;
        row.khalis_raqba = calcKhalis(val, row.ghair_mumkin);
      }
      if (key === "total_area") {
        row.total_area2 = val;
        row.khalis_raqba = calcKhalis(val, row.ghair_mumkin);
      }
      if (key === "ghair_mumkin") row.khalis_raqba = calcKhalis(row.total_area, val);

      // خالص واری calc from واری + زائدہ − وضگی
      const needsKhalisRecalc = ["waari_minute","waari_ghante","zaidah_minute","zaidah_ghante","wazgi_minute","wazgi_ghante"].includes(key);
      if (needsKhalisRecalc) {
        const kw = calcKhalisWaari(row);
        row.khalis_waari_minute = kw.khalis_waari_minute;
        row.khalis_waari_ghante = kw.khalis_waari_ghante;
        // mirror to summary side
        row.khalis_waari2_minute = kw.khalis_waari_minute;
        row.khalis_waari2_ghante = kw.khalis_waari_ghante;
      }

      // خالص واری mirror (summary ↔ main)
      if (key === "khalis_waari2_minute") { row.khalis_waari_minute = val; }
      if (key === "khalis_waari_minute") { row.khalis_waari2_minute = val; }
      if (key === "khalis_waari2_ghante") { row.khalis_waari_ghante = val; }
      if (key === "khalis_waari_ghante") { row.khalis_waari2_ghante = val; }

      // نکہ جات mirror (summary ↔ main)
      if (key === "nikha2_lega") row.nikha_lega = val;
      if (key === "nikha_lega") row.nikha2_lega = val;
      if (key === "nikha2_dega") row.nikha_dega = val;
      if (key === "nikha_dega") row.nikha2_dega = val;

      next[i] = row;

      // === نکہ جات ALTERNATING PATTERN ===
      // When lega is set in row i (main side), carry its value as lega of next row
      if ((key === "nikha_lega" || key === "nikha2_lega") && i + 1 < next.length) {
        // next row's lega = current row's dega (cascade: each next row's lega = prev's dega, not lega)
        // Rule: row i dega → row i+1 lega
        if (next[i].nikha_dega) {
          next[i + 1] = { ...next[i + 1], nikha_lega: next[i].nikha_dega, nikha2_lega: next[i].nikha_dega };
        }
      }
      if ((key === "nikha_dega" || key === "nikha2_dega") && i + 1 < next.length) {
        next[i + 1] = { ...next[i + 1], nikha_lega: val, nikha2_lega: val };
      }

      return next;
    });
  };

  // واری بحساب رقبہ auto-calc from خالص رقبہ × rate
  const calcWaariFromAcre = () => {
    const rate = parseFloat(acreMinutes) || 6;
    setRows(prev => prev.map(row => {
      const acres = parseFloat(row.khalis_raqba) || 0;
      if (acres === 0) return row;
      const totalMins = acres * rate;
      const { h, m } = minsToStr(totalMins);
      const updated = { ...row, waari_minute: m, waari_ghante: h };
      if (autoOn) {
        const kw = calcKhalisWaari(updated);
        updated.khalis_waari_minute = kw.khalis_waari_minute;
        updated.khalis_waari_ghante = kw.khalis_waari_ghante;
        updated.khalis_waari2_minute = kw.khalis_waari_minute;
        updated.khalis_waari2_ghante = kw.khalis_waari_ghante;
      }
      return updated;
    }));
  };

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
  const headerParts = [docType, `موگہ نمبری ${moghaFull}`];
  if (header.rajbaha) headerParts.push(`راجباہ ${header.rajbaha}`);
  if (header.mouza) headerParts.push(`موضع ${header.mouza}`);
  if (header.section) headerParts.push(`سیکشن ${header.section}`);
  if (header.sub_division) headerParts.push(`سب ڈویژن ${header.sub_division}`);
  if (header.canal_division) headerParts.push(`کینال ڈویژن ${header.canal_division}`);
  const headerLine = headerParts.join(" ، ");

  const inp = "w-full bg-transparent outline-none text-[10px] text-slate-800 text-center px-0.5 py-0.5 placeholder:text-slate-300";
  const thCls = "border border-slate-500 text-center bg-blue-100 px-0.5 py-0.5 text-[9px] font-bold leading-tight text-blue-900";
  const tdCls = "border border-slate-300 text-center px-0 py-0 text-[10px]";
  const totalCls = "border border-slate-400 text-center px-0.5 py-1 text-[10px] font-bold bg-amber-50";

  const tashreehSchedule = buildTashreehSchedule(rows, tashreehStart);

  const printData = { docType, headerLine, rows, notes, printRowSr, printColSr, tashreehSchedule, tashreehStart };

  // Row action controls (left side)
  const RowActions = ({ i }) => (
    <div className="flex flex-col items-center gap-0.5 shrink-0">
      <button onClick={() => insertRowAfter(i - 1)}
        className="w-5 h-5 flex items-center justify-center text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded text-[8px]" title="اوپر قطار شامل کریں">
        <Plus className="w-3 h-3" />
      </button>
      <button onClick={() => removeRow(i)}
        className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded" title="حذف کریں">
        <Trash2 className="w-3 h-3" />
      </button>
      <button onClick={() => insertRowAfter(i)}
        className="w-5 h-5 flex items-center justify-center text-blue-300 hover:text-blue-500 hover:bg-blue-50 rounded text-[8px]" title="نیچے قطار شامل کریں">
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Screen Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
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

        {/* Automation toggle */}
        <div className="flex items-center gap-3 mb-3 p-2 bg-blue-50 rounded border border-blue-200">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={autoOn} onChange={e => setAutoOn(e.target.checked)} className="w-4 h-4 accent-blue-600" />
            <span className="text-xs font-semibold text-blue-800">آٹو میرر اور فارمولہ</span>
          </label>
          <span className="text-[10px] text-blue-600">
            {autoOn ? "✓ فعال — ڈیٹا خود بخود کاپی اور حساب ہوگا" : "✗ غیر فعال — ڈیٹا محفوظ ہے، خود درج کریں"}
          </span>
        </div>

        {/* Acre-to-time rate box (not printed) */}
        <div className="flex items-center gap-3 mb-3 p-2 bg-amber-50 rounded border border-amber-200">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-xs font-semibold text-amber-800" style={{ fontFamily: "serif" }}>ایکڑ → وقت کا فارمولہ</span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-amber-700">1 ایکڑ =</span>
            <input type="number" value={acreMinutes} onChange={e => setAcreMinutes(e.target.value)} min="1"
              className="w-16 border border-amber-300 rounded px-1 py-0.5 text-xs text-center bg-white focus:outline-none focus:border-amber-500" />
            <span className="text-xs text-amber-700">منٹ</span>
          </div>
          <Button size="sm" onClick={calcWaariFromAcre} className="h-6 text-[10px] bg-amber-500 hover:bg-amber-600 text-white px-2">
            واری حساب کریں
          </Button>
          <div className="flex items-center gap-1 mr-3">
            <span className="text-xs text-amber-700">تشریح آغاز وقت:</span>
            <input type="text" value={tashreehStart} onChange={e => setTashreehStart(e.target.value)} placeholder="6:00"
              className="w-16 border border-amber-300 rounded px-1 py-0.5 text-xs text-center bg-white focus:outline-none focus:border-amber-500" />
          </div>
          <button onClick={() => setShowTashreeh(v => !v)} className="text-xs text-blue-600 underline">
            {showTashreeh ? "وقت ٹیبل چھپائیں" : "وقت ٹیبل دیکھیں"}
          </button>
        </div>

        {/* Tashreeh schedule preview */}
        {showTashreeh && tashreehSchedule.length > 0 && (
          <div className="mb-3 p-2 bg-white border border-slate-200 rounded overflow-x-auto" dir="rtl">
            <p className="text-[10px] font-semibold text-slate-600 mb-1" style={{ fontFamily: "serif" }}>تشریح اوقات جدول</p>
            <table style={{ borderCollapse: "collapse", fontSize: "9px", fontFamily: "'Noto Nastaliq Urdu', serif", width: "100%" }}>
              <thead>
                <tr style={{ backgroundColor: "#dbeafe" }}>
                  <th style={{ border: "1px solid #ccc", padding: "2px 4px" }}>نمبر</th>
                  <th style={{ border: "1px solid #ccc", padding: "2px 4px" }}>کھاتہ</th>
                  <th style={{ border: "1px solid #ccc", padding: "2px 4px" }}>نام</th>
                  <th style={{ border: "1px solid #ccc", padding: "2px 8px" }}>سے</th>
                  <th style={{ border: "1px solid #ccc", padding: "2px 8px" }}>تک</th>
                  <th style={{ border: "1px solid #ccc", padding: "2px 4px" }}>مدت</th>
                </tr>
              </thead>
              <tbody>
                {tashreehSchedule.map((s, i) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#f8faff" : "#fff" }}>
                    <td style={{ border: "1px solid #ccc", padding: "2px 4px", textAlign: "center" }}>{s.sr}</td>
                    <td style={{ border: "1px solid #ccc", padding: "2px 4px", textAlign: "center" }}>{s.khatoni}</td>
                    <td style={{ border: "1px solid #ccc", padding: "2px 6px" }}>{s.name}</td>
                    <td style={{ border: "1px solid #ccc", padding: "2px 6px" }}>{s.from}</td>
                    <td style={{ border: "1px solid #ccc", padding: "2px 6px" }}>{s.to}</td>
                    <td style={{ border: "1px solid #ccc", padding: "2px 4px", textAlign: "center" }}>{s.dur}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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

      {/* Table + left action column */}
      <div className="flex">
        {/* Left action buttons column */}
        <div className="shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col pt-[52px]">
          {rows.map((_, i) => (
            <div key={i} className="flex flex-col items-center justify-center py-1 border-b border-slate-100 gap-0.5" style={{ minHeight: "34px" }}>
              <RowActions i={i} />
            </div>
          ))}
          {/* spacer for میزان row */}
          <div style={{ minHeight: "30px" }} />
        </div>

        {/* Scrollable table */}
        <div className="overflow-x-auto flex-1">
          <table style={{ borderCollapse: "collapse", minWidth: "1700px", width: "100%", direction: "rtl" }}>
            <thead>
              {showColSr && (
                <tr style={{ backgroundColor: "#f0f4ff" }}>
                  {showRowSr && <th className={thCls} style={{ fontSize: "8px", width: 28 }}>#</th>}
                  {COL_LETTERS.map((l, i) => (
                    <th key={i} className={thCls} style={{ fontSize: "8px" }}>{l}</th>
                  ))}
                  <th className={thCls} style={{ width: 28 }}></th>
                </tr>
              )}
              <tr style={{ backgroundColor: "#dbeafe" }}>
                {showRowSr && <th className={thCls} rowSpan={2} style={{ width: 28 }}>نمبرشمار</th>}
                <th className={thCls} rowSpan={2}>کھاتہ نمبر</th>
                <th className={thCls} rowSpan={2} style={{ minWidth: 80 }}>نام مالک معہ والدیت</th>
                {/* کل رقبہ with ایکڑ sub-label */}
                <th className={thCls} rowSpan={2}>
                  <div>کل رقبہ</div>
                  <div style={{ fontSize: "8px", fontWeight: "normal", color: "#555", borderTop: "1px solid #aaa", marginTop: "2px", paddingTop: "2px" }}>ایکڑ</div>
                </th>
                <th className={thCls} colSpan={2}>خالص واری</th>
                <th className={thCls} colSpan={2}>نکہ جات</th>
                <th className={thCls} rowSpan={2}>کھاتہ نمبر</th>
                <th className={thCls} rowSpan={2} style={{ minWidth: 80 }}>نام مالک معہ والدیت</th>
                <th className={thCls} rowSpan={2} style={{ minWidth: 90 }}>نمبران بندوبست</th>
                <th className={thCls} rowSpan={2}>
                  <div>کل رقبہ</div>
                  <div style={{ fontSize: "8px", fontWeight: "normal", color: "#555", borderTop: "1px solid #aaa", marginTop: "2px", paddingTop: "2px" }}>ایکڑ</div>
                </th>
                <th className={thCls} rowSpan={2}>غیر ممکن رقبہ</th>
                <th className={thCls} rowSpan={2}>خالص رقبہ</th>
                <th className={thCls} colSpan={2}>واری بحساب رقبہ</th>
                <th className={thCls} colSpan={2}>زائدہ وصولی</th>
                <th className={thCls} colSpan={2}>وضگی</th>
                <th className={thCls} colSpan={2}>خالص واری</th>
                <th className={thCls} colSpan={2}>نکہ جات</th>
                <th className={thCls} rowSpan={2}>تشریح اوقات دن</th>
                <th className={thCls} rowSpan={2}>تشریح اوقات رات</th>
                <th className={thCls} rowSpan={2} style={{ width: 28 }}></th>
              </tr>
              <tr style={{ backgroundColor: "#eff6ff" }}>
                <th className={thCls}>منٹ</th><th className={thCls}>گھنٹے</th>
                <th className={thCls}>لیگا</th><th className={thCls}>دیگا</th>
                <th className={thCls}>منٹ</th><th className={thCls}>گھنٹے</th>
                <th className={thCls}>منٹ</th><th className={thCls}>گھنٹے</th>
                <th className={thCls}>منٹ</th><th className={thCls}>گھنٹے</th>
                <th className={thCls}>منٹ</th><th className={thCls}>گھنٹے</th>
                <th className={thCls}>لیگا</th><th className={thCls}>دیگا</th>
                <th className={thCls} style={{ width: 28 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-blue-50/30">
                  {showRowSr && <td className={tdCls} style={{ fontSize: "9px", color: "#1d4ed8", minWidth: 28, textAlign: "center", fontWeight: "bold" }}>{i + 1}</td>}
                  <td className={tdCls}><input value={row.khatoni2} onChange={e => updateRow(i, "khatoni2", e.target.value)} className={inp} /></td>
                  <td className={tdCls} style={{ minWidth: 80 }}><input value={row.owner_name2} onChange={e => updateRow(i, "owner_name2", e.target.value)} className={inp} dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }} /></td>
                  <td className={tdCls}><input value={row.total_area2} onChange={e => updateRow(i, "total_area2", e.target.value)} className={inp} /></td>
                  <td className={tdCls}><input value={row.khalis_waari2_minute} onChange={e => updateRow(i, "khalis_waari2_minute", e.target.value)} className={inp} style={{ color: "#1d4ed8" }} /></td>
                  <td className={tdCls}><input value={row.khalis_waari2_ghante} onChange={e => updateRow(i, "khalis_waari2_ghante", e.target.value)} className={inp} style={{ color: "#1d4ed8" }} /></td>
                  <td className={tdCls}><input value={row.nikha2_lega} onChange={e => updateRow(i, "nikha2_lega", e.target.value)} className={inp} style={{ fontFamily: "serif" }} /></td>
                  <td className={tdCls}><input value={row.nikha2_dega} onChange={e => updateRow(i, "nikha2_dega", e.target.value)} className={inp} style={{ fontFamily: "serif" }} /></td>
                  <td className={tdCls}><input value={row.khatoni} onChange={e => updateRow(i, "khatoni", e.target.value)} className={inp} /></td>
                  <td className={tdCls} style={{ minWidth: 80 }}><input value={row.owner_name} onChange={e => updateRow(i, "owner_name", e.target.value)} className={inp} dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }} /></td>
                  <td className={tdCls} style={{ minWidth: 90 }}><input value={row.bandubast} onChange={e => updateRow(i, "bandubast", e.target.value)} className={inp} placeholder="87/(3-4)" dir="ltr" style={{ fontFamily: "serif" }} /></td>
                  <td className={tdCls}><input value={row.total_area} onChange={e => updateRow(i, "total_area", e.target.value)} className={inp} /></td>
                  <td className={tdCls}><input value={row.ghair_mumkin} onChange={e => updateRow(i, "ghair_mumkin", e.target.value)} className={inp} /></td>
                  <td className={tdCls} style={{ backgroundColor: "#f0fdf4" }}><input value={row.khalis_raqba} onChange={e => updateRow(i, "khalis_raqba", e.target.value)} className={inp} style={{ color: "#166534" }} /></td>
                  <td className={tdCls}><input value={row.waari_minute} onChange={e => updateRow(i, "waari_minute", e.target.value)} className={inp} /></td>
                  <td className={tdCls}><input value={row.waari_ghante} onChange={e => updateRow(i, "waari_ghante", e.target.value)} className={inp} /></td>
                  <td className={tdCls}><input value={row.zaidah_minute} onChange={e => updateRow(i, "zaidah_minute", e.target.value)} className={inp} /></td>
                  <td className={tdCls}><input value={row.zaidah_ghante} onChange={e => updateRow(i, "zaidah_ghante", e.target.value)} className={inp} /></td>
                  <td className={tdCls}><input value={row.wazgi_minute} onChange={e => updateRow(i, "wazgi_minute", e.target.value)} className={inp} /></td>
                  <td className={tdCls}><input value={row.wazgi_ghante} onChange={e => updateRow(i, "wazgi_ghante", e.target.value)} className={inp} /></td>
                  {/* خالص واری — auto-calculated, shown in green */}
                  <td className={tdCls} style={{ backgroundColor: "#eff6ff" }}><input value={row.khalis_waari_minute} onChange={e => updateRow(i, "khalis_waari_minute", e.target.value)} className={inp} style={{ color: "#1d4ed8" }} /></td>
                  <td className={tdCls} style={{ backgroundColor: "#eff6ff" }}><input value={row.khalis_waari_ghante} onChange={e => updateRow(i, "khalis_waari_ghante", e.target.value)} className={inp} style={{ color: "#1d4ed8" }} /></td>
                  <td className={tdCls}><input value={row.nikha_lega} onChange={e => updateRow(i, "nikha_lega", e.target.value)} className={inp} style={{ fontFamily: "serif" }} /></td>
                  <td className={tdCls}><input value={row.nikha_dega} onChange={e => updateRow(i, "nikha_dega", e.target.value)} className={inp} style={{ fontFamily: "serif" }} /></td>
                  <td className={tdCls} style={{ minWidth: 80 }}><input value={row.tashreeh_din} onChange={e => updateRow(i, "tashreeh_din", e.target.value)} className={inp} /></td>
                  <td className={tdCls} style={{ minWidth: 80 }}><input value={row.tashreeh_raat} onChange={e => updateRow(i, "tashreeh_raat", e.target.value)} className={inp} /></td>
                  <td className={tdCls} style={{ width: 28 }}>
                    <button onClick={() => removeRow(i)} className="text-slate-300 hover:text-red-500 p-0.5">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
              {/* میزان row */}
              <tr style={{ backgroundColor: "#fef9e7" }}>
                {showRowSr && <td className={totalCls}>—</td>}
                <td className={totalCls}>—</td>
                <td className={totalCls} style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>میزان</td>
                <td className={totalCls}>{sumCol(rows, "total_area2")}</td>
                <td className={totalCls}>{sumCol(rows, "khalis_waari2_minute")}</td>
                <td className={totalCls}>{sumCol(rows, "khalis_waari2_ghante")}</td>
                <td className={totalCls}>—</td><td className={totalCls}>—</td>
                <td className={totalCls}>—</td>
                <td className={totalCls} style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>میزان</td>
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
                <td className={totalCls}>—</td><td className={totalCls}>—</td>
                <td className={totalCls}>—</td><td className={totalCls}>—</td>
                <td className={totalCls} style={{ width: 28 }}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* جناب عالیٰ Notes Section */}
      <div className="border-t border-slate-200 px-4 py-4 bg-white" dir="rtl">
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

      {showPrint && <PrintModal {...printData} onClose={() => setShowPrint(false)} />}
    </div>
  );
}

function PrintModal({ docType, headerLine, rows, notes, printRowSr, printColSr, tashreehSchedule, onClose }) {
  const thP = { border: "1.5px solid #1e3a5f", padding: "3px 4px", textAlign: "center", backgroundColor: "#dbeafe", fontSize: "8px", fontWeight: "bold", fontFamily: "'Noto Nastaliq Urdu', serif", color: "#1e3a5f" };
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

  const kulRaqbaHeader = (
    <>
      <div>کل رقبہ</div>
      <div style={{ fontSize: "7px", fontWeight: "normal", borderTop: "1px solid #aaa", marginTop: "1px", paddingTop: "1px" }}>ایکڑ</div>
    </>
  );

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
                <th style={thP} rowSpan={2}>{kulRaqbaHeader}</th>
                <th style={thP} colSpan={2}>خالص واری</th>
                <th style={thP} colSpan={2}>نکہ جات</th>
                <th style={thP} rowSpan={2}>کھاتہ نمبر</th>
                <th style={{ ...thP, minWidth: 80 }} rowSpan={2}>نام مالک معہ والدیت</th>
                <th style={{ ...thP, minWidth: 80 }} rowSpan={2}>نمبران بندوبست</th>
                <th style={thP} rowSpan={2}>{kulRaqbaHeader}</th>
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

          {/* Tashreeh Schedule Table in print */}
          {tashreehSchedule.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: "bold", marginBottom: "6px", fontFamily: "'Noto Nastaliq Urdu', serif", color: "#1e3a5f" }}>
                تشریح اوقات جدول
              </div>
              <table className="tashreeh-table" style={{ borderCollapse: "collapse", width: "100%", direction: "rtl", fontFamily: "'Noto Nastaliq Urdu', serif" }}>
                <thead>
                  <tr style={{ backgroundColor: "#dbeafe" }}>
                    <th style={{ border: "1px solid #333", padding: "2px 4px", fontSize: "7px", color: "#1e3a5f" }}>نمبر</th>
                    <th style={{ border: "1px solid #333", padding: "2px 4px", fontSize: "7px", color: "#1e3a5f" }}>کھاتہ</th>
                    <th style={{ border: "1px solid #333", padding: "2px 8px", fontSize: "7px", color: "#1e3a5f" }}>نام مالک</th>
                    <th style={{ border: "1px solid #333", padding: "2px 8px", fontSize: "7px", color: "#1e3a5f" }}>آغاز وقت</th>
                    <th style={{ border: "1px solid #333", padding: "2px 8px", fontSize: "7px", color: "#1e3a5f" }}>اختتام وقت</th>
                    <th style={{ border: "1px solid #333", padding: "2px 4px", fontSize: "7px", color: "#1e3a5f" }}>مدت</th>
                  </tr>
                </thead>
                <tbody>
                  {tashreehSchedule.map((s, i) => (
                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#f8faff" : "#fff" }}>
                      <td style={{ border: "1px solid #555", padding: "2px 4px", textAlign: "center", fontSize: "7px" }}>{s.sr}</td>
                      <td style={{ border: "1px solid #555", padding: "2px 4px", textAlign: "center", fontSize: "7px" }}>{s.khatoni}</td>
                      <td style={{ border: "1px solid #555", padding: "2px 6px", fontSize: "7px" }}>{s.name}</td>
                      <td style={{ border: "1px solid #555", padding: "2px 6px", fontSize: "7px" }}>{s.from}</td>
                      <td style={{ border: "1px solid #555", padding: "2px 6px", fontSize: "7px" }}>{s.to}</td>
                      <td style={{ border: "1px solid #555", padding: "2px 4px", textAlign: "center", fontSize: "7px" }}>{s.dur}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* جناب عالیٰ + Notes */}
          <div style={{ marginTop: "20px", direction: "rtl" }}>
            <div style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "'Noto Nastaliq Urdu', serif", marginBottom: "8px" }}>جناب عالیٰ</div>
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