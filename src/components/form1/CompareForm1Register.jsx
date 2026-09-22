import React, { useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, GitCompareArrows, AlertTriangle, CheckCircle2, Plus, Minus, Edit3, Download, X, Loader2, Info } from "lucide-react";

// ─── Column auto-detection ──────────────────────────────────────────────────
// Maps possible header names (Urdu + English, case-insensitive) to canonical keys.
const COLUMN_ALIASES = {
  khata_no: ["khata_no", "khata", "khatano", "khatanumber", "کھاتہ", "کھاتہ نمبر", "نمبر کھاتہ", "خاتہ", "خاتہ نمبر"],
  farmer_name: ["farmer_name", "name", "farmer", "owner", "مالک", "نام", "نام مالک", "نام مالک/معہ ولدیت"],
  father: ["father", "father_name", "parent", "ولد", "ولدیت", "ولدیت نام"],
  cnic: ["cnic", "id", "identity", "شناختی", "شناختی کارڈ", "سنک", "شناختی کارڈ نمبر"],
  kanal: ["kanal", "kanal_no", "کنال", "کنال نمبر"],
  marla: ["marla", "marla_no", "مرلہ", "مرلہ نمبر"],
  khasra: ["khasra", "khasra_no", "خسرہ", "نمبر خسرہ", "خسرہ بندوبست", "نمبر خسرہ بندوبست"],
  moga_number: ["moga", "moga_no", "moga_number", "موگہ", "نمبر موگہ", "موگہ نمبر", "موگے"],
  murba: ["murba", "murba_no", "mustateel", "مستطیل", "مربع", "مرابعہ"],
  acre_no: ["acre", "acre_no", "killa", "کیلہ", "ایکڑ", "ایکڑ نمبر", "کلہ"],
  channel_name: ["channel", "rajbah", "rajbah_name", "راجباہ", "راجباہ/مائنر", "کینال", "نہر"],
  crop_name: ["crop", "crop_name", "کیفیت", "فصل", "فصل کا نام"],
  total_acres: ["total_acres", "total_acre", "total_area", "total_area_acres", "cca", "total_cca", "total cca acre", "total cca (acre)", "cca acre", "cca (acre)", "total cca (acres)", "کل رقبہ", "کل ایکڑ", "رقبہ ایکڑ", "رقبہ کل", "کل", "ایکڑ کل", "cca acres", "total cca"],
};

function normalizeHeader(h) {
  return String(h || "").trim().toLowerCase().replace(/[\s_\-./()]+/g, "");
}

// Build a mapping from canonical key → actual column index in the sheet
function detectColumns(headers) {
  const map = {};
  const normHeaders = headers.map(normalizeHeader);
  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    const normAliases = aliases.map(normalizeHeader);
    for (let i = 0; i < normHeaders.length; i++) {
      if (normAliases.includes(normHeaders[i])) {
        map[canonical] = i;
        break;
      }
    }
  }
  return map;
}

// Parse an uploaded Excel/CSV file into an array of row objects (canonical keys)
function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        // Use the first sheet
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
        if (raw.length < 2) {
          resolve({ headers: [], rows: [] });
          return;
        }
        // Find the header row — usually row 0, but scan first 5 rows for a row
        // that contains at least 2 recognizable column aliases.
        let headerRowIdx = 0;
        let bestScore = 0;
        for (let i = 0; i < Math.min(5, raw.length); i++) {
          const score = raw[i].filter(c => Object.values(COLUMN_ALIASES).flat().some(a => normalizeHeader(c) === normalizeHeader(a))).length;
          if (score > bestScore) { bestScore = score; headerRowIdx = i; }
        }
        const headers = raw[headerRowIdx].map(c => String(c || "").trim());
        const colMap = detectColumns(headers);
        const rows = [];
        for (let r = headerRowIdx + 1; r < raw.length; r++) {
          const row = raw[r];
          if (!row || row.every(c => c === "" || c == null)) continue;
          const obj = {};
          for (const [canonical, idx] of Object.entries(colMap)) {
            obj[canonical] = String(row[idx] ?? "").trim();
          }
          // Only keep rows that have at least a khata_no or farmer_name
          if (!obj.khata_no && !obj.farmer_name) continue;
          rows.push(obj);
        }
        resolve({ headers, rows, colMap });
      } catch (err) {
        reject(new Error("فائل پڑھنے میں مسئلہ: " + err.message));
      }
    };
    reader.onerror = () => reject(new Error("فائل پڑھنے میں خطا"));
    reader.readAsArrayBuffer(file);
  });
}

// ─── Comparison logic ────────────────────────────────────────────────────────
// Group rows by khata_no; aggregate name + total area per khata.
// unit: "kanal" = رقبہ کنال میں ہے (براہ راست استعمال)
//       "acres" = رقبہ ایکڑ میں ہے (×8 سے کنال بنائیں)
function groupByKhata(rows, unit = "kanal") {
  const map = new Map();
  for (const r of rows) {
    const khata = String(r.khata_no || "").trim();
    if (!khata) continue;
    if (!map.has(khata)) {
      map.set(khata, {
        khata_no: khata,
        names: new Set(),
        kanal: 0,
        marla: 0,
        khasra: new Set(),
        moga: new Set(),
        rows: [],
      });
    }
    const g = map.get(khata);
    const fullName = [r.farmer_name, r.father].filter(Boolean).join(" ولد ");
    if (fullName) g.names.add(fullName);
    // رقبہ — اکائی کے مطابق تبدیل: ایکڑ ×8 = کنال
    const rawKanal = parseFloat(r.kanal) || 0;
    const rawMarla = parseFloat(r.marla) || 0;
    const rawAcres = parseFloat(r.total_acres) || 0;
    if (unit === "acres") {
      // ایکڑ کالم کو ترجیح، ورنہ کنال کالم کی قدر کو ایکڑ سمجھ کر ×8
      const acresVal = rawAcres || rawKanal;
      g.kanal += acresVal * 8;
    } else {
      g.kanal += rawKanal;
      g.marla += rawMarla;
    }
    if (r.khasra) g.khasra.add(r.khasra);
    if (r.moga_number) g.moga.add(r.moga_number);
    g.rows.push(r);
  }
  return map;
}

// Compare two grouped maps; return array of diff entries
function compareKhatas(map1, map2) {
  const allKhatas = new Set([...map1.keys(), ...map2.keys()]);
  const diffs = [];
  for (const khata of allKhatas) {
    const g1 = map1.get(khata);
    const g2 = map2.get(khata);
    if (g1 && !g2) {
      diffs.push({ khata_no: khata, type: "removed", old: g1, new: null, changes: ["khata_removed"] });
    } else if (!g1 && g2) {
      diffs.push({ khata_no: khata, type: "added", old: null, new: g2, changes: ["khata_added"] });
    } else {
      const changes = [];
      const name1 = [...g1.names].join("؛ ") || "—";
      const name2 = [...g2.names].join("؛ ") || "—";
      // نام کا موازنہ — خالی جگہوں اور کیس کو نارملائز کر کے
      const normName = (s) => String(s || "").replace(/\s+/g, " ").trim();
      if (normName(name1) !== normName(name2)) changes.push("name");
      // رقبہ کا موازنہ — 2 اعشاریے تک راؤنڈ، 0.05 کنال (≈1 مرلہ) تک کی فرق نظر انداز
      const area1 = +(g1.kanal + g1.marla / 20).toFixed(2);
      const area2 = +(g2.kanal + g2.marla / 20).toFixed(2);
      if (Math.abs(area1 - area2) > 0.05) changes.push("raqba");
      const khasra1 = [...g1.khasra].sort().join("،");
      const khasra2 = [...g2.khasra].sort().join("،");
      if (khasra1 !== khasra2) changes.push("khasra");
      const moga1 = [...g1.moga].sort().join("،");
      const moga2 = [...g2.moga].sort().join("،");
      if (moga1 !== moga2) changes.push("moga");
      diffs.push({
        khata_no: khata,
        type: changes.length === 0 ? "unchanged" : "modified",
        old: g1, new: g2,
        changes,
        name1, name2, area1, area2, khasra1, khasra2, moga1, moga2,
      });
    }
  }
  // Sort: modified first, then added, then removed, then unchanged
  const order = { modified: 0, added: 1, removed: 2, unchanged: 3 };
  diffs.sort((a, b) => order[a.type] - order[b.type] || String(a.khata_no).localeCompare(String(b.khata_no), undefined, { numeric: true }));
  return diffs;
}

// ─── Highlighted cell renderer ───────────────────────────────────────────────
function HighlightCell({ value, prevValue, isChanged, highlightClass = "bg-rose-100 text-rose-700" }) {
  if (isChanged) {
    return (
      <div className={`px-2 py-1 rounded ${highlightClass} font-bold border border-rose-300`}>
        <span className="line-through text-rose-400 mr-1">{prevValue || "—"}</span>
        <span className="text-rose-700">←</span>
        <span className="ml-1">{value || "—"}</span>
      </div>
    );
  }
  return <span className="text-slate-700">{value || "—"}</span>;
}

// ─── CSV export of the diff report ────────────────────────────────────────────
function downloadDiffCSV(diffs) {
  const rows = [["Khata No", "Type", "Old Name", "New Name", "Old Kanal", "New Kanal", "Old Marla", "New Marla", "Old Khasra", "New Khasra", "Old Moga", "New Moga", "Changes"]];
  for (const d of diffs) {
    rows.push([
      d.khata_no,
      d.type,
      d.old ? [...d.old.names].join("؛ ") : "",
      d.new ? [...d.new.names].join("؛ ") : "",
      d.old ? d.old.kanal : "",
      d.new ? d.new.kanal : "",
      d.old ? d.old.marla : "",
      d.new ? d.new.marla : "",
      d.old ? [...d.old.khasra].join("،") : "",
      d.new ? [...d.new.khasra].join("،") : "",
      d.old ? [...d.old.moga].join("،") : "",
      d.new ? [...d.new.moga].join("،") : "",
      d.changes.join(", "),
    ]);
  }
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "form1_compare_report.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── File upload box ─────────────────────────────────────────────────────────
function FileUploadBox({ label, file, onFile, fileData, accent = "amber" }) {
  const inputId = `file-${label.replace(/\s/g, "")}`;
  const accentClasses = {
    amber: "border-amber-300 bg-amber-50 text-amber-700",
    blue: "border-blue-300 bg-blue-50 text-blue-700",
  };
  return (
    <div className="flex-1">
      <input
        id={inputId}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={e => { const f = e.target.files[0]; if (f) onFile(f, label); }}
      />
      <label
        htmlFor={inputId}
        className={`flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:shadow-md ${file ? "border-emerald-400 bg-emerald-50" : accentClasses[accent]}`}
      >
        {file ? (
          <>
            <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-700 text-center break-all px-2">{file.name}</span>
            <span className="text-[10px] text-emerald-600">
              {fileData?.rows?.length || 0} قطار
            </span>
          </>
        ) : (
          <>
            <Upload className="w-7 h-7 opacity-60" />
            <span className="text-xs font-bold text-center">{label}</span>
            <span className="text-[9px] opacity-60">Excel / CSV اپ لوڈ کریں</span>
          </>
        )}
      </label>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function CompareForm1Register() {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [data1, setData1] = useState(null);
  const [data2, setData2] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // all | modified | added | removed
  const [unit1, setUnit1] = useState("kanal"); // File 1 raqba unit
  const [unit2, setUnit2] = useState("acres");  // File 2 raqba unit

  const handleFile = useCallback(async (f, which) => {
    setLoading(true);
    setError("");
    try {
      const parsed = await parseExcelFile(f);
      if (which.startsWith("فائل 1")) {
        setFile1(f);
        setData1(parsed);
      } else {
        setFile2(f);
        setData2(parsed);
      }
      if (parsed.rows.length === 0) {
        setError("فائل میں کوئی ڈیٹا نہیں ملا — ہیڈر چیک کریں");
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  const handleClear = () => {
    setFile1(null); setFile2(null); setData1(null); setData2(null); setError("");
  };

  // Run comparison
  const diffs = useMemo(() => {
    if (!data1?.rows?.length || !data2?.rows?.length) return [];
    const map1 = groupByKhata(data1.rows, unit1);
    const map2 = groupByKhata(data2.rows, unit2);
    return compareKhatas(map1, map2);
  }, [data1, data2, unit1, unit2]);

  const summary = useMemo(() => {
    if (!diffs.length) return null;
    return {
      total: diffs.length,
      modified: diffs.filter(d => d.type === "modified").length,
      added: diffs.filter(d => d.type === "added").length,
      removed: diffs.filter(d => d.type === "removed").length,
      unchanged: diffs.filter(d => d.type === "unchanged").length,
    };
  }, [diffs]);

  const filteredDiffs = useMemo(() => {
    if (filter === "all") return diffs;
    return diffs.filter(d => d.type === filter);
  }, [diffs, filter]);

  const canCompare = data1?.rows?.length > 0 && data2?.rows?.length > 0 && !loading;

  return (
    <div className="space-y-4">
      {/* Info banner — comparison base */}
      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl p-2.5">
        <Info className="w-4 h-4 text-blue-600 shrink-0" />
        <p className="text-[11px] text-blue-700" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
          موازنہ <span className="font-bold">کھاتہ نمبر</span> کے حساب سے کیا جاتا ہے — نام، رقبہ، خسرہ، اور موگہ کی تبدیلیاں ہر کھاتہ کے مقابلے میں ظاہر کی جاتی ہیں۔
        </p>
      </div>

      {/* Upload section */}
      <div className="bg-white rounded-2xl shadow border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <GitCompareArrows className="w-5 h-5 text-amber-600" />
          <h3 className="text-sm font-bold text-slate-800" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
            دو فارم 1 رجسٹر فائلیں اپ لوڈ کریں
          </h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-2">
            <FileUploadBox label="فائل 1 — File 1 (پرانا)" file={file1} onFile={handleFile} fileData={data1} accent="amber" />
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
              <span className="text-[10px] font-bold text-amber-700 whitespace-nowrap" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>رقبہ کی اکائی:</span>
              <button onClick={() => setUnit1("kanal")} className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${unit1 === "kanal" ? "bg-amber-600 text-white" : "bg-white text-amber-700 border border-amber-300"}`} style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>کنال</button>
              <button onClick={() => setUnit1("acres")} className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${unit1 === "acres" ? "bg-amber-600 text-white" : "bg-white text-amber-700 border border-amber-300"}`} style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>ایکڑ (×8)</button>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <FileUploadBox label="فائل 2 — File 2 (نیا)" file={file2} onFile={handleFile} fileData={data2} accent="blue" />
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5">
              <span className="text-[10px] font-bold text-blue-700 whitespace-nowrap" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>رقبہ کی اکائی:</span>
              <button onClick={() => setUnit2("kanal")} className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${unit2 === "kanal" ? "bg-blue-600 text-white" : "bg-white text-blue-700 border border-blue-300"}`} style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>کنال</button>
              <button onClick={() => setUnit2("acres")} className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${unit2 === "acres" ? "bg-blue-600 text-white" : "bg-white text-blue-700 border border-blue-300"}`} style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>ایکڑ (×8)</button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="text-xs text-rose-700">{error}</span>
          </div>
        )}

        {loading && (
          <div className="mt-3 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">فائل پڑھی جا رہی ہے...</span>
          </div>
        )}

        {(file1 || file2) && (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleClear}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors"
            >
              <X className="w-3.5 h-3.5" /> صاف کریں
            </button>
            {canCompare && diffs.length > 0 && (
              <button
                onClick={() => downloadDiffCSV(diffs)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> CSV رپورٹ ڈاؤن لوڈ
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <p className="text-[10px] text-slate-500" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>کل کھاتے</p>
            <p className="text-xl font-bold text-slate-800">{summary.total}</p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-3 text-center">
            <p className="text-[10px] text-amber-600" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>تبدیلی</p>
            <p className="text-xl font-bold text-amber-700">{summary.modified}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3 text-center">
            <p className="text-[10px] text-emerald-600" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>نئی</p>
            <p className="text-xl font-bold text-emerald-700">{summary.added}</p>
          </div>
          <div className="bg-rose-50 rounded-xl border border-rose-200 p-3 text-center">
            <p className="text-[10px] text-rose-600" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>حذف شدہ</p>
            <p className="text-xl font-bold text-rose-700">{summary.removed}</p>
          </div>
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-center">
            <p className="text-[10px] text-slate-500" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>بدلا نہیں</p>
            <p className="text-xl font-bold text-slate-600">{summary.unchanged}</p>
          </div>
        </div>
      )}

      {/* Filter buttons */}
      {summary && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { key: "all", label: "تمام", active: "bg-slate-600 text-white", inactive: "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50" },
            { key: "modified", label: "تبدیلی", active: "bg-amber-600 text-white", inactive: "bg-white text-amber-600 border border-amber-200 hover:bg-amber-50" },
            { key: "added", label: "نئی", active: "bg-emerald-600 text-white", inactive: "bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50" },
            { key: "removed", label: "حذف شدہ", active: "bg-rose-600 text-white", inactive: "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50" },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === f.key ? f.active : f.inactive
              }`}
              style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Detailed diff table */}
      {filteredDiffs.length > 0 && (
        <div className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[800px]" dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', Arial, sans-serif" }}>
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="border border-slate-300 px-2 py-2 text-right">کھاتہ نمبر</th>
                  <th className="border border-slate-300 px-2 py-2 text-right">حالت</th>
                  <th className="border border-slate-300 px-2 py-2 text-right">نام (پرانا)</th>
                  <th className="border border-slate-300 px-2 py-2 text-right">نام (نیا)</th>
                  <th className="border border-slate-300 px-2 py-2 text-center">رقبہ (پرانا)</th>
                  <th className="border border-slate-300 px-2 py-2 text-center">رقبہ (نیا)</th>
                  <th className="border border-slate-300 px-2 py-2 text-center">خسرہ (پرانا)</th>
                  <th className="border border-slate-300 px-2 py-2 text-center">خسرہ (نیا)</th>
                  <th className="border border-slate-300 px-2 py-2 text-center">موگہ (پرانا)</th>
                  <th className="border border-slate-300 px-2 py-2 text-center">موگہ (نیا)</th>
                </tr>
              </thead>
              <tbody>
                {filteredDiffs.map((d, i) => {
                  const typeInfo = {
                    modified: { icon: Edit3, label: "تبدیلی", class: "bg-amber-100 text-amber-700 border-amber-300" },
                    added: { icon: Plus, label: "نئی", class: "bg-emerald-100 text-emerald-700 border-emerald-300" },
                    removed: { icon: Minus, label: "حذف شدہ", class: "bg-rose-100 text-rose-700 border-rose-300" },
                    unchanged: { icon: CheckCircle2, label: "بدلا نہیں", class: "bg-slate-100 text-slate-500 border-slate-300" },
                  }[d.type];
                  const Icon = typeInfo.icon;
                  return (
                    <tr key={i} className={d.type === "unchanged" ? "opacity-50" : ""}>
                      <td className="border border-slate-300 px-2 py-1.5 font-bold text-slate-800 font-mono text-center">
                        {d.khata_no}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeInfo.class}`}>
                          <Icon className="w-3 h-3" />
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-right">
                        {d.old ? [...d.old.names].join("؛ ") || "—": "—"}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-right">
                        <div className="relative">
                          <HighlightCell
                            value={d.new ? [...d.new.names].join("؛ ") : ""}
                            prevValue={d.old ? [...d.old.names].join("؛ ") : ""}
                            isChanged={d.changes.includes("name")}
                            highlightClass="bg-blue-100 text-blue-800 border-blue-400"
                          />
                          {d.changes.includes("name") && (
                            <span className="absolute -top-1 -left-1 px-1 py-0.5 rounded-full bg-blue-600 text-white text-[8px] font-bold leading-none" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
                              نام بدلا
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center font-mono">
                        {d.old ? `${d.old.kanal} ک ${d.old.marla} م` : "—"}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center">
                        <HighlightCell
                          value={d.new ? `${d.new.kanal} ک ${d.new.marla} م` : ""}
                          prevValue={d.old ? `${d.old.kanal} ک ${d.old.marla} م` : ""}
                          isChanged={d.changes.includes("raqba")}
                        />
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center text-[10px]">
                        {d.old ? [...d.old.khasra].join("،") || "—" : "—"}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center">
                        <HighlightCell
                          value={d.new ? [...d.new.khasra].join("،") : ""}
                          prevValue={d.old ? [...d.old.khasra].join("،") : ""}
                          isChanged={d.changes.includes("khasra")}
                          highlightClass="bg-orange-100 text-orange-700"
                        />
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center font-mono">
                        {d.old ? [...d.old.moga].join("،") || "—" : "—"}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center">
                        <HighlightCell
                          value={d.new ? [...d.new.moga].join("،") : ""}
                          prevValue={d.old ? [...d.old.moga].join("،") : ""}
                          isChanged={d.changes.includes("moga")}
                          highlightClass="bg-purple-100 text-purple-700"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && (!file1 || !file2) && (
        <div className="text-center py-10 text-slate-400">
          <GitCompareArrows className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
            دو فارم 1 رجسٹر فائلیں اپ لوڈ کریں — کھاتہ نمبر کے حساب سے تبدیلیاں ظاہر ہوں گی
          </p>
          <div className="mt-4 max-w-md mx-auto bg-slate-50 rounded-xl p-3 text-right">
            <p className="text-[11px] font-bold text-slate-600 mb-1" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>کالم جو خودکار طور پر پہچانے جاتے ہیں:</p>
            <p className="text-[10px] text-slate-500 leading-relaxed" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
              کھاتہ نمبر، نام مالک، ولدیت، شناختی کارڈ، کنال، مرلہ، خسرہ بندوبست، موگہ، مستطیل، کیلہ، راجباہ، کیفیت
            </p>
          </div>
        </div>
      )}
    </div>
  );
}