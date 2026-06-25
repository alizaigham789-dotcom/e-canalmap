import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Printer } from "lucide-react";

// Exact header fields for the Parat Warabandi official form
const HEADER_FIELDS = [
  { key: "mouza", label: "موضع", placeholder: "راجڑ" },
  { key: "section", label: "سیکشن", placeholder: "خوشاب" },
  { key: "canal", label: "کینال", placeholder: "جوہرآباد" },
  { key: "sub_division", label: "سب ڈویژن", placeholder: "خوشاب" },
  { key: "rajbaha", label: "راجباہ", placeholder: "73780/R" },
  { key: "mogha_number", label: "موگہ نمبری", placeholder: "نمبر درج کریں" },
];

const emptyRow = (i) => ({
  khatoni: "", owner_name: "", total_area: "", ghair_mumkin: "", khalis_raqba: "", waari_raqba: "", zaidah: "", wazgi: "", khalis_waari: "", nikha: "",
  waari_din_ghante: "", waari_din_minute: "", waari_raat_ghante: "", waari_raat_minute: "",
  // right side (repeating shareholders)
  khatoni2: "", owner_name2: "", total_area2: "", khalis_waari2: "", nikha2: "",
  waari_din_ghante2: "", waari_din_minute2: "", waari_raat_ghante2: "", waari_raat_minute2: "",
});

export default function WarabandiParatForm({ onBack }) {
  const [header, setHeader] = useState({
    mouza: "راجڑ", section: "خوشاب", canal: "جوہرآباد",
    sub_division: "خوشاب", rajbaha: "73780/R", mogha_number: "",
  });
  const [rows, setRows] = useState(() => Array.from({ length: 5 }, (_, i) => emptyRow(i + 1)));
  const [showPrint, setShowPrint] = useState(false);

  const updateHeader = (key, val) => setHeader(prev => ({ ...prev, [key]: val }));
  const updateRow = (i, key, val) => {
    const next = [...rows];
    next[i] = { ...next[i], [key]: val };
    setRows(next);
  };
  const addRow = () => setRows(prev => [...prev, emptyRow(prev.length + 1)]);
  const removeRow = (i) => setRows(prev => prev.filter((_, idx) => idx !== i));

  const headerLine = `پرت وارہ بندی موگہ نمبری ${header.mogha_number || "___"} راجباہ ${header.rajbaha || "___"} ، ڈھاک موضع ${header.mouza || "___"} سیکشن ${header.section || "___"} ، ${header.canal || "___"} کینال سب ڈویژن ${header.sub_division || "___"}`;

  const inputCls = "w-full bg-transparent outline-none text-[10px] text-slate-800 text-center px-0.5 py-0.5 placeholder:text-slate-300";
  const thCls = "border border-slate-500 text-center bg-slate-100 px-0.5 py-0.5 text-[9px] font-bold leading-tight";
  const tdCls = "border border-slate-300 text-center px-0 py-0 text-[10px]";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Screen Header — input boxes */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-800 font-heading">پرت وارہ بندی — نیا ریکارڈ</h3>
          <Button size="sm" onClick={() => setShowPrint(true)} className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1">
            <Printer className="w-3 h-3" /> پرنٹ
          </Button>
        </div>
        {/* Header fields in box form */}
        <div dir="rtl" className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {HEADER_FIELDS.map(f => (
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
        {/* Live header preview */}
        <div dir="rtl" className="mt-3 p-2 bg-white border border-dashed border-slate-300 rounded text-center text-[11px] text-slate-700"
          style={{ fontFamily: "'Noto Nastaliq Urdu', serif", lineHeight: 2 }}>
          {headerLine}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-white">
          <span className="text-[10px] text-slate-500 font-semibold">تفصیل حصہ داران</span>
          <Button size="sm" onClick={addRow} className="h-6 text-[10px] bg-blue-600 hover:bg-blue-700 text-white gap-1 px-2">
            <Plus className="w-3 h-3" /> قطار
          </Button>
        </div>

        <table style={{ borderCollapse: "collapse", minWidth: "1400px", width: "100%", direction: "rtl" }}>
          <thead>
            {/* Row 1 — main column groups */}
            <tr style={{ backgroundColor: "#e8f0fe" }}>
              <th className={thCls} rowSpan={2}>کھاتہ نمبر</th>
              <th className={thCls} rowSpan={2}>نام مالک معہ والدیت</th>
              <th className={thCls} rowSpan={2}>نمبران بندوبست</th>
              <th className={thCls} rowSpan={2}>کل رقبہ</th>
              <th className={thCls} rowSpan={2}>غیر ممکن رقبہ</th>
              <th className={thCls} rowSpan={2}>خالص رقبہ</th>
              <th className={thCls} rowSpan={2}>واری بحساب رقبہ</th>
              <th className={thCls} rowSpan={2}>زائدہ وصولی</th>
              <th className={thCls} rowSpan={2}>وضگی</th>
              <th className={thCls} rowSpan={2}>خالص واری</th>
              <th className={thCls} rowSpan={2}>نکہ جات</th>
              <th className={thCls} colSpan={2}>تشریح اوقات دن</th>
              <th className={thCls} colSpan={2}>تشریح اوقات رات</th>
              {/* right section */}
              <th className={thCls} rowSpan={2}>کھاتہ نمبر</th>
              <th className={thCls} rowSpan={2}>نام مالک معہ والدیت</th>
              <th className={thCls} rowSpan={2}>کل رقبہ</th>
              <th className={thCls} rowSpan={2}>خالص واری</th>
              <th className={thCls} rowSpan={2}>نکہ جات</th>
              <th className={thCls} colSpan={2}>تشریح اوقات دن</th>
              <th className={thCls} colSpan={2}>تشریح اوقات رات</th>
              <th className={thCls} rowSpan={2} style={{ width: 24 }}></th>
            </tr>
            {/* Row 2 — sub-options */}
            <tr style={{ backgroundColor: "#f0f4ff" }}>
              <th className={thCls}>گھنٹے</th>
              <th className={thCls}>منٹ</th>
              <th className={thCls}>گھنٹے</th>
              <th className={thCls}>منٹ</th>
              {/* right section sub */}
              <th className={thCls}>گھنٹے</th>
              <th className={thCls}>منٹ</th>
              <th className={thCls}>گھنٹے</th>
              <th className={thCls}>منٹ</th>
              <th className={thCls} style={{ width: 24 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-blue-50/20">
                <td className={tdCls}><input value={row.khatoni} onChange={e => updateRow(i, "khatoni", e.target.value)} className={inputCls} /></td>
                <td className={tdCls} style={{ minWidth: 90 }}><input value={row.owner_name} onChange={e => updateRow(i, "owner_name", e.target.value)} className={inputCls} dir="rtl" /></td>
                <td className={tdCls}><input value={row.bandubast} onChange={e => updateRow(i, "bandubast", e.target.value)} className={inputCls} /></td>
                <td className={tdCls}><input value={row.total_area} onChange={e => updateRow(i, "total_area", e.target.value)} className={inputCls} type="number" /></td>
                <td className={tdCls}><input value={row.ghair_mumkin} onChange={e => updateRow(i, "ghair_mumkin", e.target.value)} className={inputCls} type="number" /></td>
                <td className={tdCls}><input value={row.khalis_raqba} onChange={e => updateRow(i, "khalis_raqba", e.target.value)} className={inputCls} type="number" /></td>
                <td className={tdCls}><input value={row.waari_raqba} onChange={e => updateRow(i, "waari_raqba", e.target.value)} className={inputCls} /></td>
                <td className={tdCls}><input value={row.zaidah} onChange={e => updateRow(i, "zaidah", e.target.value)} className={inputCls} /></td>
                <td className={tdCls}><input value={row.wazgi} onChange={e => updateRow(i, "wazgi", e.target.value)} className={inputCls} /></td>
                <td className={tdCls}><input value={row.khalis_waari} onChange={e => updateRow(i, "khalis_waari", e.target.value)} className={inputCls} /></td>
                <td className={tdCls}><input value={row.nikha} onChange={e => updateRow(i, "nikha", e.target.value)} className={inputCls} /></td>
                <td className={tdCls}><input value={row.waari_din_ghante} onChange={e => updateRow(i, "waari_din_ghante", e.target.value)} className={inputCls} type="number" /></td>
                <td className={tdCls}><input value={row.waari_din_minute} onChange={e => updateRow(i, "waari_din_minute", e.target.value)} className={inputCls} type="number" /></td>
                <td className={tdCls}><input value={row.waari_raat_ghante} onChange={e => updateRow(i, "waari_raat_ghante", e.target.value)} className={inputCls} type="number" /></td>
                <td className={tdCls}><input value={row.waari_raat_minute} onChange={e => updateRow(i, "waari_raat_minute", e.target.value)} className={inputCls} type="number" /></td>
                {/* right section */}
                <td className={tdCls}><input value={row.khatoni2} onChange={e => updateRow(i, "khatoni2", e.target.value)} className={inputCls} /></td>
                <td className={tdCls} style={{ minWidth: 80 }}><input value={row.owner_name2} onChange={e => updateRow(i, "owner_name2", e.target.value)} className={inputCls} dir="rtl" /></td>
                <td className={tdCls}><input value={row.total_area2} onChange={e => updateRow(i, "total_area2", e.target.value)} className={inputCls} type="number" /></td>
                <td className={tdCls}><input value={row.khalis_waari2} onChange={e => updateRow(i, "khalis_waari2", e.target.value)} className={inputCls} /></td>
                <td className={tdCls}><input value={row.nikha2} onChange={e => updateRow(i, "nikha2", e.target.value)} className={inputCls} /></td>
                <td className={tdCls}><input value={row.waari_din_ghante2} onChange={e => updateRow(i, "waari_din_ghante2", e.target.value)} className={inputCls} type="number" /></td>
                <td className={tdCls}><input value={row.waari_din_minute2} onChange={e => updateRow(i, "waari_din_minute2", e.target.value)} className={inputCls} type="number" /></td>
                <td className={tdCls}><input value={row.waari_raat_ghante2} onChange={e => updateRow(i, "waari_raat_ghante2", e.target.value)} className={inputCls} type="number" /></td>
                <td className={tdCls}><input value={row.waari_raat_minute2} onChange={e => updateRow(i, "waari_raat_minute2", e.target.value)} className={inputCls} type="number" /></td>
                <td className={tdCls} style={{ width: 24 }}>
                  <button onClick={() => removeRow(i)} className="text-slate-300 hover:text-red-500 p-0.5">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Print Modal */}
      {showPrint && (
        <PrintModal header={header} headerLine={headerLine} rows={rows} onClose={() => setShowPrint(false)} />
      )}
    </div>
  );
}

function PrintModal({ header, headerLine, rows, onClose }) {
  const thP = { border: "1.5px solid #333", padding: "3px 4px", textAlign: "center", backgroundColor: "#e8e8e8", fontSize: "9px", fontWeight: "bold" };
  const tdP = { border: "1.5px solid #555", padding: "2px 3px", textAlign: "center", fontSize: "9px" };

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=1200,height=800");
    const content = document.getElementById("parat-print-content").innerHTML;
    w.document.write(`<!DOCTYPE html><html><head><title>پرت وارہ بندی</title>
    <style>
      @page { size: A4 landscape; margin: 8mm; }
      body { font-family: 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif; margin:0; padding:10px; direction:rtl; color:#000; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1.5px solid #333; padding: 2px 3px; text-align: center; font-size: 8px; }
      th { background: #e8e8e8; font-weight: bold; }
      .header-title { text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 8px; }
      .header-line { text-align: center; font-size: 12px; margin-bottom: 12px; border-bottom: 2px solid #333; padding-bottom: 6px; }
    </style>
    </head><body>${content}</body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-auto py-6">
      <div className="bg-white rounded-xl shadow-2xl max-w-[1200px] w-full mx-4">
        <div className="flex items-center justify-between px-5 py-3 border-b bg-slate-50 rounded-t-xl">
          <h3 className="text-sm font-bold text-slate-800">Print Preview — پرت وارہ بندی</h3>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">🖨 Print / PDF</button>
            <button onClick={onClose} className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs rounded-lg hover:bg-slate-300">بند کریں</button>
          </div>
        </div>

        <div id="parat-print-content" className="p-6" style={{ direction: "rtl", fontFamily: "'Noto Nastaliq Urdu', serif" }}>
          {/* Title */}
          <div style={{ textAlign: "center", fontSize: "15px", fontWeight: "bold", marginBottom: "6px" }}>
            {headerLine}
          </div>
          <div style={{ textAlign: "center", fontSize: "11px", marginBottom: "12px", borderBottom: "2px solid #333", paddingBottom: "6px" }}>
            پرت وارہ بندی — {header.mouza || ""} — {header.canal || ""} کینال — {header.sub_division || ""} سب ڈویژن
          </div>

          {/* Main Table */}
          <table style={{ borderCollapse: "collapse", width: "100%", direction: "rtl" }}>
            <thead>
              <tr>
                <th style={thP} rowSpan={2}>کھاتہ نمبر</th>
                <th style={{ ...thP, minWidth: 80 }} rowSpan={2}>نام مالک معہ والدیت</th>
                <th style={thP} rowSpan={2}>نمبران بندوبست</th>
                <th style={thP} rowSpan={2}>کل رقبہ</th>
                <th style={thP} rowSpan={2}>غیر ممکن رقبہ</th>
                <th style={thP} rowSpan={2}>خالص رقبہ</th>
                <th style={thP} rowSpan={2}>واری بحساب رقبہ</th>
                <th style={thP} rowSpan={2}>زائدہ وصولی</th>
                <th style={thP} rowSpan={2}>وضگی</th>
                <th style={thP} rowSpan={2}>خالص واری</th>
                <th style={thP} rowSpan={2}>نکہ جات</th>
                <th style={thP} colSpan={2}>تشریح اوقات دن</th>
                <th style={thP} colSpan={2}>تشریح اوقات رات</th>
                <th style={thP} rowSpan={2}>کھاتہ نمبر</th>
                <th style={{ ...thP, minWidth: 70 }} rowSpan={2}>نام مالک معہ والدیت</th>
                <th style={thP} rowSpan={2}>کل رقبہ</th>
                <th style={thP} rowSpan={2}>خالص واری</th>
                <th style={thP} rowSpan={2}>نکہ جات</th>
                <th style={thP} colSpan={2}>تشریح اوقات دن</th>
                <th style={thP} colSpan={2}>تشریح اوقات رات</th>
              </tr>
              <tr>
                <th style={thP}>گھنٹے</th><th style={thP}>منٹ</th>
                <th style={thP}>گھنٹے</th><th style={thP}>منٹ</th>
                <th style={thP}>گھنٹے</th><th style={thP}>منٹ</th>
                <th style={thP}>گھنٹے</th><th style={thP}>منٹ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td style={tdP}>{row.khatoni || ""}</td>
                  <td style={{ ...tdP, textAlign: "right" }}>{row.owner_name || ""}</td>
                  <td style={tdP}>{row.bandubast || ""}</td>
                  <td style={tdP}>{row.total_area || ""}</td>
                  <td style={tdP}>{row.ghair_mumkin || ""}</td>
                  <td style={tdP}>{row.khalis_raqba || ""}</td>
                  <td style={tdP}>{row.waari_raqba || ""}</td>
                  <td style={tdP}>{row.zaidah || ""}</td>
                  <td style={tdP}>{row.wazgi || ""}</td>
                  <td style={tdP}>{row.khalis_waari || ""}</td>
                  <td style={tdP}>{row.nikha || ""}</td>
                  <td style={tdP}>{row.waari_din_ghante || ""}</td>
                  <td style={tdP}>{row.waari_din_minute || ""}</td>
                  <td style={tdP}>{row.waari_raat_ghante || ""}</td>
                  <td style={tdP}>{row.waari_raat_minute || ""}</td>
                  <td style={tdP}>{row.khatoni2 || ""}</td>
                  <td style={{ ...tdP, textAlign: "right" }}>{row.owner_name2 || ""}</td>
                  <td style={tdP}>{row.total_area2 || ""}</td>
                  <td style={tdP}>{row.khalis_waari2 || ""}</td>
                  <td style={tdP}>{row.nikha2 || ""}</td>
                  <td style={tdP}>{row.waari_din_ghante2 || ""}</td>
                  <td style={tdP}>{row.waari_din_minute2 || ""}</td>
                  <td style={tdP}>{row.waari_raat_ghante2 || ""}</td>
                  <td style={tdP}>{row.waari_raat_minute2 || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Signatures */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "28px", fontSize: "11px" }}>
            <div style={{ textAlign: "center", borderTop: "1px solid #333", paddingTop: "4px", minWidth: "120px" }}>دستخط نہری نگران</div>
            <div style={{ textAlign: "center", borderTop: "1px solid #333", paddingTop: "4px", minWidth: "120px" }}>دستخط ملہدار</div>
            <div style={{ textAlign: "center", borderTop: "1px solid #333", paddingTop: "4px", minWidth: "120px" }}>دستخط ذیلدار</div>
          </div>
        </div>
      </div>
    </div>
  );
}