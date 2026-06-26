import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2, Printer, Upload, Camera, Sparkles, Loader2, Minus } from "lucide-react";
import { base44 } from "@/api/base44Client";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => String(CURRENT_YEAR - i));

const emptyVillage = () => ({
  id: Date.now() + Math.random(),
  mouza: "",
  tehsil: "",
  total_bills: "",
  total_zar: "",
  surcharge_override: "",
});

function calcTotal(v) {
  if (v.surcharge_override && v.surcharge_override.trim() !== "") return v.surcharge_override;
  const z = parseFloat(v.total_zar) || 0;
  return z > 0 ? (z + z * 0.1).toFixed(2) : "";
}

// Natural RTL order: نام موضع (right) → surcharge (left)
const COLUMNS = [
  { key: "mouza", label: "نام موضع" },
  { key: "tehsil", label: "نام تحصیل" },
  { key: "total_bills", label: "کل پرنٹڈ بلز" },
  { key: "total_zar", label: "کل زر آبیانہ" },
  { key: "surcharge", label: "کل زر آبیانہ بمعہ 10% سر چارج" },
];

// ─── Number input with steppers ───────────────────────────────────────────────
function StepperInput({ value, onChange, placeholder = "0" }) {
  const step = (dir) => {
    const n = parseFloat(value) || 0;
    onChange(String(Math.max(0, n + dir)));
  };
  return (
    <div className="flex items-center justify-center gap-0.5">
      <button type="button" onClick={() => step(1)}
        className="w-5 h-6 flex items-center justify-center text-blue-500 hover:bg-blue-50 rounded text-sm font-bold shrink-0">+</button>
      <input value={value} onChange={e => onChange(e.target.value)} type="number"
        className="w-14 px-1 py-1 text-xs outline-none bg-transparent text-center" placeholder={placeholder} />
      <button type="button" onClick={() => step(-1)}
        className="w-5 h-6 flex items-center justify-center text-red-400 hover:bg-red-50 rounded text-sm font-bold shrink-0">−</button>
    </div>
  );
}

// ─── Signature Upload with AI enhancement ────────────────────────────────────
function SigUpload({ label, value, onChange }) {
  const ref = useRef();
  const [enhancing, setEnhancing] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      onChange(dataUrl);
      setEnhancing(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const result = await base44.integrations.Core.GenerateImage({
          prompt: `This is a scanned photograph of an official signature or rubber stamp on paper. Enhance and clean it professionally: remove all background paper texture, shadows, and noise making the background pure white (#FFFFFF); increase contrast so the ink/stamp appears crisp and dark (black or dark blue) with sharp edges; preserve the exact shape and style of the signature or stamp; make it look like a clean, real ink signature suitable for placing on an official government form. Output only the signature/stamp on a clean white background.`,
          existing_image_urls: [file_url],
        });
        if (result?.url) onChange(result.url);
      } catch (err) { /* keep original */ }
      setEnhancing(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-[10px] font-semibold text-slate-600 text-center">{label}</div>
      <div onClick={() => !enhancing && ref.current.click()}
        className={`w-32 h-16 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer bg-slate-50 overflow-hidden relative ${enhancing ? "border-blue-400" : "border-slate-300 hover:border-blue-400"}`}>
        {enhancing
          ? <div className="flex flex-col items-center gap-1"><Loader2 className="w-5 h-5 text-blue-500 animate-spin" /><span className="text-[8px] text-blue-500">AI بہتر بنا رہا ہے...</span></div>
          : value
            ? <img src={value} alt="sig" className="max-h-full max-w-full object-contain" />
            : <Upload className="w-5 h-5 text-slate-300" />}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
      {value && !enhancing && (
        <button onClick={() => onChange("")} className="text-[9px] text-red-400 hover:text-red-600">حذف</button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Form33C() {
  const [fasal, setFasal] = useState("خریف");
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [orientation, setOrientation] = useState("landscape");
  const [villages, setVillages] = useState([emptyVillage()]);
  const [signatures, setSignatures] = useState({ divisional_img: "", deputy_img: "", clerk_img: "" });
  const [pasteText, setPasteText] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState("");
  const [showBorder, setShowBorder] = useState(true);
  const [showSurcharge, setShowSurcharge] = useState(true);
  const [showDistrict, setShowDistrict] = useState(true);
  const [district, setDistrict] = useState("Khushab");
  const scanFileRef = useRef();

  const updateVillage = (id, key, val) => {
    setVillages(prev => prev.map(v => v.id === id ? { ...v, [key]: val } : v));
  };
  const addVillage = () => setVillages(prev => [...prev, emptyVillage()]);
  const removeVillage = (id) => setVillages(prev => prev.filter(v => v.id !== id));

  const handlePaste = () => {
    const lines = pasteText.trim().split("\n").filter(l => l.trim());
    if (!lines.length) return;
    const parsed = lines.map(line => {
      const cols = line.split(/\t/).map(c => c.trim());
      if (cols.length >= 4) return { id: Date.now() + Math.random(), mouza: cols[0], tehsil: cols[1], total_bills: cols[2], total_zar: cols[3], surcharge_override: "" };
      if (cols.length === 3) return { id: Date.now() + Math.random(), mouza: cols[0], tehsil: "", total_bills: cols[1], total_zar: cols[2], surcharge_override: "" };
      if (cols.length === 2) return { id: Date.now() + Math.random(), mouza: cols[0], tehsil: "", total_bills: "", total_zar: cols[1], surcharge_override: "" };
      return { id: Date.now() + Math.random(), mouza: cols[0] || "", tehsil: "", total_bills: "", total_zar: "", surcharge_override: "" };
    });
    setVillages(parsed);
    setPasteText("");
  };

  const handleScan = async (file) => {
    if (!file) return;
    setScanLoading(true);
    setScanResult("");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `This is a 33-C form or a list of villages with irrigation billing data. Extract all village entries. For each row return: village name (Urdu), tehsil name, total printed bills (number), total zar aabiana amount (number). Return as tab-separated lines: MouzaName\tTehsil\tBills\tZar. If tehsil not clear leave empty. Return ONLY the data lines, no headers.`,
        file_urls: [file_url],
        model: "claude_sonnet_4_6",
      });
      setScanResult(result);
      setPasteText(result);
    } catch (e) {
      setScanResult("خرابی: اسکین ناکام رہا");
    }
    setScanLoading(false);
  };

  const activeCols = showSurcharge ? COLUMNS : COLUMNS.filter(c => c.key !== "surcharge");

  function renderCardHtml(v, compact) {
    const fs = compact ? "14px" : "22px";
    const tfs = compact ? "24px" : "42px";
    const sigH = compact ? "44px" : "78px";
    const sigFs = compact ? "12px" : "18px";
    const p = compact ? "7px 10px" : "12px 14px";
    const borderStyle = showBorder ? "1.5px solid #000" : "1px solid transparent";
    const outerBorder = showBorder ? "2px solid #000" : "2px solid transparent";
    const surcharge = calcTotal(v);

    const sigImg = (src) => src ? `<img src="${src}" style="height:${sigH};object-fit:contain;display:block;margin:0 auto 4px;" />` : "";
    const districtLine = showDistrict && district ? `<div style="font-size:${sigFs};">${district} Canal Division</div>` : "";

    const cells = activeCols.map(c => {
      const val = c.key === "surcharge" ? (surcharge || "—") : (v[c.key] || "—");
      return `<td style="border:${borderStyle};padding:${p};font-size:${fs};text-align:center;">${val}</td>`;
    }).join("");
    const headers = activeCols.map(c =>
      `<th style="border:${borderStyle};padding:${p};font-size:${fs};text-align:center;font-weight:bold;">${c.label}</th>`
    ).join("");

    return `
      <div style="direction:rtl;font-family:'Noto Nastaliq Urdu',serif;padding:${compact ? "14px 20px" : "28px 40px"};border:${outerBorder};box-sizing:border-box;height:100%;display:flex;flex-direction:column;">
        <div style="text-align:center;font-size:${tfs};font-weight:bold;margin-bottom:${compact ? "14px" : "24px"};">
          <span dir="ltr">33-C</span> &nbsp;&nbsp; بابت فصل ${fasal} ${year}ء
        </div>
        <table style="width:100%;border-collapse:collapse;margin:0 auto;max-width:92%;">
          <thead><tr>${headers}</tr></thead>
          <tbody><tr>${cells}</tr></tbody>
        </table>
        <div style="display:flex;justify-content:space-between;margin-top:auto;padding-top:${compact ? "20px" : "40px"};padding-bottom:${compact ? "8px" : "16px"};direction:ltr;">
          <div style="text-align:center;min-width:140px;">
            ${sigImg(signatures.divisional_img)}
            <div style="border-top:${showBorder ? "1px solid #000" : "1px solid transparent"};padding-top:5px;font-size:${sigFs};">
              <strong>Divisional Canal Officer</strong>${districtLine}
            </div>
          </div>
          <div style="text-align:center;min-width:140px;">
            ${sigImg(signatures.deputy_img)}
            <div style="border-top:${showBorder ? "1px solid #000" : "1px solid transparent"};padding-top:5px;font-size:${sigFs};">
              <strong>Deputy Collector</strong>${districtLine}
            </div>
          </div>
          <div style="text-align:center;min-width:140px;">
            ${sigImg(signatures.clerk_img)}
            <div style="border-top:${showBorder ? "1px solid #000" : "1px solid transparent"};padding-top:5px;font-size:${sigFs};">
              <strong>Assessment Clerk</strong>${districtLine}
            </div>
          </div>
        </div>
      </div>`;
  }

  const handlePrint = () => {
    const isPortrait = orientation === "portrait";
    const pageSize = isPortrait ? "A4 portrait" : "A4 landscape";

    const html = `<!DOCTYPE html><html dir="rtl"><head><title>33-C ${fasal} ${year}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
      @page { size: ${pageSize}; margin: 6mm; }
      * { box-sizing: border-box; }
      html, body { font-family: 'Noto Nastaliq Urdu', serif; margin: 0; padding: 0; direction: rtl; height: 100%; }
      ${isPortrait
        ? `.page-group { display:flex; flex-direction:column; gap:4mm; page-break-after:always; height: calc(100vh - 12mm); }
           .card-half { flex: 1; min-height: 0; }`
        : `.page-single { page-break-after: always; height: calc(100vh - 12mm); }`}
    </style></head><body>`;

    let body = "";
    if (isPortrait) {
      for (let i = 0; i < villages.length; i += 2) {
        const pair = villages.slice(i, i + 2);
        const cards = pair.map(v => `<div class="card-half">${renderCardHtml(v, true)}</div>`).join("");
        body += `<div class="page-group">${cards}</div>`;
      }
    } else {
      body = villages.map(v => `<div class="page-single">${renderCardHtml(v, false)}</div>`).join("");
    }

    const w = window.open("", "_blank", "width=1100,height=850");
    w.document.write(html + body + "</body></html>");
    w.document.close();
    setTimeout(() => { w.print(); }, 800);
  };

  const inp = "border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-400";

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
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

        {/* Settings */}
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

          <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-slate-100">
            <label className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer">
              <input type="checkbox" checked={showBorder} onChange={e => setShowBorder(e.target.checked)} className="w-3.5 h-3.5 accent-blue-600" />
              ٹیبل اور صفحہ بارڈر دکھائیں
            </label>
            <label className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer">
              <input type="checkbox" checked={showSurcharge} onChange={e => setShowSurcharge(e.target.checked)} className="w-3.5 h-3.5 accent-blue-600" />
              سر چارج کالم دکھائیں
            </label>
            <label className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer">
              <input type="checkbox" checked={showDistrict} onChange={e => setShowDistrict(e.target.checked)} className="w-3.5 h-3.5 accent-blue-600" />
              ضلع دکھائیں
            </label>
            {showDistrict && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500">ضلع:</span>
                <input value={district} onChange={e => setDistrict(e.target.value)}
                  className="w-24 border border-slate-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-blue-400" />
                <span className="text-[10px] text-slate-400">Canal Division</span>
              </div>
            )}
          </div>
        </div>

        {/* Signatures */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-bold text-slate-700">✍️ دستخط اپ لوڈ کریں</h2>
            <span className="flex items-center gap-1 text-[9px] text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" /> AI خود بخود بیک گراؤنڈ ہٹا کر بہتر بنائے گا
            </span>
          </div>
          <div className="flex gap-6 justify-center flex-wrap">
            <SigUpload label="Divisional Canal Officer" value={signatures.divisional_img} onChange={v => setSignatures(p => ({ ...p, divisional_img: v }))} />
            <SigUpload label="Deputy Collector" value={signatures.deputy_img} onChange={v => setSignatures(p => ({ ...p, deputy_img: v }))} />
            <SigUpload label="Assessment Clerk" value={signatures.clerk_img} onChange={v => setSignatures(p => ({ ...p, clerk_img: v }))} />
          </div>
        </div>

        {/* Data Entry */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-700">📋 موضع ڈیٹا (دستی، AI، یا +/- سے درج کریں)</h2>
            <Button size="sm" onClick={addVillage} className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1">
              <Plus className="w-3 h-3" /> موضع شامل کریں
            </Button>
          </div>

          <div className="overflow-x-auto mb-4">
            <table className="w-full text-xs min-w-[700px]" style={{ borderCollapse: "collapse" }} dir="rtl">
              <thead>
                <tr className="bg-blue-50">
                  <th className="border border-slate-300 px-2 py-1.5 text-center text-[10px]" style={{ fontFamily: "serif" }}>نام موضع</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-center text-[10px]" style={{ fontFamily: "serif" }}>نام تحصیل</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-center text-[10px]" style={{ fontFamily: "serif" }}>کل پرنٹڈ بلز</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-center text-[10px]" style={{ fontFamily: "serif" }}>کل زر آبیانہ</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-center text-[10px]" style={{ fontFamily: "serif" }}>بمعہ 10% سر چارج</th>
                  <th className="border border-slate-300 px-1 py-1.5 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {villages.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="border border-slate-200 p-0">
                      <input value={v.mouza} onChange={e => updateVillage(v.id, "mouza", e.target.value)}
                        className="w-full px-2 py-1.5 text-xs outline-none bg-transparent" dir="rtl" style={{ fontFamily: "serif" }} placeholder="نام موضع" />
                    </td>
                    <td className="border border-slate-200 p-0">
                      <input value={v.tehsil} onChange={e => updateVillage(v.id, "tehsil", e.target.value)}
                        className="w-full px-2 py-1.5 text-xs outline-none bg-transparent" dir="rtl" style={{ fontFamily: "serif" }} placeholder="نام تحصیل" />
                    </td>
                    <td className="border border-slate-200 p-0">
                      <StepperInput value={v.total_bills} onChange={val => updateVillage(v.id, "total_bills", val)} />
                    </td>
                    <td className="border border-slate-200 p-0">
                      <StepperInput value={v.total_zar} onChange={val => updateVillage(v.id, "total_zar", val)} />
                    </td>
                    <td className="border border-slate-200 p-0">
                      <input value={v.surcharge_override} onChange={e => updateVillage(v.id, "surcharge_override", e.target.value)}
                        className="w-full px-2 py-1.5 text-xs outline-none bg-transparent text-center text-emerald-700 font-semibold" type="text" placeholder={calcTotal(v) || "خودکار"} />
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
              placeholder={"چک اسلام آباد\tقائد آباد\t336\t623405\nچک 2\t\t210\t450000"} />
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
          <div className="space-y-3">
            {villages.map((v) => (
              <div key={v.id}
                style={{ border: showBorder ? "2px solid #000" : "2px dashed #cbd5e1", direction: "rtl", fontFamily: "'Noto Nastaliq Urdu', serif", padding: orientation === "portrait" ? "14px 20px" : "24px 36px", backgroundColor: "#fff" }}>
                <div style={{ textAlign: "center", fontSize: orientation === "portrait" ? "24px" : "38px", fontWeight: "bold", marginBottom: orientation === "portrait" ? "14px" : "24px" }}>
                  <span dir="ltr">33-C</span> &nbsp;&nbsp; بابت فصل {fasal} {year}ء
                </div>
                <table style={{ width: "92%", borderCollapse: "collapse", margin: "0 auto", marginBottom: "10px" }}>
                  <thead><tr>
                    {activeCols.map(c => (
                      <th key={c.key} style={{ border: showBorder ? "1.5px solid #000" : "1px solid #e2e8f0", padding: "7px 10px", fontSize: orientation === "portrait" ? "14px" : "20px", textAlign: "center" }}>{c.label}</th>
                    ))}
                  </tr></thead>
                  <tbody><tr>
                    {activeCols.map(c => {
                      const val = c.key === "surcharge" ? (calcTotal(v) || "—") : (v[c.key] || "—");
                      return <td key={c.key} style={{ border: showBorder ? "1.5px solid #000" : "1px solid #e2e8f0", padding: "7px 10px", fontSize: orientation === "portrait" ? "14px" : "20px", textAlign: "center" }}>{val}</td>;
                    })}
                  </tr></tbody>
                </table>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: orientation === "portrait" ? "20px" : "40px", paddingBottom: "10px", direction: "ltr" }}>
                  {[
                    { img: signatures.divisional_img, title: "Divisional Canal Officer" },
                    { img: signatures.deputy_img, title: "Deputy Collector" },
                    { img: signatures.clerk_img, title: "Assessment Clerk" },
                  ].map((s, idx) => (
                    <div key={idx} style={{ textAlign: "center", minWidth: "140px" }}>
                      {s.img && <img src={s.img} alt="sig" style={{ height: orientation === "portrait" ? "44px" : "74px", objectFit: "contain", display: "block", margin: "0 auto 4px" }} />}
                      <div style={{ borderTop: showBorder ? "1px solid #000" : "1px solid #cbd5e1", paddingTop: "5px", fontSize: orientation === "portrait" ? "12px" : "17px" }}>
                        <strong>{s.title}</strong>
                        {showDistrict && district && <div>{district} Canal Division</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}