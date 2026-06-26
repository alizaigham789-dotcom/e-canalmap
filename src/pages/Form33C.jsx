import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2, Printer, Upload, Camera, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => String(CURRENT_YEAR - i));

const emptyVillage = () => ({
  id: Date.now() + Math.random(),
  mouza: "",
  tehsil: "تاملہ آباد",
  total_bills: "",
  total_zar: "",
});

function calcSurcharge(zar) {
  const z = parseFloat(zar) || 0;
  return z > 0 ? (z * 0.1).toFixed(2) : "";
}

function calcTotal(zar) {
  const z = parseFloat(zar) || 0;
  const s = z * 0.1;
  return z > 0 ? (z + s).toFixed(2) : "";
}

// ─── 33-C Single Card ────────────────────────────────────────────────────────
function Form33CCard({ village, fasal, year, signatures, compact = false }) {
  const fontSize = compact ? "10px" : "13px";
  const titleSize = compact ? "14px" : "20px";
  const padding = compact ? "10px 14px" : "20px 28px";

  return (
    <div style={{
      fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif",
      direction: "rtl",
      border: "2px solid #000",
      padding,
      backgroundColor: "#fff",
      pageBreakInside: "avoid",
      width: "100%",
      boxSizing: "border-box",
    }}>
      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: "12px" }}>
        <span style={{ fontSize: titleSize, fontWeight: "bold", letterSpacing: "1px" }}>33-C</span>
        <span style={{ fontSize: titleSize, fontWeight: "bold", margin: "0 12px" }}>
          بابت فصل {fasal} {year}ء
        </span>
      </div>

      {/* Header row */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px", fontSize }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center", fontWeight: "bold" }}>نام موضع</th>
            <th style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center", fontWeight: "bold" }}>نام تحصیل</th>
            <th style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center", fontWeight: "bold" }}>کل پرنٹڈ بلز</th>
            <th style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center", fontWeight: "bold" }}>کل زر آبیانہ</th>
            <th style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center", fontWeight: "bold" }}>کل زر آبیانہ بمعہ ۱۰٪ سر چارج</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "center", fontSize }}>{village.mouza || "—"}</td>
            <td style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "center", fontSize }}>{village.tehsil || "—"}</td>
            <td style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "center", fontSize }}>{village.total_bills || "—"}</td>
            <td style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "center", fontSize }}>{village.total_zar || "—"}</td>
            <td style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "center", fontSize }}>{calcTotal(village.total_zar) || "—"}</td>
          </tr>
        </tbody>
      </table>

      {/* Signatures */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: compact ? "14px" : "28px", direction: "ltr" }}>
        <div style={{ textAlign: "center", minWidth: "140px" }}>
          {signatures.divisional_img && (
            <img src={signatures.divisional_img} alt="sig" style={{ height: compact ? "30px" : "50px", objectFit: "contain", display: "block", margin: "0 auto 2px" }} />
          )}
          <div style={{ borderTop: "1px solid #000", paddingTop: "4px", fontSize: compact ? "8px" : "10px" }}>
            <div style={{ fontWeight: "bold" }}>Divisional Canal Officer</div>
            <div>Khushab Canal Division</div>
            <div style={{ fontWeight: "bold" }}>KHUSHAB</div>
          </div>
        </div>
        <div style={{ textAlign: "center", minWidth: "140px" }}>
          {signatures.deputy_img && (
            <img src={signatures.deputy_img} alt="sig" style={{ height: compact ? "30px" : "50px", objectFit: "contain", display: "block", margin: "0 auto 2px" }} />
          )}
          <div style={{ borderTop: "1px solid #000", paddingTop: "4px", fontSize: compact ? "8px" : "10px" }}>
            <div style={{ fontWeight: "bold" }}>Deputy Collector</div>
            <div>Khushab Canal Division</div>
            <div>• Khushab</div>
          </div>
        </div>
        <div style={{ textAlign: "center", minWidth: "140px" }}>
          {signatures.clerk_img && (
            <img src={signatures.clerk_img} alt="sig" style={{ height: compact ? "30px" : "50px", objectFit: "contain", display: "block", margin: "0 auto 2px" }} />
          )}
          <div style={{ borderTop: "1px solid #000", paddingTop: "4px", fontSize: compact ? "8px" : "10px" }}>
            <div style={{ fontWeight: "bold", color: "#6b21a8" }}>Assessment Clerk</div>
            <div>Khushab Canal Division</div>
            <div>Khushab</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Signature Upload ─────────────────────────────────────────────────────────
function SigUpload({ label, value, onChange }) {
  const ref = useRef();
  const handleFile = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target.result);
    reader.readAsDataURL(file);
  };
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-[10px] font-semibold text-slate-600 text-center">{label}</div>
      <div onClick={() => ref.current.click()}
        className="w-28 h-14 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-400 bg-slate-50 overflow-hidden">
        {value
          ? <img src={value} alt="sig" className="max-h-full max-w-full object-contain" />
          : <Upload className="w-5 h-5 text-slate-300" />}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
      {value && <button onClick={() => onChange("")} className="text-[9px] text-red-400 hover:text-red-600">حذف</button>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Form33C() {
  const [fasal, setFasal] = useState("خریف");
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [orientation, setOrientation] = useState("landscape"); // "portrait" | "landscape"
  const [villages, setVillages] = useState([emptyVillage()]);
  const [signatures, setSignatures] = useState({ divisional_img: "", deputy_img: "", clerk_img: "" });
  const [pasteText, setPasteText] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState("");
  const scanFileRef = useRef();
  const printRef = useRef();

  const updateVillage = (id, key, val) => {
    setVillages(prev => prev.map(v => v.id === id ? { ...v, [key]: val } : v));
  };
  const addVillage = () => setVillages(prev => [...prev, emptyVillage()]);
  const removeVillage = (id) => setVillages(prev => prev.filter(v => v.id !== id));

  // Parse pasted Excel/tabular data: mouza \t tehsil \t bills \t zar  OR  mouza \t bills \t zar
  const handlePaste = () => {
    const lines = pasteText.trim().split("\n").filter(l => l.trim());
    if (!lines.length) return;
    const parsed = lines.map(line => {
      const cols = line.split(/\t/).map(c => c.trim());
      if (cols.length >= 4) {
        return { id: Date.now() + Math.random(), mouza: cols[0], tehsil: cols[1], total_bills: cols[2], total_zar: cols[3] };
      } else if (cols.length === 3) {
        return { id: Date.now() + Math.random(), mouza: cols[0], tehsil: "تاملہ آباد", total_bills: cols[1], total_zar: cols[2] };
      } else if (cols.length === 2) {
        return { id: Date.now() + Math.random(), mouza: cols[0], tehsil: "تاملہ آباد", total_bills: "", total_zar: cols[1] };
      }
      return { id: Date.now() + Math.random(), mouza: cols[0] || "", tehsil: "تاملہ آباد", total_bills: "", total_zar: "" };
    });
    setVillages(parsed);
    setPasteText("");
  };

  // Scan image via LLM
  const handleScan = async (file) => {
    if (!file) return;
    setScanLoading(true);
    setScanResult("");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `This is a 33-C form or a list of villages with irrigation billing data. Extract all village entries in a table. For each row return: village name (Urdu), tehsil name, total printed bills (number), total zar aabiana amount (number). Return as tab-separated lines: MouzaName\tTehsil\tBills\tZar. If tehsil not clear write تاملہ آباد. Return ONLY the data lines, no headers.`,
        file_urls: [file_url],
      });
      setScanResult(result);
      setPasteText(result);
    } catch (e) {
      setScanResult("خرابی: اسکین ناکام رہا");
    }
    setScanLoading(false);
  };

  const handlePrint = () => {
    const isPortrait = orientation === "portrait";
    const pageSize = isPortrait ? "A4 portrait" : "A4 landscape";
    
    // Build print HTML
    const cards = villages.map((v, i) => {
      const card = `
        <div class="card-wrap${isPortrait && i % 2 === 0 && i + 1 < villages.length ? ' half' : isPortrait ? ' half' : ''}">
          ${renderCardHtml(v, fasal, year, signatures, isPortrait)}
        </div>`;
      return card;
    });

    const html = `<!DOCTYPE html><html dir="rtl"><head><title>33-C ${fasal} ${year}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
      @page { size: ${pageSize}; margin: 10mm; }
      body { font-family: 'Noto Nastaliq Urdu', serif; margin: 0; padding: 0; direction: rtl; }
      .page { ${isPortrait ? "display:flex;flex-direction:column;gap:10px;" : ""} }
      .card-wrap { ${isPortrait ? "flex:1;" : "page-break-after:always;"} border: 2px solid #000; padding: ${isPortrait ? "10px 14px" : "20px 28px"}; box-sizing: border-box; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #000; padding: ${isPortrait ? "3px 5px" : "5px 8px"}; text-align: center; font-family: 'Noto Nastaliq Urdu', serif; font-size: ${isPortrait ? "9px" : "12px"}; }
      th { font-weight: bold; }
      .title { text-align: center; font-size: ${isPortrait ? "14px" : "20px"}; font-weight: bold; margin-bottom: 10px; }
      .sigs { display: flex; justify-content: space-between; margin-top: ${isPortrait ? "12px" : "24px"}; direction: ltr; }
      .sig-box { text-align: center; min-width: 120px; font-size: ${isPortrait ? "8px" : "10px"}; }
      .sig-box .line { border-top: 1px solid #000; padding-top: 3px; margin-top: 2px; }
      .sig-img { height: ${isPortrait ? "28px" : "44px"}; object-fit: contain; display: block; margin: 0 auto 2px; }
      ${isPortrait ? `.page-group { display:flex; flex-direction:column; gap:8px; page-break-after:always; height: calc(100vh - 20mm); }` : ""}
    </style></head><body>`;
    
    let body = "";
    if (isPortrait) {
      for (let i = 0; i < villages.length; i += 2) {
        const pair = villages.slice(i, i + 2);
        body += `<div class="page-group">${pair.map(v => renderCardHtml(v, fasal, year, signatures, true)).join("")}</div>`;
      }
    } else {
      body = villages.map(v => `<div style="page-break-after:always;">${renderCardHtml(v, fasal, year, signatures, false)}</div>`).join("");
    }

    const w = window.open("", "_blank", "width=1000,height=800");
    w.document.write(html + body + "</body></html>");
    w.document.close();
    setTimeout(() => { w.print(); }, 800);
  };

  function renderCardHtml(v, fasal, year, sigs, compact) {
    const fs = compact ? "9px" : "12px";
    const tfs = compact ? "14px" : "20px";
    const sigH = compact ? "28px" : "44px";
    const mt = compact ? "12px" : "24px";
    const p = compact ? "3px 5px" : "5px 8px";
    const surcharge = calcTotal(v.total_zar);
    const divSig = sigs.divisional_img ? `<img src="${sigs.divisional_img}" style="height:${sigH};object-fit:contain;display:block;margin:0 auto 2px;" />` : "";
    const depSig = sigs.deputy_img ? `<img src="${sigs.deputy_img}" style="height:${sigH};object-fit:contain;display:block;margin:0 auto 2px;" />` : "";
    const clkSig = sigs.clerk_img ? `<img src="${sigs.clerk_img}" style="height:${sigH};object-fit:contain;display:block;margin:0 auto 2px;" />` : "";
    return `
      <div style="direction:rtl;font-family:'Noto Nastaliq Urdu',serif;padding:${compact ? "8px 12px" : "16px 24px"};border:2px solid #000;box-sizing:border-box;">
        <div style="text-align:center;font-size:${tfs};font-weight:bold;margin-bottom:10px;">
          33-C &nbsp;&nbsp; بابت فصل ${fasal} ${year}ء
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:6px;">
          <thead><tr>
            <th style="border:1px solid #000;padding:${p};font-size:${fs};text-align:center;">نام موضع</th>
            <th style="border:1px solid #000;padding:${p};font-size:${fs};text-align:center;">نام تحصیل</th>
            <th style="border:1px solid #000;padding:${p};font-size:${fs};text-align:center;">کل پرنٹڈ بلز</th>
            <th style="border:1px solid #000;padding:${p};font-size:${fs};text-align:center;">کل زر آبیانہ</th>
            <th style="border:1px solid #000;padding:${p};font-size:${fs};text-align:center;">کل زر آبیانہ بمعہ ۱۰٪ سر چارج</th>
          </tr></thead>
          <tbody><tr>
            <td style="border:1px solid #000;padding:${p};font-size:${fs};text-align:center;">${v.mouza || "—"}</td>
            <td style="border:1px solid #000;padding:${p};font-size:${fs};text-align:center;">${v.tehsil || "—"}</td>
            <td style="border:1px solid #000;padding:${p};font-size:${fs};text-align:center;">${v.total_bills || "—"}</td>
            <td style="border:1px solid #000;padding:${p};font-size:${fs};text-align:center;">${v.total_zar || "—"}</td>
            <td style="border:1px solid #000;padding:${p};font-size:${fs};text-align:center;">${surcharge || "—"}</td>
          </tr></tbody>
        </table>
        <div style="display:flex;justify-content:space-between;margin-top:${mt};direction:ltr;">
          <div style="text-align:center;min-width:130px;">
            ${divSig}
            <div style="border-top:1px solid #000;padding-top:3px;font-size:${compact ? "7px" : "10px"};">
              <strong>Divisional Canal Officer</strong><br>Khushab Canal Division<br><strong>KHUSHAB</strong>
            </div>
          </div>
          <div style="text-align:center;min-width:130px;">
            ${depSig}
            <div style="border-top:1px solid #000;padding-top:3px;font-size:${compact ? "7px" : "10px"};">
              <strong>Deputy Collector</strong><br>Khushab Canal Division<br>• Khushab
            </div>
          </div>
          <div style="text-align:center;min-width:130px;">
            ${clkSig}
            <div style="border-top:1px solid #000;padding-top:3px;font-size:${compact ? "7px" : "10px"};color:#6b21a8;">
              <strong>Assessment Clerk</strong><br>Khushab Canal Division<br>Khushab
            </div>
          </div>
        </div>
      </div>`;
  }

  const inp = "border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-400";

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/deputy-collector">
              <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500 hover:text-slate-800">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-sm font-bold font-heading text-slate-800">33-C فارم</h1>
              <p className="text-[9px] text-slate-400" style={{ fontFamily: "serif" }}>بابت فصل آبیانہ</p>
            </div>
          </div>
          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs h-8">
            <Printer className="w-3.5 h-3.5" /> پرنٹ / PDF
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-5">

        {/* Settings Row */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h2 className="text-xs font-bold text-slate-700 mb-3" style={{ fontFamily: "serif" }}>⚙️ ترتیبات</h2>
          <div className="flex flex-wrap gap-4 items-end" dir="rtl">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-500 font-semibold">فصل</label>
              <select value={fasal} onChange={e => setFasal(e.target.value)} className={inp}>
                <option value="خریف">خریف</option>
                <option value="ربیع">ربیع</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-500 font-semibold">سال</label>
              <select value={year} onChange={e => setYear(e.target.value)} className={inp}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-500 font-semibold">پرنٹ سمت</label>
              <select value={orientation} onChange={e => setOrientation(e.target.value)} className={inp}>
                <option value="landscape">Landscape — ایک فارم فی صفحہ</option>
                <option value="portrait">Portrait — دو فارم فی صفحہ</option>
              </select>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h2 className="text-xs font-bold text-slate-700 mb-3">✍️ دستخط اپ لوڈ کریں</h2>
          <div className="flex gap-6 justify-center flex-wrap">
            <SigUpload label="Divisional Canal Officer" value={signatures.divisional_img} onChange={v => setSignatures(p => ({ ...p, divisional_img: v }))} />
            <SigUpload label="Deputy Collector" value={signatures.deputy_img} onChange={v => setSignatures(p => ({ ...p, deputy_img: v }))} />
            <SigUpload label="Assessment Clerk" value={signatures.clerk_img} onChange={v => setSignatures(p => ({ ...p, clerk_img: v }))} />
          </div>
        </div>

        {/* Data Entry */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-700">📋 موضع ڈیٹا</h2>
            <Button size="sm" onClick={addVillage} className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1">
              <Plus className="w-3 h-3" /> موضع شامل کریں
            </Button>
          </div>

          {/* Manual table */}
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-xs min-w-[600px]" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="bg-blue-50">
                  <th className="border border-slate-300 px-2 py-1.5 text-center text-[10px]" style={{ fontFamily: "serif" }}>نام موضع</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-center text-[10px]" style={{ fontFamily: "serif" }}>نام تحصیل</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-center text-[10px]" style={{ fontFamily: "serif" }}>کل پرنٹڈ بلز</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-center text-[10px]" style={{ fontFamily: "serif" }}>کل زر آبیانہ</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-center text-[10px]" style={{ fontFamily: "serif" }}>بمعہ ۱۰٪ سر چارج</th>
                  <th className="border border-slate-300 px-1 py-1.5 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {villages.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="border border-slate-200 p-0">
                      <input value={v.mouza} onChange={e => updateVillage(v.id, "mouza", e.target.value)}
                        className="w-full px-2 py-1 text-xs outline-none bg-transparent" dir="rtl" style={{ fontFamily: "serif" }} placeholder="موضع کا نام" />
                    </td>
                    <td className="border border-slate-200 p-0">
                      <input value={v.tehsil} onChange={e => updateVillage(v.id, "tehsil", e.target.value)}
                        className="w-full px-2 py-1 text-xs outline-none bg-transparent" dir="rtl" style={{ fontFamily: "serif" }} placeholder="تحصیل" />
                    </td>
                    <td className="border border-slate-200 p-0">
                      <input value={v.total_bills} onChange={e => updateVillage(v.id, "total_bills", e.target.value)}
                        className="w-full px-2 py-1 text-xs outline-none bg-transparent text-center" type="number" placeholder="0" />
                    </td>
                    <td className="border border-slate-200 p-0">
                      <input value={v.total_zar} onChange={e => updateVillage(v.id, "total_zar", e.target.value)}
                        className="w-full px-2 py-1 text-xs outline-none bg-transparent text-center" type="number" placeholder="0" />
                    </td>
                    <td className="border border-slate-200 px-2 py-1 text-center text-xs text-emerald-700 font-semibold">
                      {calcTotal(v.total_zar) || "—"}
                    </td>
                    <td className="border border-slate-200 px-1 py-1 text-center">
                      <button onClick={() => removeVillage(v.id)} className="text-slate-300 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paste from Excel */}
          <div className="border border-dashed border-slate-300 rounded-lg p-3 bg-slate-50">
            <p className="text-[10px] text-slate-500 mb-1.5 font-semibold">📋 Excel سے کاپی پیسٹ کریں (ٹیب سے الگ کالم: موضع، تحصیل، بلز، زر)</p>
            <textarea value={pasteText} onChange={e => setPasteText(e.target.value)}
              rows={4} dir="rtl"
              className="w-full border border-slate-200 rounded px-2 py-1 text-xs font-mono bg-white focus:outline-none focus:border-blue-400 resize-none"
              placeholder={"چک اسلام آباد\tتاملہ آباد\t336\t623405\nچک 2\tتاملہ آباد\t210\t450000"} />
            <div className="flex justify-end mt-1.5">
              <Button size="sm" onClick={handlePaste} disabled={!pasteText.trim()}
                className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1 px-3">
                ڈیٹا درآمد کریں
              </Button>
            </div>
          </div>

          {/* Scan */}
          <div className="mt-3 border border-dashed border-amber-300 rounded-lg p-3 bg-amber-50">
            <p className="text-[10px] text-amber-700 mb-1.5 font-semibold">📷 صفحہ اسکین کریں (AI خود بخود ڈیٹا نکالے گا)</p>
            <div className="flex gap-2 items-center flex-wrap">
              <Button size="sm" onClick={() => scanFileRef.current.click()} disabled={scanLoading}
                className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white gap-1">
                <Camera className="w-3.5 h-3.5" />
                {scanLoading ? "اسکین ہو رہا ہے..." : "تصویر اپ لوڈ کریں"}
              </Button>
              <input ref={scanFileRef} type="file" accept="image/*" className="hidden"
                onChange={e => handleScan(e.target.files[0])} />
              {scanResult && (
                <span className="text-[10px] text-emerald-700">✓ ڈیٹا مل گیا — نیچے پیسٹ باکس میں چیک کریں</span>
              )}
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h2 className="text-xs font-bold text-slate-700 mb-4">👁 پرنٹ پریویو</h2>
          <div className="space-y-4" ref={printRef}>
            {villages.map((v, i) => (
              <div key={v.id}>
                <Form33CCard village={v} fasal={fasal} year={year} signatures={signatures} compact={orientation === "portrait"} />
                {orientation === "portrait" && i % 2 === 1 && i < villages.length - 1 && (
                  <div className="border-t-4 border-dashed border-slate-300 my-3" />
                )}
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}