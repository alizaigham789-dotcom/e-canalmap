import React, { useState } from "react";
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
  sr: "",
  // summary section (left side)
  khatoni2: "", owner_name2: "", total_area2: "",
  khalis_waari2_minute: "", khalis_waari2_ghante: "",
  nikha2_lega: "", nikha2_dega: "",
  // main detail section
  khatoni: "", owner_name: "", bandubast: "", total_area: "", ghair_mumkin: "", khalis_raqba: "",
  waari_minute: "", waari_ghante: "",
  zaidah_minute: "", zaidah_ghante: "",
  wazgi_minute: "", wazgi_ghante: "",
  khalis_waari_minute: "", khalis_waari_ghante: "",
  nikha_lega: "", nikha_dega: "",
  tashreeh_din: "",
  tashreeh_raat: "",
});

// numeric cols for totalling
const NUM_COLS = [
  "total_area2", "khalis_waari2_minute", "khalis_waari2_ghante",
  "total_area", "ghair_mumkin", "khalis_raqba",
  "waari_minute", "waari_ghante",
  "zaidah_minute", "zaidah_ghante",
  "wazgi_minute", "wazgi_ghante",
  "khalis_waari_minute", "khalis_waari_ghante",
];

function sumCol(rows, key) {
  const s = rows.reduce((acc, r) => acc + (parseFloat(r[key]) || 0), 0);
  return s === 0 ? "-" : String(s % 1 === 0 ? s : s.toFixed(2));
}

function d(val) { return val || "-"; }

export default function WarabandiParatForm() {
  const [docType, setDocType] = useState("پرت وارہ بندی");
  const [header, setHeader] = useState({
    mogha_number: "18650",
    mogha_side: "R",
    rajbaha: "پیلو مائنر",
    mouza: "روڈہ",
    section: "گنجیال",
    sub_division: "قائد آباد",
    canal_division: "خوشاب",
  });
  const [rows, setRows] = useState(() => Array.from({ length: 5 }, emptyRow));
  const [notes, setNotes] = useState([...DEFAULT_NOTES]);
  const [showPrint, setShowPrint] = useState(false);
  const [showRowSr, setShowRowSr] = useState(true);
  const [showColSr, setShowColSr] = useState(true);
  const [printRowSr, setPrintRowSr] = useState(false);
  const [printColSr, setPrintColSr] = useState(false);

  const updateHeader = (key, val) => setHeader(prev => ({ ...prev, [key]: val }));

  const updateRow = (i, key, val) => {
    const next = [...rows];
    next[i] = { ...next[i], [key]: val };
    // auto-copy total_area → total_area2
    if (key === "total_area") next[i].total_area2 = val;
    setRows(next);
  };

  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = (i) => setRows(prev => prev.filter((_, idx) => idx !== i));

  const updateNote = (i, val) => setNotes(prev => { const n = [...prev]; n[i] = val; return n; });
  const addNote = () => setNotes(prev => [...prev, ""]);
  const removeNote = (i) => setNotes(prev => prev.filter((_, idx) => idx !== i));

  const moghaFull = `${header.mogha_side}/${header.mogha_number}`;
  const headerLine = `${docType} موگہ نمبری ${moghaFull} راجباہ ${header.rajbaha || "___"} موضع ${header.mouza || "___"} سیکشن ${header.section || "___"} ، سب ڈویژن ${header.sub_division || "___"} کینال ڈویژن ${header.canal_division || "___"}`;

  const inputCls = "w-full bg-transparent outline-none text-[10px] text-slate-800 text-center px-0.5 py-0.5 placeholder:text-slate-300";
  const thCls = "border border-slate-500 text-center bg-slate-100 px-0.5 py-0.5 text-[9px] font-bold leading-tight";
  const tdCls = "border border-slate-300 text-center px-0 py-0 text-[10px]";
  const totalCls = "border border-slate-400 text-center px-0.5 py-1 text-[10px] font-bold bg-slate-100";

  // Column header serial letters (Urdu abjad style: ا ب ج ...)
  const colLetters = ["ا","ب","ج","د","ہ","و","ز","ح","ط","ی","ک","ل","م","ن","س","ع","ف","ص","ق","ر","ش","ت","ث","خ","ذ","ض","ظ","غ"];
  // Number of data cols (excluding sr/delete)
  // summary: khatoni2, owner2, total_area2, khalis_waari2(2), nikha2(2) = 7
  // main: khatoni, owner, bandubast, total_area, ghair_mumkin, khalis_raqba, waari(2), zaidah(2), wazgi(2), khalis_waari(2), nikha(2), tashreeh_din, tashreeh_raat = 17
  // total cols = 24

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Screen Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <select
            value={docType}
            onChange={e => setDocType(e.target.value)}
            dir="rtl"
            className="border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-400 font-semibold"
            style={{ fontFamily: "serif" }}
          >
            <option value="پرت وارہ بندی">پرت وارہ بندی</option>
            <option value="کیس ترمیم وارہ بندی">کیس ترمیم وارہ بندی</option>
          </select>
          <div className="flex gap-2 items-center">
            {/* S.No print toggles */}
            <label className="flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer">
              <input type="checkbox" checked={printRowSr} onChange={e => setPrintRowSr(e.target.checked)} className="w-3 h-3" />
              پرنٹ قطار نمبر
            </label>
            <label className="flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer">
              <input type="checkbox" checked={printColSr} onChange={e => setPrintColSr(e.target.checked)} className="w-3 h-3" />
              پرنٹ کالم نمبر
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
              <input
                value={header.mogha_number}
                onChange={e => updateHeader("mogha_number", e.target.value)}
                placeholder="18650"
                dir="ltr"
                className="border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-400 flex-1 min-w-0"
              />
              <select
                value={header.mogha_side}
                onChange={e => updateHeader("mogha_side", e.target.value)}
                className="border border-slate-300 rounded px-1 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-400 w-14"
              >
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
              <input
                value={header[f.key]}
                onChange={e => updateHeader(f.key, e.target.value)}
                placeholder={f.placeholder}
                dir="rtl"
                className="border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-400"
                style={{ fontFamily: "serif" }}
              />
            </div>
          ))}
        </div>

        <div dir="rtl" className="mt-3 p-2 bg-white border border-dashed border-slate-300 rounded text-center text-[11px] text-slate-700"
          style={{ fontFamily: "'Noto Nastaliq Urdu', serif", lineHeight: 2 }}>
          {headerLine}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-white">
          <span className="text-[10px] text-slate-500 font-semibold">تفصیل حصہ داران</span>
          <div className="flex gap-2 items-center">
            <label className="flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer">
              <input type="checkbox" checked={showRowSr} onChange={e => setShowRowSr(e.target.checked)} className="w-3 h-3" />
              قطار نمبر
            </label>
            <label className="flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer">
              <input type="checkbox" checked={showColSr} onChange={e => setShowColSr(e.target.checked)} className="w-3 h-3" />
              کالم نمبر
            </label>
            <Button size="sm" onClick={addRow} className="h-6 text-[10px] bg-blue-600 hover:bg-blue-700 text-white gap-1 px-2">
              <Plus className="w-3 h-3" /> قطار
            </Button>
          </div>
        </div>

        <table style={{ borderCollapse: "collapse", minWidth: "1700px", width: "100%", direction: "rtl" }}>
          <thead>
            {/* Column serial row */}
            {showColSr && (
              <tr style={{ backgroundColor: "#f8f8f8" }}>
                {showRowSr && <th className={thCls} style={{ fontSize: "8px", color: "#888" }}>#</th>}
                {/* summary cols: 7 */}
                {["ا","ب","ج","د","ہ","و","ز"].map((l,i) => <th key={i} className={thCls} style={{ fontSize: "8px", color: "#888" }}>{l}</th>)}
                {/* main cols: 17 */}
                {["ح","ط","ی","ک","ل","م","ن","س","ع","ف","ص","ق","ر","ش","ت","ث","خ"].map((l,i) => <th key={i} className={thCls} style={{ fontSize: "8px", color: "#888" }}>{l}</th>)}
                <th className={thCls} style={{ width: 24 }}></th>
              </tr>
            )}
            <tr style={{ backgroundColor: "#e8f0fe" }}>
              {showRowSr && <th className={thCls} rowSpan={2} style={{ fontSize: "8px", color: "#888" }}>نمبر</th>}
              {/* summary section */}
              <th className={thCls} rowSpan={2}>کھاتہ نمبر</th>
              <th className={thCls} rowSpan={2}>نام مالک معہ والدیت</th>
              <th className={thCls} rowSpan={2}>کل رقبہ</th>
              <th className={thCls} colSpan={2}>خالص واری</th>
              <th className={thCls} colSpan={2}>نکہ جات</th>
              {/* main section */}
              <th className={thCls} rowSpan={2}>کھاتہ نمبر</th>
              <th className={thCls} rowSpan={2}>نام مالک معہ والدیت</th>
              <th className={thCls} rowSpan={2}>نمبران بندوبست</th>
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
              <th className={thCls} rowSpan={2} style={{ width: 24 }}></th>
            </tr>
            <tr style={{ backgroundColor: "#f0f4ff" }}>
              <th className={thCls}>منٹ</th><th className={thCls}>گھنٹے</th>
              <th className={thCls}>لیگا</th><th className={thCls}>دیگا</th>
              <th className={thCls}>منٹ</th><th className={thCls}>گھنٹے</th>
              <th className={thCls}>منٹ</th><th className={thCls}>گھنٹے</th>
              <th className={thCls}>منٹ</th><th className={thCls}>گھنٹے</th>
              <th className={thCls}>منٹ</th><th className={thCls}>گھنٹے</th>
              <th className={thCls}>لیگا</th><th className={thCls}>دیگا</th>
              <th className={thCls} style={{ width: 24 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-blue-50/20">
                {showRowSr && <td className={tdCls} style={{ fontSize: "9px", color: "#888", minWidth: 22, textAlign: "center" }}>{i + 1}</td>}
                {/* summary */}
                <td className={tdCls}><input value={row.khatoni2} onChange={e => updateRow(i, "khatoni2", e.target.value)} className={inputCls} /></td>
                <td className={tdCls} style={{ minWidth: 80 }}><input value={row.owner_name2} onChange={e => updateRow(i, "owner_name2", e.target.value)} className={inputCls} dir="rtl" /></td>
                <td className={tdCls}><input value={row.total_area2} onChange={e => updateRow(i, "total_area2", e.target.value)} className={inputCls} type="number" /></td>
                <td className={tdCls}><input value={row.khalis_waari2_minute} onChange={e => updateRow(i, "khalis_waari2_minute", e.target.value)} className={inputCls} type="number" /></td>
                <td className={tdCls}><input value={row.khalis_waari2_ghante} onChange={e => updateRow(i, "khalis_waari2_ghante", e.target.value)} className={inputCls} type="number" /></td>
                <td className={tdCls}><input value={row.nikha2_lega} onChange={e => updateRow(i, "nikha2_lega", e.target.value)} className={inputCls} /></td>
                <td className={tdCls}><input value={row.nikha2_dega} onChange={e => updateRow(i, "nikha2_dega", e.target.value)} className={inputCls} /></td>
                {/* main */}
                <td className={tdCls}><input value={row.khatoni} onChange={e => updateRow(i, "khatoni", e.target.value)} className={inputCls} /></td>
                <td className={tdCls} style={{ minWidth: 90 }}><input value={row.owner_name} onChange={e => updateRow(i, "owner_name", e.target.value)} className={inputCls} dir="rtl" /></td>
                <td className={tdCls}><input value={row.bandubast} onChange={e => updateRow(i, "bandubast", e.target.value)} className={inputCls} /></td>
                <td className={tdCls}><input value={row.total_area} onChange={e => updateRow(i, "total_area", e.target.value)} className={inputCls} type="number" /></td>
                <td className={tdCls}><input value={row.ghair_mumkin} onChange={e => updateRow(i, "ghair_mumkin", e.target.value)} className={inputCls} type="number" /></td>
                <td className={tdCls}><input value={row.khalis_raqba} onChange={e => updateRow(i, "khalis_raqba", e.target.value)} className={inputCls} type="number" /></td>
                <td className={tdCls}><input value={row.waari_minute} onChange={e => updateRow(i, "waari_minute", e.target.value)} className={inputCls} type="number" /></td>
                <td className={tdCls}><input value={row.waari_ghante} onChange={e => updateRow(i, "waari_ghante", e.target.value)} className={inputCls} type="number" /></td>
                <td className={tdCls}><input value={row.zaidah_minute} onChange={e => updateRow(i, "zaidah_minute", e.target.value)} className={inputCls} type="number" /></td>
                <td className={tdCls}><input value={row.zaidah_ghante} onChange={e => updateRow(i, "zaidah_ghante", e.target.value)} className={inputCls} type="number" /></td>
                <td className={tdCls}><input value={row.wazgi_minute} onChange={e => updateRow(i, "wazgi_minute", e.target.value)} className={inputCls} type="number" /></td>
                <td className={tdCls}><input value={row.wazgi_ghante} onChange={e => updateRow(i, "wazgi_ghante", e.target.value)} className={inputCls} type="number" /></td>
                <td className={tdCls}><input value={row.khalis_waari_minute} onChange={e => updateRow(i, "khalis_waari_minute", e.target.value)} className={inputCls} type="number" /></td>
                <td className={tdCls}><input value={row.khalis_waari_ghante} onChange={e => updateRow(i, "khalis_waari_ghante", e.target.value)} className={inputCls} type="number" /></td>
                <td className={tdCls}><input value={row.nikha_lega} onChange={e => updateRow(i, "nikha_lega", e.target.value)} className={inputCls} /></td>
                <td className={tdCls}><input value={row.nikha_dega} onChange={e => updateRow(i, "nikha_dega", e.target.value)} className={inputCls} /></td>
                <td className={tdCls}><input value={row.tashreeh_din} onChange={e => updateRow(i, "tashreeh_din", e.target.value)} className={inputCls} /></td>
                <td className={tdCls}><input value={row.tashreeh_raat} onChange={e => updateRow(i, "tashreeh_raat", e.target.value)} className={inputCls} /></td>
                <td className={tdCls} style={{ width: 24 }}>
                  <button onClick={() => removeRow(i)} className="text-slate-300 hover:text-red-500 p-0.5">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
            {/* میزان (totals) row */}
            <tr style={{ backgroundColor: "#fef9e7" }}>
              {showRowSr && <td className={totalCls} style={{ fontSize: "9px" }}>—</td>}
              {/* summary totals */}
              <td className={totalCls}>—</td>
              <td className={totalCls} style={{ minWidth: 80, fontFamily: "serif", fontSize: "10px" }}>میزان</td>
              <td className={totalCls}>{sumCol(rows, "total_area2")}</td>
              <td className={totalCls}>{sumCol(rows, "khalis_waari2_minute")}</td>
              <td className={totalCls}>{sumCol(rows, "khalis_waari2_ghante")}</td>
              <td className={totalCls}>—</td>
              <td className={totalCls}>—</td>
              {/* main totals */}
              <td className={totalCls}>—</td>
              <td className={totalCls} style={{ minWidth: 90, fontFamily: "serif", fontSize: "10px" }}>میزان</td>
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
              <td className={totalCls} style={{ width: 24 }}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* جناب عالیٰ Notes Section */}
      <div className="border-t border-slate-200 px-4 py-4 bg-white" dir="rtl">
        <div className="flex items-start gap-4">
          {/* Notes list (takes most of the width) */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-500 font-semibold">نوٹس</span>
              <Button size="sm" onClick={addNote} className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1 px-2">
                <Plus className="w-3 h-3" /> نوٹ شامل کریں
              </Button>
            </div>
            <div className="space-y-1.5">
              {notes.map((note, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[10px] text-slate-600 mt-1.5 shrink-0" style={{ fontFamily: "serif" }}>{i + 1}-</span>
                  <textarea
                    value={note}
                    onChange={e => updateNote(i, e.target.value)}
                    rows={2}
                    dir="rtl"
                    className="flex-1 border border-slate-200 rounded px-2 py-1 text-[10px] text-slate-800 bg-white focus:outline-none focus:border-blue-400 resize-none"
                    style={{ fontFamily: "'Noto Nastaliq Urdu', serif", lineHeight: 1.8 }}
                  />
                  {notes.length > 1 && (
                    <button onClick={() => removeNote(i)} className="text-slate-300 hover:text-red-500 mt-1.5 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* جناب عالیٰ label — bottom-right corner */}
          <div className="shrink-0 flex flex-col items-center justify-end" style={{ minWidth: 80, alignSelf: "flex-end" }}>
            <div className="text-sm font-bold text-slate-800 border border-slate-300 rounded px-3 py-2 bg-slate-50"
              style={{ fontFamily: "'Noto Nastaliq Urdu', serif", lineHeight: 2 }}>
              جناب عالیٰ
            </div>
          </div>
        </div>
      </div>

      {showPrint && (
        <PrintModal
          docType={docType} header={header} headerLine={headerLine}
          rows={rows} notes={notes}
          printRowSr={printRowSr} printColSr={printColSr}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
}

function PrintModal({ docType, header, headerLine, rows, notes, printRowSr, printColSr, onClose }) {
  const thP = { border: "1.5px solid #333", padding: "3px 4px", textAlign: "center", backgroundColor: "#e8e8e8", fontSize: "8px", fontWeight: "bold" };
  const tdP = { border: "1.5px solid #555", padding: "2px 3px", textAlign: "center", fontSize: "8px" };
  const tdTotal = { border: "1.5px solid #333", padding: "2px 3px", textAlign: "center", fontSize: "8px", fontWeight: "bold", backgroundColor: "#fef9e7" };

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=1300,height=800");
    const content = document.getElementById("parat-print-content").innerHTML;
    w.document.write(`<!DOCTYPE html><html><head><title>${docType}</title>
    <style>
      @page { size: A4 landscape; margin: 8mm; }
      body { font-family: 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif; margin:0; padding:10px; direction:rtl; color:#000; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1.5px solid #333; padding: 2px 3px; text-align: center; font-size: 7.5px; }
      th { background: #e8e8e8; font-weight: bold; }
      .total-row td { background: #fef9e7; font-weight: bold; }
    </style>
    </head><body>${content}</body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 500);
  };

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
          <div style={{ textAlign: "center", fontSize: "14px", fontWeight: "bold", marginBottom: "10px", borderBottom: "2px solid #333", paddingBottom: "6px" }}>
            {headerLine}
          </div>

          <table style={{ borderCollapse: "collapse", width: "100%", direction: "rtl" }}>
            <thead>
              {printColSr && (
                <tr>
                  {printRowSr && <th style={{ ...thP, fontSize: "7px", color: "#888" }}>#</th>}
                  {["ا","ب","ج","د","ہ","و","ز","ح","ط","ی","ک","ل","م","ن","س","ع","ف","ص","ق","ر","ش","ت","ث","خ"].map((l,i) => (
                    <th key={i} style={{ ...thP, fontSize: "7px", color: "#888" }}>{l}</th>
                  ))}
                </tr>
              )}
              <tr>
                {printRowSr && <th style={thP} rowSpan={2}>نمبر</th>}
                <th style={thP} rowSpan={2}>کھاتہ نمبر</th>
                <th style={{ ...thP, minWidth: 70 }} rowSpan={2}>نام مالک معہ والدیت</th>
                <th style={thP} rowSpan={2}>کل رقبہ</th>
                <th style={thP} colSpan={2}>خالص واری</th>
                <th style={thP} colSpan={2}>نکہ جات</th>
                <th style={thP} rowSpan={2}>کھاتہ نمبر</th>
                <th style={{ ...thP, minWidth: 80 }} rowSpan={2}>نام مالک معہ والدیت</th>
                <th style={thP} rowSpan={2}>نمبران بندوبست</th>
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
              <tr>
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
                  <td style={tdP}>{d(row.nikha2_lega)}</td>
                  <td style={tdP}>{d(row.nikha2_dega)}</td>
                  <td style={tdP}>{d(row.khatoni)}</td>
                  <td style={{ ...tdP, textAlign: "right" }}>{d(row.owner_name)}</td>
                  <td style={tdP}>{d(row.bandubast)}</td>
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
                  <td style={tdP}>{d(row.nikha_lega)}</td>
                  <td style={tdP}>{d(row.nikha_dega)}</td>
                  <td style={tdP}>{d(row.tashreeh_din)}</td>
                  <td style={tdP}>{d(row.tashreeh_raat)}</td>
                </tr>
              ))}
              {/* میزان row */}
              <tr className="total-row">
                {printRowSr && <td style={tdTotal}>—</td>}
                <td style={tdTotal}>—</td>
                <td style={{ ...tdTotal, textAlign: "right" }}>میزان</td>
                <td style={tdTotal}>{sumCol(rows, "total_area2")}</td>
                <td style={tdTotal}>{sumCol(rows, "khalis_waari2_minute")}</td>
                <td style={tdTotal}>{sumCol(rows, "khalis_waari2_ghante")}</td>
                <td style={tdTotal}>—</td>
                <td style={tdTotal}>—</td>
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
                <td style={tdTotal}>—</td>
                <td style={tdTotal}>—</td>
                <td style={tdTotal}>—</td>
                <td style={tdTotal}>—</td>
              </tr>
            </tbody>
          </table>

          {/* Notes + جناب عالیٰ */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "20px", gap: "16px" }}>
            {/* Notes */}
            <div style={{ flex: 1, fontSize: "10px", lineHeight: 2, direction: "rtl", fontFamily: "'Noto Nastaliq Urdu', serif" }}>
              {notes.map((note, i) => (
                <div key={i} style={{ marginBottom: "4px" }}>{i + 1}- {note}</div>
              ))}
            </div>
            {/* جناب عالیٰ — bottom right corner */}
            <div style={{ textAlign: "center", fontSize: "13px", fontWeight: "bold", border: "1px solid #333", padding: "8px 16px", minWidth: "90px", fontFamily: "'Noto Nastaliq Urdu', serif", lineHeight: 2 }}>
              جناب عالیٰ
            </div>
          </div>

          {/* Signatures */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "28px", fontSize: "11px" }}>
            <div style={{ textAlign: "center", borderTop: "1px solid #333", paddingTop: "4px", minWidth: "140px" }}>دستخط نہری پٹواری</div>
            <div style={{ textAlign: "center", borderTop: "1px solid #333", paddingTop: "4px", minWidth: "140px" }}>دستخط ضلعدار</div>
            <div style={{ textAlign: "center", borderTop: "1px solid #333", paddingTop: "4px", minWidth: "200px" }}>دستخط سب ڈویژنل کینال آفیسر</div>
          </div>
        </div>
      </div>
    </div>
  );
}