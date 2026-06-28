import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2, Printer, Upload, Camera, Sparkles, Loader2, Save, RefreshCw, Eye, EyeOff } from "lucide-react";
import { base44 } from "@/api/base44Client";
import Form33CHistory from "@/components/form33c/Form33CHistory";

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

function calcTotal(v, pct = 10) {
  if (v.surcharge_override && v.surcharge_override.trim() !== "") return v.surcharge_override;
  const z = parseFloat(v.total_zar) || 0;
  return z > 0 ? (z + z * (pct / 100)).toFixed(2) : "";
}

const COLUMNS = [
  { key: "mouza", label: "نام موضع" },
  { key: "tehsil", label: "نام تحصیل" },
  { key: "total_bills", label: "کل پرنٹڈ بلز" },
  { key: "total_zar", label: "کل زر آبیانہ" },
  { key: "surcharge", label: "کل زر آبیانہ بمعہ 10% سر چارج" },
];

// ─── Stepper (no dropdown, just +/- and text input) ──────────────────────────
function StepperInput({ value, onChange, placeholder = "0" }) {
  const step = (dir) => {
    const n = parseFloat(value) || 0;
    onChange(String(Math.max(0, n + dir)));
  };
  return (
    <div className="flex items-center justify-center gap-0">
      <button type="button" onClick={() => step(-1)}
        className="w-7 h-8 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-l text-base font-bold border-r border-slate-100 shrink-0">−</button>
      <input value={value} onChange={e => onChange(e.target.value)}
        className="w-16 px-1 py-1.5 text-xs outline-none bg-transparent text-center border-0" placeholder={placeholder} />
      <button type="button" onClick={() => step(1)}
        className="w-7 h-8 flex items-center justify-center text-blue-500 hover:bg-blue-50 rounded-r text-base font-bold border-l border-slate-100 shrink-0">+</button>
    </div>
  );
}

// ─── Signature Upload ─────────────────────────────────────────────────────────
function SigUpload({ label, value, onChange }) {
  const ref = useRef();
  const [enhancing, setEnhancing] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      onChange(e.target.result);
      setEnhancing(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const result = await base44.integrations.Core.GenerateImage({
          prompt: `Extract just the handwritten signature or rubber stamp ink from this scanned image. Remove all paper background, making it pure white (#FFFFFF). Keep the ink lines crisp, dark, and at original scale. Do not resize or crop the ink marks. White background only.`,
          existing_image_urls: [file_url],
        });
        if (result?.url) onChange(result.url);
      } catch (err) { /* keep original */ }
      setEnhancing(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-[120px]">
      <div className="text-[10px] font-semibold text-slate-500 text-center">{label}</div>
      {/* Fixed 56px image slot so all three stay at same height */}
      <div style={{ height: 56 }} className="w-full flex items-center justify-center">
        {value && !enhancing
          ? <img src={value} alt="sig" style={{ maxHeight: 54, maxWidth: "100%", objectFit: "contain", display: "block" }} />
          : enhancing
            ? <div className="flex flex-col items-center gap-1"><Loader2 className="w-4 h-4 text-blue-500 animate-spin" /><span className="text-[8px] text-blue-500">AI...</span></div>
            : <div className="w-full h-10 border-2 border-dashed border-slate-200 rounded flex items-center justify-center text-slate-300"><Upload className="w-4 h-4" /></div>}
      </div>
      <button onClick={() => !enhancing && ref.current.click()}
        className="text-[9px] px-2 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200">
        {value ? "تبدیل کریں" : "اپ لوڈ"}
      </button>
      {value && !enhancing && (
        <button onClick={() => onChange("")} className="text-[9px] text-red-400 hover:text-red-600">حذف</button>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
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
  const [lastScanResult, setLastScanResult] = useState("");
  const [saving, setSaving] = useState(false);
  const [showTableBorder, setShowTableBorder] = useState(true);
  const [showPageBorder, setShowPageBorder] = useState(true);
  const [historyKey, setHistoryKey] = useState(0);
  const [showSurcharge, setShowSurcharge] = useState(true);
  const [showSurchargeInput, setShowSurchargeInput] = useState(true);
  const [surchargePercent, setSurchargePercent] = useState(10);
  const [showDistrict, setShowDistrict] = useState(true);
  const [district, setDistrict] = useState("Khushab");
  const scanFileRef = useRef();

  const updateVillage = (id, key, val) =>
    setVillages(prev => prev.map(v => v.id === id ? { ...v, [key]: val } : v));
  const addVillage = () => setVillages(prev => [...prev, emptyVillage()]);
  const removeVillage = (id) => setVillages(prev => prev.filter(v => v.id !== id));

  const handlePaste = () => {
    const lines = pasteText.trim().split("\n").filter(l => l.trim());
    if (!lines.length) return;
    const parsed = lines.map(line => {
      const cols = line.split(/\t/).map(c => c.trim());
      return {
        id: Date.now() + Math.random(),
        mouza: cols[0] || "",
        tehsil: cols[1] || "",
        total_bills: cols[2] || "",
        total_zar: cols[3] || "",
        surcharge_override: "",
      };
    });
    setVillages(parsed);
    setPasteText("");
  };

  const handleScan = async (file) => {
    if (!file) return;
    setScanLoading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `This is a 33-C form or village irrigation billing list. Extract all village rows. Return ONLY tab-separated lines with no headers: VillageName(Urdu)\tTehsil\tTotalBills\tZarAabiana. Leave column empty if not found.`,
        file_urls: [file_url],
        model: "claude_sonnet_4_6",
      });
      // Show scanned data in the Excel textarea so user can verify before importing
      setLastScanResult(result);
      setPasteText(result);
    } catch (e) {
      alert("اسکین ناکام رہا — دوبارہ کوشش کریں");
    }
    setScanLoading(false);
    if (scanFileRef.current) scanFileRef.current.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Form33CRecord.create({
        fasal,
        year,
        orientation,
        district: showDistrict ? district : "",
        villages_json: JSON.stringify(villages),
        signatures_json: JSON.stringify({
          divisional_img: signatures.divisional_img ? "[uploaded]" : "",
          deputy_img: signatures.deputy_img ? "[uploaded]" : "",
          clerk_img: signatures.clerk_img ? "[uploaded]" : "",
        }),
      });
      alert("✓ ریکارڈ محفوظ ہو گیا");
      setHistoryKey(k => k + 1);
    } catch (e) {
      alert("محفوظ نہیں ہو سکا");
    }
    setSaving(false);
  };

  const handleLoadRecord = (rec, vills) => {
    setFasal(rec.fasal || "خریف");
    setYear(rec.year || String(CURRENT_YEAR));
    setOrientation(rec.orientation || "landscape");
    if (rec.district) { setDistrict(rec.district); setShowDistrict(true); }
    setVillages(vills);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const surchargeLabel = `کل زر آبیانہ بمعہ ${surchargePercent}% سر چارج`;
  const activeCols = showSurcharge
    ? COLUMNS.map(c => c.key === "surcharge" ? { ...c, label: surchargeLabel } : c)
    : COLUMNS.filter(c => c.key !== "surcharge");

  // ─── Build print HTML ─────────────────────────────────────────────────────
  function renderCardHtml(v, compact) {
    const fs = compact ? "13px" : "20px";
    const tfs = compact ? "28px" : "48px";
    const sigImgH = compact ? "50px" : "70px";
    const stampMaxW = compact ? "90px" : "120px";
    const sigFs = compact ? "11px" : "15px";
    const p = compact ? "6px 8px" : "10px 14px";
    const borderStyle = showTableBorder ? "1.5px solid #000" : "1px solid transparent";
    const outerBorder = showPageBorder ? "2px solid #000" : "2px solid transparent";
    const districtLine = showDistrict && district ? `<div style="font-size:${sigFs};">${district} Canal Division</div>` : "";

    const cols = showSurcharge
      ? COLUMNS.map(c => c.key === "surcharge" ? { ...c, label: surchargeLabel } : c)
      : COLUMNS.filter(c => c.key !== "surcharge");
    const headers = cols.map(c =>
      `<th style="border:${borderStyle};padding:${p};font-size:${fs};text-align:center;font-weight:bold;">${c.label}</th>`
    ).join("");
    const cells = cols.map(c => {
      const val = c.key === "surcharge" ? "" : (v[c.key] || "—");
      return `<td style="border:${borderStyle};padding:${p};font-size:${fs};text-align:center;">${val}</td>`;
    }).join("");

    // Signature block: image fills available height, line width matches text width
    const sig = (src, title) => {
      const lineW = compact ? "160px" : "200px";
      return `
      <div style="text-align:center;flex:1;display:flex;flex-direction:column;align-items:center;">
        <div style="height:${sigImgH};display:flex;align-items:flex-end;justify-content:center;margin-bottom:2px;width:100%;">
          ${src ? `<img src="${src}" style="height:${sigImgH};max-width:${stampMaxW};object-fit:contain;display:block;" />` : ""}
        </div>
        <div style="width:${lineW};border-top:1.5px solid #000;padding-top:3px;font-size:${sigFs};text-align:center;">
          <strong>${title}</strong>${districtLine}
        </div>
      </div>`;
    };

    return `
      <div style="direction:rtl;font-family:'Noto Nastaliq Urdu',serif;padding:${compact ? "10px 16px" : "24px 36px"};border:${outerBorder};box-sizing:border-box;height:100%;display:flex;flex-direction:column;">
        <div style="text-align:center;font-size:${tfs};font-weight:bold;margin-bottom:${compact ? "20px" : "40px"};letter-spacing:1px;word-spacing:6px;line-height:1.6;">
          <span dir="ltr">33-C</span>&nbsp;&nbsp;بابت فصل ${fasal} ${year}ء
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr>${headers}</tr></thead>
          <tbody><tr>${cells}</tr></tbody>
        </table>
        <div style="display:flex;justify-content:space-around;gap:8px;margin-top:auto;padding-top:${compact ? "16px" : "36px"};padding-bottom:${compact ? "12px" : "28px"};direction:ltr;align-items:flex-end;">
          ${sig(signatures.divisional_img, "Divisional Canal Officer")}
          ${sig(signatures.deputy_img, "Deputy Collector")}
          ${sig(signatures.clerk_img, "Assessment Clerk")}
        </div>
      </div>`;
  }

  const handlePrint = () => {
    const isPortrait = orientation === "portrait";
    const pageSize = isPortrait ? "A4 portrait" : "A4 landscape";
    const w = window.open("", "_blank", "width=1200,height=900");
    let body = "";
    if (isPortrait) {
      // 2 villages per A4 page, each occupies exactly half
      for (let i = 0; i < villages.length; i += 2) {
        const pair = villages.slice(i, i + 2);
        const cards = pair.map(v => `<div class="card-half">${renderCardHtml(v, true)}</div>`).join("");
        body += `<div class="page-group">${cards}</div>`;
      }
    } else {
      // 1 village per landscape A4 page, strictly one page
      body = villages.map(v => `<div class="page-single">${renderCardHtml(v, false)}</div>`).join("");
    }
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>33-C</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
      @page { size: ${pageSize}; margin: 6mm; }
      *{box-sizing:border-box;margin:0;padding:0;}
      html,body{font-family:'Noto Nastaliq Urdu',serif;direction:rtl;width:100%;height:100%;}
      ${isPortrait
        ? `.page-group{
             display:flex;flex-direction:column;
             height:calc(297mm - 12mm);
             page-break-after:always;break-after:page;
             overflow:hidden;
           }
           .card-half{flex:1;min-height:0;overflow:hidden;}`
        : `.page-single{
             height:calc(210mm - 12mm);
             page-break-after:always;break-after:page;
             overflow:hidden;
           }`}
    </style></head><body>${body}</body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 900);
  };

  const inp = "border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-400";

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
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
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} variant="outline" className="gap-1.5 text-xs h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
              <Save className="w-3.5 h-3.5" /> {saving ? "محفوظ..." : "محفوظ کریں"}
            </Button>
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs h-8">
              <Printer className="w-3.5 h-3.5" /> پرنٹ
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-4">

        {/* ── Settings ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h2 className="text-xs font-bold text-slate-700 mb-3">⚙️ ترتیبات</h2>
          <div className="flex flex-wrap gap-3 items-end" dir="rtl">
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
              <input type="checkbox" checked={showPageBorder} onChange={e => setShowPageBorder(e.target.checked)} className="w-3.5 h-3.5 accent-blue-600" />
              صفحہ بارڈر دکھائیں
            </label>
            <label className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer">
              <input type="checkbox" checked={showTableBorder} onChange={e => setShowTableBorder(e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
              ٹیبل بارڈر دکھائیں
            </label>
            <label className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer">
              <input type="checkbox" checked={showSurcharge} onChange={e => setShowSurcharge(e.target.checked)} className="w-3.5 h-3.5 accent-blue-600" />
              سر چارج کالم دکھائیں
            </label>
            {showSurcharge && (
              <div className="flex items-center gap-2 flex-wrap">
                <label className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={showSurchargeInput} onChange={e => setShowSurchargeInput(e.target.checked)} className="w-3.5 h-3.5 accent-emerald-600" />
                  سر چارج خانہ ظاہر کریں
                </label>
                <div className="flex items-center gap-1">
                  <label className="text-[10px] text-slate-500 font-semibold">سر چارج %</label>
                  <input
                    type="number" min="0" max="100" step="0.5"
                    value={surchargePercent}
                    onChange={e => setSurchargePercent(parseFloat(e.target.value) || 0)}
                    className="w-16 border border-slate-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-blue-400 text-center"
                  />
                </div>
              </div>
            )}
            <label className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer">
              <input type="checkbox" checked={showDistrict} onChange={e => setShowDistrict(e.target.checked)} className="w-3.5 h-3.5 accent-blue-600" />
              ضلع دکھائیں
            </label>
            {showDistrict && (
              <div className="flex items-center gap-1.5">
                <input value={district} onChange={e => setDistrict(e.target.value)}
                  className="w-24 border border-slate-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-blue-400" />
                <span className="text-[10px] text-slate-400">Canal Division</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Signatures ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-bold text-slate-700">✍️ دستخط / مہر</h2>
            <span className="flex items-center gap-1 text-[9px] text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" /> AI بیک گراؤنڈ ہٹائے گا
            </span>
          </div>
          <div className="flex gap-4 justify-around">
            <SigUpload label="Divisional Canal Officer" value={signatures.divisional_img} onChange={v => setSignatures(p => ({ ...p, divisional_img: v }))} />
            <SigUpload label="Deputy Collector" value={signatures.deputy_img} onChange={v => setSignatures(p => ({ ...p, deputy_img: v }))} />
            <SigUpload label="Assessment Clerk" value={signatures.clerk_img} onChange={v => setSignatures(p => ({ ...p, clerk_img: v }))} />
          </div>
        </div>

        {/* ── Scan ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-slate-700">📷 تصویر سے ڈیٹا (AI اسکین)</h2>
            <span className="text-[9px] text-slate-400">اسکین شدہ ڈیٹا نیچے Excel باکس میں آئے گا</span>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Button size="sm" onClick={() => scanFileRef.current.click()} disabled={scanLoading}
              className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white gap-1">
              <Camera className="w-3.5 h-3.5" />
              {scanLoading ? <><Loader2 className="w-3 h-3 animate-spin" /> اسکین ہو رہا ہے...</> : "تصویر اپ لوڈ کریں"}
            </Button>
            <Button size="sm" onClick={() => { if (lastScanResult) setPasteText(lastScanResult); }}
              disabled={!lastScanResult || scanLoading}
              className="h-7 text-xs bg-blue-500 hover:bg-blue-600 text-white gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> ریفریش (پچھلی اسکین)
            </Button>
            <input ref={scanFileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { handleScan(e.target.files[0]); }} />
            {lastScanResult && !scanLoading && (
              <span className="text-[10px] text-emerald-600">✓ پچھلی اسکین محفوظ ہے — ریفریش سے دوبارہ دیکھیں</span>
            )}
          </div>
        </div>

        {/* ── Excel Paste ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-slate-700">📋 Excel سے پیسٹ کریں</h2>
            <button onClick={() => setPasteText("")} disabled={!pasteText}
              className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-1 disabled:opacity-30">
              <Trash2 className="w-3 h-3" /> کلیئر
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mb-2">ٹیب الگ کالم: موضع، تحصیل، بلز، زر</p>
          <textarea value={pasteText} onChange={e => setPasteText(e.target.value)}
            rows={4} dir="rtl"
            className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs font-mono bg-white focus:outline-none focus:border-blue-400 resize-none"
            placeholder={"یہاں Excel سے کاپی کریں یا تصویر اسکین کریں..."} />
          <div className="flex justify-end mt-1.5">
            <Button size="sm" onClick={handlePaste} disabled={!pasteText.trim()}
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 px-3">
              ڈیٹا درآمد کریں
            </Button>
          </div>
        </div>

        {/* ── Data Table ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-700">📋 موضع ڈیٹا</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline"
                onClick={() => { if (confirm("کیا آپ تمام ڈیٹا صاف کرنا چاہتے ہیں؟")) setVillages([emptyVillage()]); }}
                className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50 gap-1">
                <Trash2 className="w-3 h-3" /> ٹیبل صاف کریں
              </Button>
              <Button size="sm" onClick={addVillage} className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1">
                <Plus className="w-3 h-3" /> موضع شامل کریں
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[640px]" style={{ borderCollapse: "collapse" }} dir="rtl">
              <thead>
                <tr className="bg-blue-50">
                  <th className="border border-slate-300 px-2 py-2 text-center text-[10px]" style={{ fontFamily: "serif" }}>نام موضع</th>
                  <th className="border border-slate-300 px-2 py-2 text-center text-[10px]" style={{ fontFamily: "serif" }}>نام تحصیل</th>
                  <th className="border border-slate-300 px-2 py-2 text-center text-[10px]" style={{ fontFamily: "serif" }}>کل پرنٹڈ بلز</th>
                  <th className="border border-slate-300 px-2 py-2 text-center text-[10px]" style={{ fontFamily: "serif" }}>کل زر آبیانہ</th>
                  {showSurcharge && showSurchargeInput && (
                    <th className="border border-slate-300 px-2 py-2 text-center text-[10px]" style={{ fontFamily: "serif" }}>
                      <span className="flex items-center justify-center gap-1">
                        بمعہ 10% سر چارج
                        <button onClick={() => setShowSurchargeInput(false)} className="text-slate-300 hover:text-red-400"><EyeOff className="w-3 h-3" /></button>
                      </span>
                    </th>
                  )}
                  {showSurcharge && !showSurchargeInput && (
                    <th className="border border-slate-300 px-2 py-2 text-center text-[10px]">
                      <button onClick={() => setShowSurchargeInput(true)} className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-blue-500 mx-auto">
                        <Eye className="w-3 h-3" /> سر چارج
                      </button>
                    </th>
                  )}
                  <th className="border border-slate-300 px-1 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {villages.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="border border-slate-200 p-0">
                      <input value={v.mouza} onChange={e => updateVillage(v.id, "mouza", e.target.value)}
                        className="w-full px-2 py-2 text-xs outline-none bg-transparent" dir="rtl" style={{ fontFamily: "serif" }} placeholder="نام موضع" />
                    </td>
                    <td className="border border-slate-200 p-0">
                      <input value={v.tehsil} onChange={e => updateVillage(v.id, "tehsil", e.target.value)}
                        className="w-full px-2 py-2 text-xs outline-none bg-transparent" dir="rtl" style={{ fontFamily: "serif" }} placeholder="نام تحصیل" />
                    </td>
                    <td className="border border-slate-200 p-0">
                      <StepperInput value={v.total_bills} onChange={val => updateVillage(v.id, "total_bills", val)} />
                    </td>
                    <td className="border border-slate-200 p-0">
                      <StepperInput value={v.total_zar} onChange={val => updateVillage(v.id, "total_zar", val)} />
                    </td>
                    {showSurcharge && showSurchargeInput && (
                      <td className="border border-slate-200 p-0">
                        <input value={v.surcharge_override} onChange={e => updateVillage(v.id, "surcharge_override", e.target.value)}
                          className="w-full px-2 py-2 text-xs outline-none bg-transparent text-center text-emerald-700 font-semibold"
                          placeholder={calcTotal(v, surchargePercent) || "خودکار"} />
                      </td>
                    )}
                    {showSurcharge && !showSurchargeInput && (
                      <td className="border border-slate-200 px-2 py-2 text-center text-xs text-slate-400 italic">
                        {calcTotal(v, surchargePercent) || "—"}
                      </td>
                    )}
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
        </div>

        {/* ── History & Compare ── */}
        <Form33CHistory onLoad={handleLoadRecord} refreshKey={historyKey} />

        {/* ── Live Preview ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h2 className="text-xs font-bold text-slate-700 mb-4">👁 پرنٹ پریویو</h2>
          <div className="space-y-4">
            {villages.map((v) => (
              <div key={v.id}
                style={{ border: showPageBorder ? "2px solid #000" : "2px dashed #cbd5e1", direction: "rtl", fontFamily: "'Noto Nastaliq Urdu', serif", padding: orientation === "portrait" ? "14px 20px" : "26px 40px", backgroundColor: "#fff" }}>
                {/* Title */}
                <div style={{ textAlign: "center", fontSize: orientation === "portrait" ? "30px" : "52px", fontWeight: "bold", marginBottom: orientation === "portrait" ? "44px" : "76px", letterSpacing: "1px", wordSpacing: "6px", lineHeight: 1.8 }}>
                  <span dir="ltr">33-C</span>&nbsp;&nbsp;بابت فصل {fasal} {year}ء
                </div>
                {/* Table */}
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px" }}>
                  <thead><tr>
                    {activeCols.map(c => (
                      <th key={c.key} style={{ border: showTableBorder ? "1.5px solid #000" : "1px solid #e2e8f0", padding: "6px 8px", fontSize: orientation === "portrait" ? "12px" : "17px", textAlign: "center" }}>{c.label}</th>
                    ))}
                  </tr></thead>
                  <tbody><tr>
                    {activeCols.map(c => {
                      const val = c.key === "surcharge" ? "" : (v[c.key] || "—");
                      return <td key={c.key} style={{ border: showTableBorder ? "1.5px solid #000" : "1px solid #e2e8f0", padding: "6px 8px", fontSize: orientation === "portrait" ? "12px" : "17px", textAlign: "center" }}>{val}</td>;
                    })}
                  </tr></tbody>
                </table>
                {/* Signatures — fixed height image area keeps them level */}
                <div style={{ display: "flex", justifyContent: "space-around", gap: "8px", marginTop: orientation === "portrait" ? "16px" : "36px", paddingBottom: orientation === "portrait" ? "12px" : "24px", direction: "ltr", alignItems: "flex-end" }}>
                  {[
                    { img: signatures.divisional_img, title: "Divisional Canal Officer" },
                    { img: signatures.deputy_img, title: "Deputy Collector" },
                    { img: signatures.clerk_img, title: "Assessment Clerk" },
                  ].map((s, idx) => (
                    <div key={idx} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ height: orientation === "portrait" ? "50px" : "70px", display: "flex", alignItems: "flex-end", justifyContent: "center", marginBottom: "2px", width: "100%" }}>
                        {s.img && <img src={s.img} alt="sig" style={{ height: orientation === "portrait" ? "50px" : "70px", maxWidth: orientation === "portrait" ? "90px" : "120px", objectFit: "contain", display: "block" }} />}
                      </div>
                      <div style={{ width: orientation === "portrait" ? "140px" : "190px", borderTop: "1.5px solid #000", paddingTop: "4px", fontSize: orientation === "portrait" ? "11px" : "15px", textAlign: "center" }}>
                        <strong>{s.title}</strong>
                        {showDistrict && district && <div style={{ fontSize: orientation === "portrait" ? "10px" : "13px" }}>{district} Canal Division</div>}
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