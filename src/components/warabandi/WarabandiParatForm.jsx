import React, { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Printer, Languages, ScanLine, Loader2, ClipboardPaste, LayoutGrid, Save } from "lucide-react";
import { toast } from "sonner";
import PdfUploadPreview from "./PdfUploadPreview";
import PasteDataDialog, { PASTE_COLUMNS } from "./PasteDataDialog";
import MogaSearchSelect from "./MogaSearchSelect";
import BandubastPicker from "./BandubastPicker";

// ====== Area format helpers ======
function formatAreaMB(totalAcres) {
  const num = parseFloat(totalAcres);
  if (isNaN(num) || num === 0) return "";
  const mb = Math.floor(num / 25);
  const remAfterMB = num - mb * 25;
  const acre = Math.floor(remAfterMB);
  const kanalFloat = (remAfterMB - acre) * 8;
  const kanal = Math.floor(kanalFloat);
  const marla = Math.round((kanalFloat - kanal) * 20);
  let parts = [];
  if (mb > 0) parts.push(`${mb} MB`);
  if (acre > 0) parts.push(`${acre} Ac`);
  if (kanal > 0) parts.push(`${kanal} Kn`);
  if (marla > 0) parts.push(`${marla} Ml`);
  return parts.join(" ");
}

function isEnglishOrDigit(val) {
  if (!val) return false;
  return /^[\x00-\x7F\d\s\.\-\/]+$/.test(val.trim());
}

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

// منٹ + گھنٹے کا مجموعہ — 60 منٹ = 1 گھنٹہ carry
function sumPair(rows, minKey, hrKey) {
  let total = 0;
  for (const r of rows) {
    total += (parseFloat(r[hrKey]) || 0) * 60 + (parseFloat(r[minKey]) || 0);
  }
  if (total === 0) return { m: "-", h: "-" };
  return { m: String(total % 60), h: String(Math.floor(total / 60)) };
}

function d(val) { return (val === "" || val === null || val === undefined) ? "-" : val; }

// Convert Eastern Arabic / Urdu digits (۱۲۳ ٠١٢) → Western (123) for numeric fields.
// Also strips stray thousands separators (، ,) that OCR sometimes keeps.
const EAST_DIGIT_MAP = { '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9','٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9' };
function normalizeDigits(val) {
  if (val === null || val === undefined || val === "") return val;
  return String(val)
    .replace(/[۰-۹٠-٩]/g, d => EAST_DIGIT_MAP[d] || d)
    .replace(/[،,](?=\d{3}\b)/g, ""); // remove thousands separators like 1,234
}

// Numeric fields that should always be normalized to Western digits
const NUMERIC_FIELDS = [
  "total_area","ghair_mumkin","khalis_raqba",
  "waari_minute","waari_ghante","zaidah_minute","zaidah_ghante",
  "wazgi_minute","wazgi_ghante","khalis_waari_minute","khalis_waari_ghante",
  "total_area2","khalis_waari2_minute","khalis_waari2_ghante",
];
function normalizeRowDigits(row) {
  const out = { ...row };
  for (const k of NUMERIC_FIELDS) {
    if (out[k] !== undefined && out[k] !== "") out[k] = normalizeDigits(out[k]);
  }
  return out;
}

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
  th { font-weight: bold; }
  .total-row td { font-weight: bold; }
  tr { page-break-inside: avoid; }
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

// ====== تشریح اوقات helpers ======
const URDU_DAYS = ["سوموار", "منگل", "بدھ", "جمعرات", "جمعہ", "ہفتہ", "اتوار"];
function periodFor(h) {
  if (h >= 5 && h < 12) return "صبح";
  if (h >= 12 && h < 17) return "دوپہر";
  if (h >= 17 && h < 20) return "شام";
  return "رات";
}
function fmtTashreeh(totalMin, startMinuteOfDay) {
  const weekMins = 7 * 24 * 60;
  const clipped = ((totalMin % weekMins) + weekMins) % weekMins;
  const dayIndex = Math.floor(clipped / (24 * 60));
  const minuteInDay = clipped % (24 * 60);
  const actualMinInDay = (minuteInDay + startMinuteOfDay) % (24 * 60);
  const h = Math.floor(actualMinInDay / 60);
  const m = actualMinInDay % 60;
  const hh = h % 12 === 0 ? 12 : h % 12;
  const mm = String(m).padStart(2, "0");
  return `${URDU_DAYS[dayIndex % 7]} ${periodFor(h)} ${hh}:${mm} بجے`;
}
function fmtTashreehRange(from, to, startMinuteOfDay) {
  return `${fmtTashreeh(from, startMinuteOfDay)} سے ${fmtTashreeh(to, startMinuteOfDay)} تک`;
}
// گھنٹے + منٹ + صبح/شام → minutes from midnight
function parseStart(hh, mm, meridian) {
  let h = parseInt(hh, 10);
  const m = parseInt(mm, 10);
  if (isNaN(h) || isNaN(m)) return null;
  if (h < 1 || h > 12) h = ((h % 12) + 12) % 12;
  if (meridian === "شام" && h < 12) h += 12;
  if (meridian === "صبح" && h === 12) h = 0;
  return h * 60 + m;
}

export default function WarabandiParatForm({ defaultDocType = "پرت وارہ بندی" }) {
  const [isUrduMode, setIsUrduMode] = useState(true);
  const [docType, setDocType] = useState(defaultDocType);
  const isJadeed = docType === "پرت وارہ بندی";
  const showSummary = !isJadeed;
  const [header, setHeader] = useState({
    mogha_number: "", mogha_side: "R", rajbaha: "",
    mouza: "", section: "", sub_division: "", canal_division: "",
    map_id: "",
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
  // واری حساب: 1 ایکڑ کا وقت = (7*24*60 − وضگی − زائد وصولی) ÷ CCA
  // زائد وصولی اور وضگی قطاروں سے خود بخود جمع ہو کر اوپرے خانوں میں آتے ہیں
  const [cca, setCca] = useState("");
  const ccaNum = parseFloat(cca) || 0;
  const zaidWasoliMins = useMemo(() => rows.reduce((s, r) => s + ((parseFloat(r.zaidah_ghante) || 0) * 60 + (parseFloat(r.zaidah_minute) || 0)), 0), [rows]);
  const wazgiMins = useMemo(() => rows.reduce((s, r) => s + ((parseFloat(r.wazgi_ghante) || 0) * 60 + (parseFloat(r.wazgi_minute) || 0)), 0), [rows]);
  const minutesPerAcre = ccaNum > 0 ? Math.max(0, (10080 - wazgiMins - zaidWasoliMins) / ccaNum) : 0;
  // تشریح اوقات: دن/رات شروع وقت (گھنٹے + منٹ + صبح/شام)
  const [tashreehDayHour, setTashreehDayHour] = useState("");
  const [tashreehDayMin, setTashreehDayMin] = useState("");
  const [tashreehDayMeridian, setTashreehDayMeridian] = useState("صبح");
  const [tashreehNightHour, setTashreehNightHour] = useState("");
  const [tashreehNightMin, setTashreehNightMin] = useState("");
  const [tashreehNightMeridian, setTashreehNightMeridian] = useState("شام");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [showPaste, setShowPaste] = useState(false);
  const [picker, setPicker] = useState(null); // { row, field }
  const [recordId, setRecordId] = useState(null);
  const [saving, setSaving] = useState(false);
  const pdfRef = useRef();
  const queryClient = useQueryClient();

  const updateHeader = (key, val) => setHeader(prev => ({ ...prev, [key]: val }));

  // موگہ منتخب کرنے پر راجبہ، موضع، سیکشن، سب ڈویژن، ڈویژن میپ سے خود بخود بھر دیں
  const handleMogaSelect = (map) => {
    if (!map) return;
    if (map._sideOnly) { updateHeader("mogha_side", map.mogha_side); return; }
    setHeader(prev => ({
      ...prev,
      mogha_number: String(map.moga_number || ""),
      mogha_side: map.mogha_side || prev.mogha_side,
      rajbaha: map.rajbah || "",
      mouza: map.village || "",
      section: map.section || "",
      sub_division: map.tehsil || "",
      canal_division: map.district || "",
      map_id: map.id || "",
    }));
  };

  // منتخب موگہ کا محفوظ شدہ پرت ڈیٹا خود بخود لوڈ کریں
  const { data: existingRecord } = useQuery({
    queryKey: ["parat-record", header.mogha_number],
    queryFn: () => base44.entities.ParatWarabandiRecord.filter({ mogha_number: header.mogha_number }).then((r) => r[0]),
    enabled: !!header.mogha_number,
  });

  useEffect(() => {
    if (!existingRecord) { setRecordId(null); return; }
    setRecordId(existingRecord.id);
    try {
      const data = JSON.parse(existingRecord.data_json || "{}");
      if (data.rows) setRows(data.rows.map(normalizeRowDigits));
      if (data.notes) setNotes(data.notes);
      if (data.docType !== undefined) setDocType(data.docType);
      if (data.cca !== undefined) setCca(data.cca);
      if (data.autoOn !== undefined) setAutoOn(data.autoOn);
      if (data.tashreehDayHour !== undefined) setTashreehDayHour(data.tashreehDayHour);
      if (data.tashreehDayMin !== undefined) setTashreehDayMin(data.tashreehDayMin);
      if (data.tashreehDayMeridian !== undefined) setTashreehDayMeridian(data.tashreehDayMeridian);
      if (data.tashreehNightHour !== undefined) setTashreehNightHour(data.tashreehNightHour);
      if (data.tashreehNightMin !== undefined) setTashreehNightMin(data.tashreehNightMin);
      if (data.tashreehNightMeridian !== undefined) setTashreehNightMeridian(data.tashreehNightMeridian);
      if (data.header) setHeader((prev) => ({ ...prev, ...data.header }));
    } catch {}
  }, [existingRecord?.id]);

  // مستقل محفوظ — پرت وارہ بندی ریکارڈ (موگہ وار)
  const handleSave = async () => {
    if (!header.mogha_number) { toast.error("پہلے موگہ منتخب کریں"); return; }
    setSaving(true);
    const data_json = JSON.stringify({
      header, rows, notes, docType, cca, autoOn,
      showRowSr, showColSr, printRowSr, printColSr, isUrduMode,
      tashreehDayHour, tashreehDayMin, tashreehDayMeridian, tashreehNightHour, tashreehNightMin, tashreehNightMeridian,
    });
    const payload = {
      mogha_number: header.mogha_number,
      mogha_side: header.mogha_side,
      mouza: header.mouza,
      doc_type: docType,
      data_json,
      status: "draft",
    };
    try {
      let rec;
      if (recordId) {
        rec = await base44.entities.ParatWarabandiRecord.update(recordId, payload);
      } else {
        const found = await base44.entities.ParatWarabandiRecord.filter({ mogha_number: header.mogha_number }).then((r) => r[0]);
        if (found) rec = await base44.entities.ParatWarabandiRecord.update(found.id, payload);
        else rec = await base44.entities.ParatWarabandiRecord.create(payload);
      }
      if (rec?.id) setRecordId(rec.id);
      queryClient.invalidateQueries({ queryKey: ["parat-record"] });
      toast.success("مستقل محفوظ ہو گیا");
    } catch (e) {
      toast.error("محفوظ نہیں ہوا");
    } finally {
      setSaving(false);
    }
  };

  // جب CCA / لیڈ / وضگی بدلیں تو تمام قطاروں کی خالص واری خود بخود دوبارہ حساب ہو
  useEffect(() => {
    if (!autoOn || ccaNum <= 0) return;
    setRows(prev => prev.map(row => {
      const acres = parseFloat(row.khalis_raqba) || 0;
      if (acres <= 0) return row;
      const { h, m } = minsToStr(acres * minutesPerAcre);
      return { ...row, khalis_waari_minute: m, khalis_waari_ghante: h, khalis_waari2_minute: m, khalis_waari2_ghante: h };
    }));
  }, [cca, zaidWasoliMins, wazgiMins, autoOn, ccaNum, minutesPerAcre]);

  // تشریح اوقات: خالص واری کا وقت جمع کر کے دن/رات شیڈول خود بخود بنائیں
  const khalisSig = rows.map(r => `${r.khalis_waari_ghante}|${r.khalis_waari_minute}`).join(",");
  useEffect(() => {
    const dayStart = parseStart(tashreehDayHour, tashreehDayMin, tashreehDayMeridian);
    const nightStart = parseStart(tashreehNightHour, tashreehNightMin, tashreehNightMeridian);
    if (dayStart === null && nightStart === null) return;
    setRows(prev => {
      let dayCur = 0, nightCur = 0;
      return prev.map(row => {
        const k = (parseFloat(row.khalis_waari_ghante) || 0) * 60 + (parseFloat(row.khalis_waari_minute) || 0);
        const dFrom = dayCur, dTo = dayCur + k;
        const nFrom = nightCur, nTo = nightCur + k;
        dayCur = dTo; nightCur = nTo;
        return {
          ...row,
          tashreeh_din: dayStart !== null ? fmtTashreehRange(dFrom, dTo, dayStart) : row.tashreeh_din,
          tashreeh_raat: nightStart !== null ? fmtTashreehRange(nFrom, nTo, nightStart) : row.tashreeh_raat,
        };
      });
    });
  }, [khalisSig, tashreehDayHour, tashreehDayMin, tashreehDayMeridian, tashreehNightHour, tashreehNightMin, tashreehNightMeridian]);

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

      // خالص واری auto-calc from خالص رقبہ × (1 ایکڑ وقت) جب CCA درج ہو
      if (ccaNum > 0 && ["khalis_raqba", "total_area", "total_area2", "ghair_mumkin"].includes(key)) {
        const acres = parseFloat(row.khalis_raqba) || 0;
        if (acres > 0) {
          const { h, m } = minsToStr(acres * minutesPerAcre);
          row.khalis_waari_minute = m;
          row.khalis_waari_ghante = h;
          row.khalis_waari2_minute = m;
          row.khalis_waari2_ghante = h;
        }
      }

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

  // AI Scanner — reads PDF / image / Excel / CSV and fills header + rows
  const handleScan = async (file) => {
    if (!file) return;
    setPdfLoading(true);
    try {
      const isSpreadsheet = /\.(xlsx|xls|csv)$/i.test(file.name) || file.type.includes("sheet") || file.type.includes("csv") || file.type.includes("excel");
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const AI_SCHEMA = {
        type: "object",
        properties: {
          header: {
            type: "object",
            properties: {
              mogha_number: { type: "string", description: "موگہ نمبر e.g. 16000" },
              mogha_side: { type: "string", description: "L یا R طرف" },
              rajbaha: { type: "string", description: "راجباہ نام" },
              mouza: { type: "string", description: "موضع/چک نمبر" },
              section: { type: "string", description: "سیکشن" },
              sub_division: { type: "string", description: "تحصیل/سب ڈویژن" },
              canal_division: { type: "string", description: "ضلع/ڈویژن" },
            },
          },
          rows: {
            type: "array",
            items: {
              type: "object",
              properties: {
                khatoni: { type: "string", description: "نمبر شمار یا کھاتہ نمبر (col 1 or نمبر شمار)" },
                owner_name: { type: "string", description: "نام مالک یا قابض اراضی معہ ولدیت (keep in Urdu)" },
                bandubast: { type: "string", description: "نمبران مربعہ جات / تفصیل بندوبست" },
                total_area: { type: "string", description: "کل رقبہ بروئے ایکڑ (numeric)" },
                ghair_mumkin: { type: "string", description: "غیر ممکن رقبہ (numeric)" },
                khalis_raqba: { type: "string", description: "خالص رقبہ = کل رقبہ − غیر ممکن (numeric)" },
                waari_ghante: { type: "string", description: "واری بحساب رقبہ گھنٹہ (numeric)" },
                waari_minute: { type: "string", description: "واری بحساب رقبہ منٹ (numeric)" },
                zaidah_ghante: { type: "string", description: "زائدہ واری / لیڈ گھنٹہ (numeric)" },
                zaidah_minute: { type: "string", description: "زائدہ واری / لیڈ منٹ (numeric)" },
                wazgi_ghante: { type: "string", description: "وضگی گھنٹہ (numeric)" },
                wazgi_minute: { type: "string", description: "وضگی منٹ (numeric)" },
                khalis_waari_ghante: { type: "string", description: "خالص واری / کل پانی گھنٹہ (numeric)" },
                khalis_waari_minute: { type: "string", description: "خالص واری / کل پانی منٹ (numeric)" },
                nikha_lega: { type: "string", description: "کس نکہ سے پانی لاوے گا (مربع/کیلہ)" },
                nikha_dega: { type: "string", description: "کس نکہ پر پانی دے گا (مربع/کیلہ)" },
                tashreeh_din: { type: "string", description: "اوقات داری — شروع وقت (day/time string e.g. سوموار صبح 6 بجے)" },
                tashreeh_raat: { type: "string", description: "اوقات داری — ختم وقت (day/time string)" },
              },
            },
          },
        },
      };

      const COMMON_DIGIT_RULES = `
CRITICAL RULES FOR NUMERIC FIELDS:
1. Convert ALL Eastern-Arabic / Urdu digits (۰۱۲۳۴۵۶۷۸۹ ٠١٢٣٤٥٦٧٨٩) to Western digits (0123456789). E.g. "۷.۲۴" → "7.24", "۱٢۳" → "123".
2. Strip thousands separators (، or ,) inside numbers: "1,234" → "1234".
3. Keep decimal points as "." (not ،). Preserve fractional values exactly: "7.10", "0.14", "12.5".
4. If a numeric cell is blank or "—", use empty string "".
5. Keep owner_name and nikha text in original Urdu script (Nastaliq). Do NOT translate names.
6. If a value is ambiguous or unreadable, use empty string "" — do NOT guess.`;

      const COLUMN_MAP = `
COLUMN MAPPING (table is read RIGHT-TO-LEFT in Urdu, columns 1→n from right):
  نمبر شمار (serial) → khatoni
  نام مالک یا قابض اراضی معہ ولدیت (owner + father) → owner_name  [URDU, keep as-is]
  نمبران مربعہ جات / تفصیل بندوبست (plot nos.) → bandubast
  رقبہ بروئے ایکڑ (total acres) → total_area  [numeric]
  غیر ممکن رقبہ (unusable) → ghair_mumkin  [numeric]
  خالص رقبہ (net area = total − unusable) → khalis_raqba  [numeric]
  واری بحساب رقبہ منٹ / گھنٹہ (water turn min / hr) → waari_minute / waari_ghante  [numeric]
  زائدہ وصولی منٹ / گھنٹہ (extra min / hr) → zaidah_minute / zaidah_ghante  [numeric]
  وضگی منٹ / گھنٹہ (deduction min / hr) → wazgi_minute / wazgi_ghante  [numeric]
  خالص واری / کل پانی منٹ / گھنٹہ (net water min / hr) → khalis_waari_minute / khalis_waari_ghante  [numeric]
  کس نکہ سے پانی لاوے گا (water source) → nikha_lega  [URDU]
  کس نکہ پر پانی دے گا (water dest) → nikha_dega  [URDU]
  تشریح اوقات دن (day start time) → tashreeh_din  [URDU text]
  تشریح اوقات رات (night end time) → tashreeh_raat  [URDU text]
Skip the میزان (totals) row, header rows, and sub-header rows. Extract ONLY data rows where owner_name or total_area is present.`;

      let result;
      if (isSpreadsheet) {
        // Excel / CSV → InvokeLLM with intelligent column mapping
        result = await base44.integrations.Core.InvokeLLM({
          prompt: `This Excel/CSV file contains a Parat Warabandi (پرت وارہ بندی) or Tarmeem Warabandi (ترمیم وارہ بندی) register in Urdu.
The spreadsheet may have Urdu column headers in row 1-4. Identify the header row, then map each data column.${COLUMN_MAP}

Also extract the document header metadata if present anywhere:
  mogha_number (موگہ نمبر, e.g. "18650"), mogha_side (L or R), rajbaha (راجباہ), mouza (موضع/چک), section (سیکشن), sub_division (سب ڈویژن/تحصیل), canal_division (ضلع/ڈویژن).
${COMMON_DIGIT_RULES}
Use empty string "" for any missing value. Return ONLY the JSON object — no markdown, no explanation.`,
          file_urls: [file_url],
          model: "claude_sonnet_4_6",
          response_json_schema: AI_SCHEMA,
        });
      } else {
        // PDF / image → AI vision + OCR extraction (Claude Sonnet — strong Urdu Nastaliq OCR)
        result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are an expert OCR + document analysis AI specialized in Pakistani irrigation land records.
This image/PDF is a scanned Parat Warabandi (پرت وارہ بندی) or Tarmeem Warabandi (ترمیم وارہ بندی) document written in Urdu (Nastaliq script), with mixed English text and numerals.

STEP 1 — HEADER: Read the top header line of the document for:
  mogha_number (موگہ نمبری, e.g. "18650"), mogha_side (طرف L or R), rajbaha (راجباہ), mouza (موضع/چک), section (سیکشن), sub_division (سب ڈویژن/تحصیل), canal_division (ضلع/کینال ڈویژن).

STEP 2 — TABLE ROWS: The table has many columns. For EACH DATA ROW extract these fields.${COLUMN_MAP}

STEP 3 — QUALITY: If a cell is blurred, crossed out, or illegible, use empty string "". If an entire row is a sub-total or the میزان (totals) row, SKIP it.

${COMMON_DIGIT_RULES}

Return ONLY a valid JSON object matching the schema — no markdown fences, no commentary.`,
          file_urls: [file_url],
          model: "claude_sonnet_4_6",
          response_json_schema: AI_SCHEMA,
        });
      }
      // Normalize digits + filter empty/total rows for a clean preview
      const cleaned = {
        header: result?.header || {},
        rows: (result?.rows || [])
          .filter(r => r && (r.owner_name || r.khatoni || r.total_area))
          .map(r => {
            const nr = {};
            for (const [k, v] of Object.entries(r)) {
              nr[k] = NUMERIC_FIELDS.includes(k) ? normalizeDigits(v) : v;
            }
            return nr;
          }),
      };
      setPdfPreview(cleaned);
    } catch (e) {
      console.error("AI scan failed", e);
      setPdfPreview({ __error: e?.message || "unknown" });
    }
    setPdfLoading(false);
    if (pdfRef.current) pdfRef.current.value = "";
  };

  // Apply the previewed/edited extraction to the header + table rows
  const applyExtractedData = (result) => {
    if (result?.header) {
      setHeader(prev => ({
        ...prev,
        mogha_number: result.header.mogha_number || prev.mogha_number,
        mogha_side: result.header.mogha_side || prev.mogha_side,
        rajbaha: result.header.rajbaha || prev.rajbaha,
        mouza: result.header.mouza || prev.mouza,
        section: result.header.section || prev.section,
        sub_division: result.header.sub_division || prev.sub_division,
        canal_division: result.header.canal_division || prev.canal_division,
      }));
    }
    if (result?.rows?.length > 0) {
      const mapped = result.rows.map(r => {
        const khatoni = r.khatoni || "";
        const owner_name = r.owner_name || "";
        const total_area = r.total_area || "";
        const ghair_mumkin = r.ghair_mumkin || "";
        const khalis_raqba = r.khalis_raqba || calcKhalis(total_area, ghair_mumkin);
        const row = {
          ...emptyRow(),
          khatoni, khatoni2: khatoni,
          owner_name, owner_name2: owner_name,
          bandubast: r.bandubast || "",
          total_area, total_area2: total_area,
          ghair_mumkin,
          khalis_raqba,
          waari_minute: r.waari_minute || "",
          waari_ghante: r.waari_ghante || "",
          zaidah_minute: r.zaidah_minute || "",
          zaidah_ghante: r.zaidah_ghante || "",
          wazgi_minute: r.wazgi_minute || "",
          wazgi_ghante: r.wazgi_ghante || "",
          nikha_lega: r.nikha_lega || "", nikha2_lega: r.nikha_lega || "",
          nikha_dega: r.nikha_dega || "", nikha2_dega: r.nikha_dega || "",
          tashreeh_din: r.tashreeh_din || "",
          tashreeh_raat: r.tashreeh_raat || "",
        };
        // Use AI-provided khalis_waari if available, else calculate
        if (r.khalis_waari_ghante || r.khalis_waari_minute) {
          row.khalis_waari_ghante = r.khalis_waari_ghante || "0";
          row.khalis_waari_minute = r.khalis_waari_minute || "0";
          row.khalis_waari2_ghante = row.khalis_waari_ghante;
          row.khalis_waari2_minute = row.khalis_waari_minute;
        } else {
          const kw = calcKhalisWaari(row);
          row.khalis_waari_minute = kw.khalis_waari_minute;
          row.khalis_waari_ghante = kw.khalis_waari_ghante;
          row.khalis_waari2_minute = kw.khalis_waari_minute;
          row.khalis_waari2_ghante = kw.khalis_waari_ghante;
        }
        return row;
      });
      setRows(mapped.map(normalizeRowDigits));
    }
    setPdfPreview(null);
  };

  // Apply pasted Excel data (array of row objects keyed by PASTE_COLUMNS)
  const applyPastedData = (pastedRows) => {
    if (!pastedRows || pastedRows.length === 0) return;
    const mapped = pastedRows.map(r => {
      const khatoni = r.khatoni || "";
      const owner_name = r.owner_name || "";
      const total_area = r.total_area || "";
      const ghair_mumkin = r.ghair_mumkin || "";
      const khalis_raqba = r.khalis_raqba || calcKhalis(total_area, ghair_mumkin);
      const row = {
        ...emptyRow(),
        khatoni, khatoni2: khatoni,
        owner_name, owner_name2: owner_name,
        bandubast: r.bandubast || "",
        total_area, total_area2: total_area,
        ghair_mumkin,
        khalis_raqba,
        waari_minute: r.waari_minute || "",
        waari_ghante: r.waari_ghante || "",
        zaidah_minute: r.zaidah_minute || "",
        zaidah_ghante: r.zaidah_ghante || "",
        wazgi_minute: r.wazgi_minute || "",
        wazgi_ghante: r.wazgi_ghante || "",
        nikha_lega: r.nikha_lega || "", nikha2_lega: r.nikha_lega || "",
        nikha_dega: r.nikha_dega || "", nikha2_dega: r.nikha_dega || "",
        tashreeh_din: r.tashreeh_din || "",
        tashreeh_raat: r.tashreeh_raat || "",
      };
      if (r.khalis_waari_ghante || r.khalis_waari_minute) {
        row.khalis_waari_ghante = r.khalis_waari_ghante || "0";
        row.khalis_waari_minute = r.khalis_waari_minute || "0";
        row.khalis_waari2_ghante = row.khalis_waari_ghante;
        row.khalis_waari2_minute = row.khalis_waari_minute;
      } else {
        const kw = calcKhalisWaari(row);
        row.khalis_waari_minute = kw.khalis_waari_minute;
        row.khalis_waari_ghante = kw.khalis_waari_ghante;
        row.khalis_waari2_minute = kw.khalis_waari_minute;
        row.khalis_waari2_ghante = kw.khalis_waari_ghante;
      }
      return row;
    });
    setRows(mapped.map(normalizeRowDigits));
  };

  const insertRowAfter = (i) => {
    setRows(prev => {
      const next = [...prev];
      next.splice(i + 1, 0, emptyRow());
      return next;
    });
  };

  const removeRow = (i) => setRows(prev => prev.filter((_, idx) => idx !== i));

  // ڈیفالٹ اسکرول نمبرشمار (سٹارٹ) سائڈ پر — ٹشریح اینڈ پر نہیں
  const scrollRef = useRef(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.scrollLeft = el.scrollWidth - el.clientWidth;
    });
    return () => cancelAnimationFrame(raf);
  }, []);

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

  const printData = { docType, headerLine, rows, notes, printRowSr, printColSr, variant: isJadeed ? "jadeed" : "tarmeem" };



  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Screen Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <select value={docType} onChange={e => setDocType(e.target.value)} dir="rtl"
              className="border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-400 font-semibold"
              style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
              <option value="پرت وارہ بندی">پرت وارہ بندی</option>
              <option value="کیس ترمیم وارہ بندی">کیس ترمیم وارہ بندی</option>
            </select>
            {/* Data Language Toggle */}
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
                  <span style={{ fontFamily: "serif" }}>اردو ڈیٹا</span>
                ) : "English Data"}
              </span>
            </label>
          </div>
          <div className="flex gap-2 items-center flex-wrap justify-end">
            <label className="flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer">
              <input type="checkbox" checked={printRowSr} onChange={e => setPrintRowSr(e.target.checked)} className="w-3 h-3" />
              پرنٹ قطار نمبرشمار
            </label>
            <label className="flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer">
              <input type="checkbox" checked={printColSr} onChange={e => setPrintColSr(e.target.checked)} className="w-3 h-3" />
              پرنٹ کالم نمبرشمار
            </label>
            <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} محفوظ
            </Button>
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

        {/* واری حساب: CCA / زائد وصولی / وضگی — 1 ایکڑ کا وقت خود بخود (not printed) */}
        <div className="flex items-center gap-3 mb-3 p-2 bg-amber-50 rounded border border-amber-200 flex-wrap" dir="rtl">
          <div className="flex items-center gap-1">
            <label className="text-[10px] text-amber-700 font-semibold">CCA (ایکڑ)</label>
            <input type="number" value={cca} onChange={e => setCca(e.target.value)} placeholder="130"
              className="w-20 border border-amber-300 rounded px-1.5 py-1 text-xs text-center bg-white focus:outline-none focus:border-amber-500" />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-[10px] text-amber-700 font-semibold" style={{ fontFamily: "serif" }}>زائد وصولی (منٹ)</label>
            <div className="w-20 border border-amber-300 rounded px-1.5 py-1 text-xs text-center bg-amber-100 text-amber-900 font-mono">{zaidWasoliMins}</div>
          </div>
          <div className="flex items-center gap-1">
            <label className="text-[10px] text-amber-700 font-semibold" style={{ fontFamily: "serif" }}>وضگی (منٹ)</label>
            <div className="w-20 border border-amber-300 rounded px-1.5 py-1 text-xs text-center bg-amber-100 text-amber-900 font-mono">{wazgiMins}</div>
          </div>
          {ccaNum > 0 && (
            <div className="text-[10px] bg-amber-100 border border-amber-200 rounded-lg px-2 py-1 text-amber-800 font-mono">
              1 ایکڑ = {minutesPerAcre.toFixed(2)} منٹ
            </div>
          )}
        </div>

        {/* تشریح اوقات: دن/رات شروع وقت + خالص واری سے خود بخود شیڈول */}
        <div className="flex items-center gap-3 mb-3 p-2 bg-purple-50 rounded border border-purple-200 flex-wrap" dir="rtl">
          <span className="text-[10px] font-bold text-purple-800" style={{ fontFamily: "serif" }}>تشریح اوقات</span>
          <div className="flex items-center gap-1">
            <label className="text-[10px] text-purple-700 font-semibold" style={{ fontFamily: "serif" }}>تشریح اوقات دن شروع</label>
            <input type="number" min="0" max="59" value={tashreehDayMin} onChange={e => setTashreehDayMin(e.target.value)} placeholder="منٹ" dir="ltr"
              className="w-14 border border-purple-300 rounded px-1.5 py-1 text-xs text-center bg-white focus:outline-none focus:border-purple-500 font-mono" />
            <input type="number" min="1" max="12" value={tashreehDayHour} onChange={e => setTashreehDayHour(e.target.value)} placeholder="گھنٹے" dir="ltr"
              className="w-14 border border-purple-300 rounded px-1.5 py-1 text-xs text-center bg-white focus:outline-none focus:border-purple-500 font-mono" />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-[10px] text-purple-700 font-semibold" style={{ fontFamily: "serif" }}>تشریح اوقات رات شروع</label>
            <input type="number" min="0" max="59" value={tashreehNightMin} onChange={e => setTashreehNightMin(e.target.value)} placeholder="منٹ" dir="ltr"
              className="w-14 border border-purple-300 rounded px-1.5 py-1 text-xs text-center bg-white focus:outline-none focus:border-purple-500 font-mono" />
            <input type="number" min="1" max="12" value={tashreehNightHour} onChange={e => setTashreehNightHour(e.target.value)} placeholder="گھنٹے" dir="ltr"
              className="w-14 border border-purple-300 rounded px-1.5 py-1 text-xs text-center bg-white focus:outline-none focus:border-purple-500 font-mono" />
          </div>
          {(tashreehDayHour || tashreehNightHour) && (
            <span className="text-[9px] text-purple-600" style={{ fontFamily: "serif" }}>خالص واری کا وقت خود بخود جمع ہو کر تشریح اوقات میں آئے گا</span>
          )}
        </div>


        <div dir="rtl" className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] text-slate-500 font-semibold" style={{ fontFamily: "serif" }}>موگہ نمبری</label>
            <MogaSearchSelect
              value={header.mogha_number}
              sideValue={header.mogha_side}
              onSelect={handleMogaSelect}
            />
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
                className="w-full border border-slate-300 rounded px-2 py-1 text-[11px] text-slate-800 bg-white focus:outline-none focus:border-blue-400"
                style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }} />
            </div>
          ))}
        </div>

        <div dir="rtl" className="mt-3 p-2 bg-white border border-dashed border-slate-300 rounded text-center text-[11px] text-blue-700 font-bold"
          style={{ fontFamily: "'Noto Nastaliq Urdu', serif", lineHeight: 2.6, letterSpacing: "0.3px" }}>
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
          <Button size="sm" onClick={() => setShowPaste(true)}
            className="h-6 text-[10px] bg-teal-600 hover:bg-teal-700 text-white gap-1 px-2">
            <ClipboardPaste className="w-3 h-3" /> کاپی پیسٹ
          </Button>
          <Button size="sm" onClick={() => pdfRef.current?.click()} disabled={pdfLoading}
            className="h-6 text-[10px] bg-amber-500 hover:bg-amber-600 text-white gap-1 px-2">
            {pdfLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ScanLine className="w-3 h-3" />}
            {pdfLoading ? "پڑھ رہا ہے..." : "AI اسکینر"}
          </Button>
          <input ref={pdfRef} type="file" accept="application/pdf,image/*,.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" className="hidden"
            onChange={e => handleScan(e.target.files[0])} />
          <Button size="sm" onClick={() => insertRowAfter(rows.length - 1)} className="h-6 text-[10px] bg-blue-600 hover:bg-blue-700 text-white gap-1 px-2">
            <Plus className="w-3 h-3" /> قطار
          </Button>
        </div>
      </div>

      {/* Table + action column (number-shumar side) */}
      <div className="flex">
        {/* Scrollable table */}
        <div ref={scrollRef} className="overflow-auto flex-1" style={{ maxHeight: "70vh" }}>
          <table style={{ borderCollapse: "collapse", minWidth: "1700px", width: "100%", direction: "rtl" }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
              {showColSr && (
                <tr style={{ backgroundColor: "#f0f4ff" }}>
                  <th className={thCls} style={{ fontSize: "8px", width: 32 }}></th>
                  {showRowSr && <th className={thCls} style={{ fontSize: "8px", width: 28 }}>#</th>}
                  {COL_LETTERS.slice(isJadeed ? 7 : 0).map((l, i) => (
                    <th key={i} className={thCls} style={{ fontSize: "8px" }}>{l}</th>
                  ))}
                  <th className={thCls} style={{ width: 28 }}></th>
                </tr>
              )}
              <tr style={{ backgroundColor: "#dbeafe" }}>
                <th className={thCls} rowSpan={2} style={{ width: 32 }}></th>
                {showRowSr && <th className={thCls} rowSpan={2} style={{ width: 28 }}>نمبرشمار</th>}
                {showSummary && <>
                <th className={thCls} rowSpan={2}>کھاتہ نمبر</th>
                <th className={thCls} rowSpan={2} style={{ minWidth: 80 }}>نام مالک معہ والدیت</th>
                <th className={thCls}>کل رقبہ</th>
                <th className={thCls} colSpan={2}>خالص واری</th>
                <th className={thCls} colSpan={2}>نکہ جات</th>
                </>}
                <th className={thCls} rowSpan={2}>کھاتہ نمبر</th>
                <th className={thCls} rowSpan={2} style={{ minWidth: 80 }}>نام مالک معہ والدیت</th>
                <th className={thCls} rowSpan={2} style={{ minWidth: 90 }}>نمبران بندوبست</th>
                <th className={thCls} colSpan={2}>نکہ جات</th>
                <th className={thCls}>کل رقبہ</th>
                <th className={thCls}>غیر ممکن رقبہ</th>
                <th className={thCls}>خالص رقبہ</th>
                <th className={thCls} colSpan={2}>واری بحساب رقبہ</th>
                <th className={thCls} colSpan={2}>زائدہ وصولی</th>
                <th className={thCls} colSpan={2}>وضگی</th>
                <th className={thCls} colSpan={2}>خالص واری</th>
                <th className={thCls} rowSpan={2}>تشریح اوقات دن</th>
                <th className={thCls} rowSpan={2}>تشریح اوقات رات</th>
                <th className={thCls} rowSpan={2} style={{ width: 28 }}></th>
              </tr>
              <tr style={{ backgroundColor: "#eff6ff" }}>
                {showSummary && <>
                <th className={thCls}>ایکڑ</th>
                <th className={thCls}>منٹ</th><th className={thCls}>گھنٹے</th>
                <th className={thCls}>لیگا</th><th className={thCls}>دیگا</th>
                </>}
                <th className={thCls}>لیگا</th><th className={thCls}>دیگا</th>
                <th className={thCls}>ایکڑ</th>
                <th className={thCls}>ایکڑ</th>
                <th className={thCls}>ایکڑ</th>
                <th className={thCls}>منٹ</th><th className={thCls}>گھنٹے</th>
                <th className={thCls}>منٹ</th><th className={thCls}>گھنٹے</th>
                <th className={thCls}>منٹ</th><th className={thCls}>گھنٹے</th>
                <th className={thCls}>منٹ</th><th className={thCls}>گھنٹے</th>
                <th className={thCls} style={{ width: 28 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-blue-50/30">
                  <td className={tdCls} style={{ width: 32 }}>
                    <div className="flex flex-col items-center gap-0.5">
                      <button onClick={() => insertRowAfter(i - 1)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded p-0.5" title="اوپر قطار شامل کریں">
                        <Plus className="w-3 h-3" />
                      </button>
                      <button onClick={() => removeRow(i)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 rounded p-0.5" title="حذف کریں">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  {showRowSr && <td className={tdCls} style={{ fontSize: "9px", color: "#1d4ed8", minWidth: 28, textAlign: "center", fontWeight: "bold" }}>{i + 1}</td>}
                  {showSummary && <>
                  <td className={tdCls}><input value={row.khatoni2} onChange={e => updateRow(i, "khatoni2", e.target.value)} className={inp} dir={isUrduMode ? "rtl" : "ltr"} /></td>
                  <td className={tdCls} style={{ minWidth: 80 }}>
                    <input value={row.owner_name2} onChange={e => updateRow(i, "owner_name2", e.target.value)} className={inp}
                      dir={isUrduMode ? "rtl" : "ltr"}
                      style={{ fontFamily: isUrduMode ? "'Noto Nastaliq Urdu', serif" : undefined, textAlign: isUrduMode ? "right" : "left" }} />
                  </td>
                  <td className={tdCls} style={{ position: "relative" }}>
                    <input value={row.total_area2} onChange={e => updateRow(i, "total_area2", e.target.value)} className={inp} dir="ltr" />
                    {!isUrduMode && row.total_area2 && isEnglishOrDigit(row.total_area2) && (
                      <div className="text-[7px] text-blue-600 text-center font-mono leading-none pb-0.5">{formatAreaMB(row.total_area2)}</div>
                    )}
                  </td>
                  <td className={tdCls}><input value={row.khalis_waari2_minute} onChange={e => updateRow(i, "khalis_waari2_minute", e.target.value)} className={inp} style={{ color: "#1d4ed8" }} /></td>
                  <td className={tdCls}><input value={row.khalis_waari2_ghante} onChange={e => updateRow(i, "khalis_waari2_ghante", e.target.value)} className={inp} style={{ color: "#1d4ed8" }} /></td>
                  <td className={tdCls}><input value={row.nikha2_lega} onChange={e => updateRow(i, "nikha2_lega", e.target.value)} className={inp} style={{ fontFamily: "serif" }} /></td>
                  <td className={tdCls}><input value={row.nikha2_dega} onChange={e => updateRow(i, "nikha2_dega", e.target.value)} className={inp} style={{ fontFamily: "serif" }} /></td>
                  </>}
                  <td className={tdCls}><input value={row.khatoni} onChange={e => updateRow(i, "khatoni", e.target.value)} className={inp} dir={isUrduMode ? "rtl" : "ltr"} /></td>
                  <td className={tdCls} style={{ minWidth: 80 }}>
                    <input value={row.owner_name} onChange={e => updateRow(i, "owner_name", e.target.value)} className={inp}
                      dir={isUrduMode ? "rtl" : "ltr"}
                      style={{ fontFamily: isUrduMode ? "'Noto Nastaliq Urdu', serif" : undefined, textAlign: isUrduMode ? "right" : "left" }} />
                  </td>
                  <td className={tdCls} style={{ minWidth: 90 }}>
                    <div className="flex items-center gap-0.5">
                      <input value={row.bandubast} onChange={e => updateRow(i, "bandubast", e.target.value)} className={inp} placeholder="87/3" dir="ltr" style={{ fontFamily: "serif" }} />
                      <button onClick={() => setPicker({ row: i, field: "bandubast" })} className="text-emerald-600 hover:text-emerald-700 shrink-0" title="نقشے سے مستطیل/ایکڑ منتخب کریں">
                        <LayoutGrid className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className={tdCls}>
                    <div className="flex items-center gap-0.5">
                      <input value={row.nikha_lega} onChange={e => updateRow(i, "nikha_lega", e.target.value)} className={inp} style={{ fontFamily: "serif" }} />
                      <button onClick={() => setPicker({ row: i, field: "nikha_lega" })} className="text-emerald-600 hover:text-emerald-700 shrink-0" title="نقشے سے نکہ منتخب کریں">
                        <LayoutGrid className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className={tdCls}>
                    <div className="flex items-center gap-0.5">
                      <input value={row.nikha_dega} onChange={e => updateRow(i, "nikha_dega", e.target.value)} className={inp} style={{ fontFamily: "serif" }} />
                      <button onClick={() => setPicker({ row: i, field: "nikha_dega" })} className="text-emerald-600 hover:text-emerald-700 shrink-0" title="نقشے سے نکہ منتخب کریں">
                        <LayoutGrid className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className={tdCls} style={{ position: "relative" }}>
                    <input value={row.total_area} onChange={e => updateRow(i, "total_area", e.target.value)} className={inp} dir="ltr" />
                    {!isUrduMode && row.total_area && isEnglishOrDigit(row.total_area) && (
                      <div className="text-[7px] text-blue-600 text-center font-mono leading-none pb-0.5">{formatAreaMB(row.total_area)}</div>
                    )}
                  </td>
                  <td className={tdCls}><input value={row.ghair_mumkin} onChange={e => updateRow(i, "ghair_mumkin", e.target.value)} className={inp} /></td>
                  <td className={tdCls} style={{ backgroundColor: "#f0fdf4", position: "relative" }}>
                    <input value={row.khalis_raqba} onChange={e => updateRow(i, "khalis_raqba", e.target.value)} className={inp} style={{ color: "#166534" }} dir="ltr" />
                    {!isUrduMode && row.khalis_raqba && isEnglishOrDigit(row.khalis_raqba) && (
                      <div className="text-[7px] text-emerald-600 text-center font-mono leading-none pb-0.5">{formatAreaMB(row.khalis_raqba)}</div>
                    )}
                  </td>
                  <td className={tdCls}><input value={row.waari_minute} onChange={e => updateRow(i, "waari_minute", e.target.value)} className={inp} /></td>
                  <td className={tdCls}><input value={row.waari_ghante} onChange={e => updateRow(i, "waari_ghante", e.target.value)} className={inp} /></td>
                  <td className={tdCls}><input value={row.zaidah_minute} onChange={e => updateRow(i, "zaidah_minute", e.target.value)} className={inp} /></td>
                  <td className={tdCls}><input value={row.zaidah_ghante} onChange={e => updateRow(i, "zaidah_ghante", e.target.value)} className={inp} /></td>
                  <td className={tdCls}><input value={row.wazgi_minute} onChange={e => updateRow(i, "wazgi_minute", e.target.value)} className={inp} /></td>
                  <td className={tdCls}><input value={row.wazgi_ghante} onChange={e => updateRow(i, "wazgi_ghante", e.target.value)} className={inp} /></td>
                  {/* خالص واری — auto-calculated, shown in green */}
                  <td className={tdCls} style={{ backgroundColor: "#eff6ff" }}><input value={row.khalis_waari_minute} onChange={e => updateRow(i, "khalis_waari_minute", e.target.value)} className={inp} style={{ color: "#1d4ed8" }} /></td>
                  <td className={tdCls} style={{ backgroundColor: "#eff6ff" }}><input value={row.khalis_waari_ghante} onChange={e => updateRow(i, "khalis_waari_ghante", e.target.value)} className={inp} style={{ color: "#1d4ed8" }} /></td>
                  <td className={tdCls} style={{ minWidth: 150 }}><input value={row.tashreeh_din} onChange={e => updateRow(i, "tashreeh_din", e.target.value)} className={inp} style={{ fontSize: "8px", fontFamily: "serif" }} dir="rtl" /></td>
                  <td className={tdCls} style={{ minWidth: 150 }}><input value={row.tashreeh_raat} onChange={e => updateRow(i, "tashreeh_raat", e.target.value)} className={inp} style={{ fontSize: "8px", fontFamily: "serif" }} dir="rtl" /></td>
                  <td className={tdCls} style={{ width: 28 }}>
                    <button onClick={() => removeRow(i)} className="text-slate-300 hover:text-red-500 p-0.5">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
              {/* میزان row */}
              <tr style={{ backgroundColor: "#fef9e7" }}>
                <td className={totalCls} style={{ width: 32 }}></td>
                {showRowSr && <td className={totalCls}>—</td>}
                {showSummary && <>
                <td className={totalCls}>—</td>
                <td className={totalCls} style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>میزان</td>
                <td className={totalCls}>{sumCol(rows, "total_area2")}</td>
                <td className={totalCls}>{sumPair(rows, "khalis_waari2_minute", "khalis_waari2_ghante").m}</td>
                <td className={totalCls}>{sumPair(rows, "khalis_waari2_minute", "khalis_waari2_ghante").h}</td>
                <td className={totalCls}>—</td><td className={totalCls}>—</td>
                </>}
                <td className={totalCls}>—</td>
                <td className={totalCls} style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>میزان</td>
                <td className={totalCls}>—</td>
                <td className={totalCls}>—</td><td className={totalCls}>—</td>
                <td className={totalCls}>{sumCol(rows, "total_area")}</td>
                <td className={totalCls}>{sumCol(rows, "ghair_mumkin")}</td>
                <td className={totalCls}>{sumCol(rows, "khalis_raqba")}</td>
                <td className={totalCls}>{sumPair(rows, "waari_minute", "waari_ghante").m}</td>
                <td className={totalCls}>{sumPair(rows, "waari_minute", "waari_ghante").h}</td>
                <td className={totalCls}>{sumPair(rows, "zaidah_minute", "zaidah_ghante").m}</td>
                <td className={totalCls}>{sumPair(rows, "zaidah_minute", "zaidah_ghante").h}</td>
                <td className={totalCls}>{sumPair(rows, "wazgi_minute", "wazgi_ghante").m}</td>
                <td className={totalCls}>{sumPair(rows, "wazgi_minute", "wazgi_ghante").h}</td>
                <td className={totalCls}>{sumPair(rows, "khalis_waari_minute", "khalis_waari_ghante").m}</td>
                <td className={totalCls}>{sumPair(rows, "khalis_waari_minute", "khalis_waari_ghante").h}</td>
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

      {(pdfLoading || pdfPreview) && (
        <PdfUploadPreview
          data={pdfPreview}
          loading={pdfLoading}
          onClose={() => setPdfPreview(null)}
          onApply={applyExtractedData}
        />
      )}

      {showPaste && (
        <PasteDataDialog
          onClose={() => setShowPaste(false)}
          onApply={applyPastedData}
        />
      )}

      <BandubastPicker
        open={!!picker}
        value={picker ? (rows[picker.row]?.[picker.field] || "") : ""}
        onChange={(v) => { if (picker) updateRow(picker.row, picker.field, v); }}
        mogaNumber={header.mogha_number}
        mapId={header.map_id}
        title={picker?.field === "nikha_lega" ? "نکہ لیگا" : picker?.field === "nikha_dega" ? "نکہ دیگا" : "نمبران بندوبست"}
        onClose={() => setPicker(null)}
      />

      {showPrint && <PrintModal {...printData} onClose={() => setShowPrint(false)} />}
    </div>
  );
}

function PrintModal({ docType, headerLine, rows, notes, printRowSr, printColSr, onClose, variant }) {
  const isJadeed = variant === "jadeed";
  const showSummary = !isJadeed;
  const thP = { border: "1.5px solid #1e3a5f", padding: "3px 4px", textAlign: "center", backgroundColor: "#dbeafe", fontSize: "8px", fontWeight: "bold", fontFamily: "'Noto Nastaliq Urdu', serif", color: "#1e3a5f" };
  const thLetters = { ...thP, backgroundColor: "#f0f4ff" };
  const thSub = { ...thP, backgroundColor: "#eff6ff" };
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

  // Reusable header rows (col letters + main header + sub header)
  const headerRows = (
    <>
      {printColSr && (
        <tr>
          {printRowSr && <th style={{ ...thLetters, fontSize: "7px" }}>#</th>}
          {COL_LETTERS.slice(isJadeed ? 7 : 0).map((l, i) => <th key={i} style={{ ...thLetters, fontSize: "7px" }}>{l}</th>)}
        </tr>
      )}
      <tr>
        {printRowSr && <th style={thP} rowSpan={2}>نمبرشمار</th>}
        {showSummary && <>
        <th style={thP} rowSpan={2}>کھاتہ نمبر</th>
        <th style={{ ...thP, minWidth: 70 }} rowSpan={2}>نام مالک معہ والدیت</th>
        <th style={thP}>کل رقبہ</th>
        <th style={thP} colSpan={2}>خالص واری</th>
        <th style={thP} colSpan={2}>نکہ جات</th>
        </>}
        <th style={thP} rowSpan={2}>کھاتہ نمبر</th>
        <th style={{ ...thP, minWidth: 80 }} rowSpan={2}>نام مالک معہ والدیت</th>
        <th style={{ ...thP, minWidth: 80 }} rowSpan={2}>نمبران بندوبست</th>
        <th style={thP}>کل رقبہ</th>
        <th style={thP}>غیر ممکن رقبہ</th>
        <th style={thP}>خالص رقبہ</th>
        <th style={thP} colSpan={2}>واری بحساب رقبہ</th>
        <th style={thP} colSpan={2}>زائدہ وصولی</th>
        <th style={thP} colSpan={2}>وضگی</th>
        <th style={thP} colSpan={2}>خالص واری</th>
        <th style={thP} colSpan={2}>نکہ جات</th>
        <th style={thP} rowSpan={2}>تشریح اوقات دن</th>
        <th style={thP} rowSpan={2}>تشریح اوقات رات</th>
      </tr>
      <tr>
        {showSummary && <>
        <th style={thSub}>ایکڑ</th>
        <th style={thSub}>منٹ</th><th style={thSub}>گھنٹے</th>
        <th style={thSub}>لیگا</th><th style={thSub}>دیگا</th>
        </>}
        <th style={thSub}>ایکڑ</th>
        <th style={thSub}>ایکڑ</th>
        <th style={thSub}>ایکڑ</th>
        <th style={thSub}>منٹ</th><th style={thSub}>گھنٹے</th>
        <th style={thSub}>منٹ</th><th style={thSub}>گھنٹے</th>
        <th style={thSub}>منٹ</th><th style={thSub}>گھنٹے</th>
        <th style={thSub}>منٹ</th><th style={thSub}>گھنٹے</th>
        <th style={thSub}>لیگا</th><th style={thSub}>دیگا</th>
      </tr>
    </>
  );

  // (header line is rendered as a borderless div before the table — first page only)

  // Data rows
  const dataRows = rows.map((row, i) => (
    <tr key={i}>
      {printRowSr && <td style={tdP}>{i + 1}</td>}
      {showSummary && <>
      <td style={tdP}>{d(row.khatoni2)}</td>
      <td style={{ ...tdP, textAlign: "right" }}>{d(row.owner_name2)}</td>
      <td style={tdP}>{d(row.total_area2)}</td>
      <td style={tdP}>{d(row.khalis_waari2_minute)}</td>
      <td style={tdP}>{d(row.khalis_waari2_ghante)}</td>
      <td style={tdP} dangerouslySetInnerHTML={{ __html: row.nikha2_lega ? fracHtml(row.nikha2_lega) : "-" }} />
      <td style={tdP} dangerouslySetInnerHTML={{ __html: row.nikha2_dega ? fracHtml(row.nikha2_dega) : "-" }} />
      </>}
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
  ));

  // Total (میزان) row
  const totalRow = (
    <tr className="total-row">
      {printRowSr && <td style={tdTotal}>—</td>}
      {showSummary && <>
      <td style={tdTotal}>—</td>
      <td style={{ ...tdTotal, textAlign: "right" }}>میزان</td>
      <td style={tdTotal}>{sumCol(rows, "total_area2")}</td>
      <td style={tdTotal}>{sumPair(rows, "khalis_waari2_minute", "khalis_waari2_ghante").m}</td>
      <td style={tdTotal}>{sumPair(rows, "khalis_waari2_minute", "khalis_waari2_ghante").h}</td>
      <td style={tdTotal}>—</td><td style={tdTotal}>—</td>
      </>}
      <td style={tdTotal}>—</td>
      <td style={{ ...tdTotal, textAlign: "right" }}>میزان</td>
      <td style={tdTotal}>—</td>
      <td style={tdTotal}>{sumCol(rows, "total_area")}</td>
      <td style={tdTotal}>{sumCol(rows, "ghair_mumkin")}</td>
      <td style={tdTotal}>{sumCol(rows, "khalis_raqba")}</td>
      <td style={tdTotal}>{sumPair(rows, "waari_minute", "waari_ghante").m}</td>
      <td style={tdTotal}>{sumPair(rows, "waari_minute", "waari_ghante").h}</td>
      <td style={tdTotal}>{sumPair(rows, "zaidah_minute", "zaidah_ghante").m}</td>
      <td style={tdTotal}>{sumPair(rows, "zaidah_minute", "zaidah_ghante").h}</td>
      <td style={tdTotal}>{sumPair(rows, "wazgi_minute", "wazgi_ghante").m}</td>
      <td style={tdTotal}>{sumPair(rows, "wazgi_minute", "wazgi_ghante").h}</td>
      <td style={tdTotal}>{sumPair(rows, "khalis_waari_minute", "khalis_waari_ghante").m}</td>
      <td style={tdTotal}>{sumPair(rows, "khalis_waari_minute", "khalis_waari_ghante").h}</td>
      <td style={tdTotal}>—</td><td style={tdTotal}>—</td>
      <td style={tdTotal}>—</td><td style={tdTotal}>—</td>
    </tr>
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
          {/* Header line — first page only (borderless div outside the table so it doesn't repeat) */}
          <div style={{ textAlign: "center", fontSize: "13px", fontWeight: "bold", marginBottom: "8px", fontFamily: "'Noto Nastaliq Urdu', serif", color: "#1e3a5f", lineHeight: 2.4, letterSpacing: "0.4px" }}>
            {headerLine}
          </div>

          {/* Table — column headers in <thead> repeat on every printed page */}
          <table style={{ borderCollapse: "collapse", width: "100%", direction: "rtl" }}>
            <thead>
              {headerRows}
            </thead>
            <tbody>
              {dataRows}
              {totalRow}
            </tbody>
          </table>

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