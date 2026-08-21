import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Printer, FileText, Search, ChevronDown } from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function parseRows(rows_json) {
  try { return JSON.parse(rows_json || "[]"); } catch { return []; }
}

// Group allocations by farmer (CNIC or name+father key)
function groupAllocations(rows) {
  const map = new Map();
  let serial = 1;
  for (const a of rows) {
    const key = a.cnic ? `cnic:${a.cnic}` : `name:${a.farmer_name || ""}||${a.father || ""}`;
    if (!map.has(key)) {
      map.set(key, { key, serial: serial++, farmer_name: a.farmer_name || "", father: a.father || "", cnic: a.cnic || "", khata_no: a.khata_no || "", phone: a.phone || "", tenure: a.tenure || "", land_type: a.land_type || "", crop_name: a.crop_name || "", items: [] });
    }
    const g = map.get(key);
    const pick = (k) => { if (!g[k] && a[k]) g[k] = a[k]; };
    pick("father"); pick("cnic"); pick("khata_no"); pick("phone"); pick("tenure"); pick("land_type"); pick("crop_name");
    if (!g.farmer_name && a.farmer_name) g.farmer_name = a.farmer_name;
    g.items.push(a);
  }
  return [...map.values()];
}

// Total kanal & marla for a group
function groupTotals(items) {
  let kanal = 0, marla = 0;
  for (const it of items) {
    kanal += it.kanal || 0;
    marla += it.marla || 0;
  }
  while (marla >= 20) { kanal++; marla -= 20; }
  return { kanal, marla };
}

// Per-acre list: { khasra, murba, killa, kanal, marla, crop }
function farmerAcres(items) {
  const acres = [];
  for (const it of items) {
    if (it.acre_no != null) {
      acres.push({ khasra: it.khasra || `${it.mustateel_no || ""}/${it.acre_no}`, murba: it.mustateel_no || "", killa: it.acre_no || "", kanal: it.kanal || 0, marla: it.marla || 0, crop: it.crop_name || "" });
    } else if (it.geometry) {
      const khasraStr = it.khasra || "";
      const parts = khasraStr.split(";").filter(Boolean);
      for (const p of parts) {
        const [m, acStr] = p.split("/");
        const acs = (acStr || "").split(",").filter(Boolean);
        for (const ac of acs) {
          acres.push({ khasra: `${(m || "").trim()}/${ac.trim()}`, murba: (m || "").trim(), killa: ac.trim(), kanal: 0, marla: 0, crop: it.crop_name || "" });
        }
      }
      if (parts.length === 0) acres.push({ khasra: khasraStr, murba: "", killa: "", kanal: it.kanal || 0, marla: it.marla || 0, crop: it.crop_name || "" });
    }
  }
  return acres;
}

// ─── PDF print (exact PDF format — RTL Urdu table) ───────────────────────────
function buildPrintHTML(register, groups) {
  const info = register;
  const rajbah = esc(info.channel_name || "");
  const mogaRD = esc(`${info.moga_number || ""}${info.outlet_side ? `-${info.outlet_side}` : ""}`);
  const village = esc(info.mouza || info.village || "");
  const tehsil = esc(info.tehsil || "");
  const district = esc(info.district || "");

  let bodyRows = "";
  for (const g of groups) {
    const tot = groupTotals(g.items);
    const acres = farmerAcres(g.items);
    const nameCell = `${esc(g.farmer_name)}<br/><span style="font-size:7px;color:#444">ولد: ${esc(g.father)}</span><br/><span style="font-size:7px;color:#555;font-family:monospace">${esc(g.cnic)}</span>`;

    // One row per acre item; first row has farmer details rowspan
    const rowCount = Math.max(acres.length, 1);

    for (let ai = 0; ai < rowCount; ai++) {
      const acre = acres[ai] || {};
      const isFirst = ai === 0;
      bodyRows += `<tr>`;
      if (isFirst) {
        bodyRows += `<td class="sr" rowspan="${rowCount}">${g.serial}</td>`;
        bodyRows += `<td rowspan="${rowCount}" class="rajbah">${rajbah}</td>`;
        bodyRows += `<td rowspan="${rowCount}" class="moga">${mogaRD}</td>`;
        bodyRows += `<td rowspan="${rowCount}" class="dawami"></td><td rowspan="${rowCount}" class="dawami"></td>`;
        bodyRows += `<td rowspan="${rowCount}" class="dawami"></td><td rowspan="${rowCount}" class="dawami"></td>`;
        bodyRows += `<td rowspan="${rowCount}" class="khata">${esc(g.khata_no)}</td>`;
        bodyRows += `<td rowspan="${rowCount}" class="name">${nameCell}</td>`;
      }
      bodyRows += `<td class="murba">${esc(acre.murba || "")}</td>`;
      bodyRows += `<td class="killa">${esc(acre.killa || "")}</td>`;
      bodyRows += `<td class="raqba">${acre.kanal || ""}</td>`;
      bodyRows += `<td class="raqba">${acre.marla !== undefined && acre.marla !== "" ? acre.marla : "0"}</td>`;
      bodyRows += `<td class="fishfarm"></td><td class="fishfarm"></td>`;
      bodyRows += `<td class="bagh"></td><td class="bagh"></td>`;
      bodyRows += `<td class="paddy"></td><td class="paddy"></td>`;
      bodyRows += `<td class="kaifiyat">${esc(acre.crop || "")}</td>`;
      bodyRows += `</tr>`;
    }
  }

  return `<!doctype html><html dir="rtl"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>فارم 1 رجسٹر</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
  @page { size: A3 landscape; margin: 8mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Noto Nastaliq Urdu', Arial, sans-serif; direction: rtl; font-size: 8px; color: #1a1a1a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h2 { text-align: center; font-size: 13px; margin: 0 0 2px; }
  .meta { text-align: center; font-size: 9px; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 2px 3px; vertical-align: middle; text-align: center; word-break: break-word; }
  thead th { background: #1e3a5f; color: #fff; font-size: 8px; }
  .group-head th { background: #dbeafe; color: #1e3a5f; font-size: 7.5px; }
  .sr { font-weight: 700; font-size: 10px; background: #f1f5f9 !important; min-width: 22px; }
  .name { text-align: right; padding: 2px 4px; font-size: 8px; min-width: 90px; }
  .rajbah { min-width: 50px; }
  .moga { min-width: 48px; }
  .khata { min-width: 30px; }
  .murba, .killa { min-width: 22px; }
  .raqba { min-width: 20px; }
  .fishfarm, .bagh, .paddy { min-width: 20px; }
  .kaifiyat { min-width: 36px; }
  .dawami { min-width: 20px; }
  tr:nth-child(even) td { background: #f8fafc; }
  .totals { margin-top: 6px; text-align: right; font-size: 10px; font-weight: bold; }
  .foot { margin-top: 14px; display: flex; justify-content: space-between; font-size: 9px; }
</style>
</head><body>
<h2>فارم نمبر 1 روبکاری رجسٹر</h2>
<div class="meta">
  راجباہ/مائنر: ${rajbah} &nbsp;|&nbsp; موگہ/آر ڈی: ${mogaRD} &nbsp;|&nbsp; موضع: ${village} &nbsp;|&nbsp; تحصیل: ${tehsil} &nbsp;|&nbsp; ضلع: ${district}
</div>
<table>
  <thead>
    <tr>
      <th rowspan="2">1<br/>نمبر شمار</th>
      <th rowspan="2">2<br/>راجباہ/مائنر</th>
      <th rowspan="2">3<br/>نمبر موگہ RD</th>
      <th colspan="2">4<br/>دوامی</th>
      <th colspan="2">5<br/>غیر دوامی</th>
      <th rowspan="2">6<br/>نمبر کھاتہ</th>
      <th rowspan="2">7<br/>نام مالک/معہ ولدیت/قومیت/سکونت</th>
      <th colspan="2">8<br/>نمبر خسرہ بندوبست</th>
      <th colspan="2">9<br/>رقبہ</th>
      <th colspan="2">10<br/>فش فارم</th>
      <th colspan="2">11<br/>باغ منظورشدہ</th>
      <th colspan="2">12<br/>پیڈک ایریا</th>
      <th rowspan="2">13<br/>کیفیت</th>
    </tr>
    <tr class="group-head">
      <th>کنال</th><th>مرلہ</th>
      <th>کنال</th><th>مرلہ</th>
      <th>مربع</th><th>کیلہ</th>
      <th>کنال</th><th>مرلہ</th>
      <th>کنال</th><th>مرلہ</th>
      <th>کنال</th><th>مرلہ</th>
      <th>کنال</th><th>مرلہ</th>
    </tr>
  </thead>
  <tbody>${bodyRows}</tbody>
</table>
<div class="totals">کل رقبہ: ${groups.reduce((s, g) => { const t = groupTotals(g.items); return s + t.kanal + t.marla / 20; }, 0).toFixed(2)} کنال</div>
<div class="foot">
  <span>گرداور: _______________</span>
  <span>پٹواری: _______________</span>
  <span>ضلعدار: _______________</span>
</div>
</body></html>`;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function Form1Register() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const { data: registers = [], isLoading } = useQuery({
    queryKey: ["form1-registers-all"],
    queryFn: () => base44.entities.Form1Register.list("-updated_date", 200),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return registers;
    const s = search.toLowerCase();
    return registers.filter(r =>
      (r.map_title || "").toLowerCase().includes(s) ||
      (r.moga_number || "").toLowerCase().includes(s) ||
      (r.village || "").toLowerCase().includes(s) ||
      (r.channel_name || "").toLowerCase().includes(s)
    );
  }, [registers, search]);

  const handlePrint = (reg) => {
    const rows = parseRows(reg.rows_json);
    const groups = groupAllocations(rows);
    if (groups.length === 0) { alert("اس رجسٹر میں کوئی ڈیٹا نہیں"); return; }
    const html = buildPrintHTML(reg, groups);
    const win = window.open("", "_blank");
    if (!win) { alert("پاپ اپ بلاک ہے — اجازت دیں"); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 800);
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-8" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg safe-top">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-colors tap-target">
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <div>
              <h1 className="text-sm font-bold tracking-wide">فارم نمبر 1 رجسٹر</h1>
              <p className="text-[9px] text-amber-100 font-mono" dir="ltr">Form 1 Register — Rubkari</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="تلاش کریں — موگہ، نام، گاؤں..."
            className="w-full h-10 pr-9 pl-3 rounded-xl border border-slate-300 bg-white text-sm text-right placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
            dir="rtl"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">کوئی رجسٹر نہیں ملا</p>
            <p className="text-xs mt-1 text-slate-400">جیو میپ میں پیچ الاٹ کر کے رجسٹر محفوظ کریں</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(reg => {
              const rows = parseRows(reg.rows_json);
              const groups = groupAllocations(rows);
              const isOpen = expandedId === reg.id;

              return (
                <div key={reg.id} className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
                  {/* Card Header */}
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-amber-50 transition-colors"
                    onClick={() => setExpandedId(isOpen ? null : reg.id)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-amber-700" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-800">{reg.map_title || "بے نام"}</p>
                        <p className="text-[10px] text-slate-500">
                          موگہ: {reg.moga_number || "—"} &nbsp;|&nbsp; {reg.channel_name || "—"} &nbsp;|&nbsp; {reg.mouza || reg.village || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        {groups.length} زمیندار
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); handlePrint(reg); }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors tap-target"
                        title="پرنٹ / PDF"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </div>
                  </div>

                  {/* Expanded Table — exact PDF column layout */}
                  {isOpen && (
                    <div className="border-t border-slate-200 overflow-x-auto">
                      {groups.length === 0 ? (
                        <div className="py-6 text-center text-slate-400 text-sm">ابھی کوئی ڈیٹا نہیں</div>
                      ) : (
                        <table className="w-full text-[9px] border-collapse min-w-[900px]" dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', Arial, sans-serif" }}>
                          <thead>
                            <tr className="bg-[#1e3a5f] text-white">
                              <th rowSpan={2} className="border border-slate-600 px-1 py-1 min-w-[24px]">نمبر شمار<br/><span className="text-[7px]">1</span></th>
                              <th rowSpan={2} className="border border-slate-600 px-1 py-1 min-w-[54px]">راجباہ/مائنر<br/><span className="text-[7px]">2</span></th>
                              <th rowSpan={2} className="border border-slate-600 px-1 py-1 min-w-[50px]">نمبر موگہ RD<br/><span className="text-[7px]">3</span></th>
                              <th colSpan={2} className="border border-slate-600 px-1 py-0.5">دوامی<br/><span className="text-[7px]">4</span></th>
                              <th colSpan={2} className="border border-slate-600 px-1 py-0.5">غیر دوامی<br/><span className="text-[7px]">5</span></th>
                              <th rowSpan={2} className="border border-slate-600 px-1 py-1 min-w-[30px]">نمبر کھاتہ<br/><span className="text-[7px]">6</span></th>
                              <th rowSpan={2} className="border border-slate-600 px-1 py-1 min-w-[110px]">نام مالک/معہ ولدیت/قومیت/سکونت<br/><span className="text-[7px]">7</span></th>
                              <th colSpan={2} className="border border-slate-600 px-1 py-0.5">نمبر خسرہ بندوبست<br/><span className="text-[7px]">8</span></th>
                              <th colSpan={2} className="border border-slate-600 px-1 py-0.5">رقبہ<br/><span className="text-[7px]">9</span></th>
                              <th colSpan={2} className="border border-slate-600 px-1 py-0.5">فش فارم<br/><span className="text-[7px]">10</span></th>
                              <th colSpan={2} className="border border-slate-600 px-1 py-0.5">باغ منظورشدہ<br/><span className="text-[7px]">11</span></th>
                              <th colSpan={2} className="border border-slate-600 px-1 py-0.5">پیڈک ایریا<br/><span className="text-[7px]">12</span></th>
                              <th rowSpan={2} className="border border-slate-600 px-1 py-1 min-w-[40px]">کیفیت<br/><span className="text-[7px]">13</span></th>
                            </tr>
                            <tr className="bg-blue-100 text-blue-900 text-[8px]">
                              <th className="border border-slate-400 px-1 py-0.5">کنال</th><th className="border border-slate-400 px-1 py-0.5">مرلہ</th>
                              <th className="border border-slate-400 px-1 py-0.5">کنال</th><th className="border border-slate-400 px-1 py-0.5">مرلہ</th>
                              <th className="border border-slate-400 px-1 py-0.5">مربع</th><th className="border border-slate-400 px-1 py-0.5">کیلہ</th>
                              <th className="border border-slate-400 px-1 py-0.5">کنال</th><th className="border border-slate-400 px-1 py-0.5">مرلہ</th>
                              <th className="border border-slate-400 px-1 py-0.5">کنال</th><th className="border border-slate-400 px-1 py-0.5">مرلہ</th>
                              <th className="border border-slate-400 px-1 py-0.5">کنال</th><th className="border border-slate-400 px-1 py-0.5">مرلہ</th>
                              <th className="border border-slate-400 px-1 py-0.5">کنال</th><th className="border border-slate-400 px-1 py-0.5">مرلہ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groups.map((g) => {
                              const tot = groupTotals(g.items);
                              const acres = farmerAcres(g.items);
                              const rowCount = Math.max(acres.length, 1);
                              const mogaRD = `${reg.moga_number || ""}${reg.outlet_side ? `-${reg.outlet_side}` : ""}`;
                              return Array.from({ length: rowCount }).map((_, ai) => {
                                const acre = acres[ai] || {};
                                const isFirst = ai === 0;
                                return (
                                  <tr key={`${g.key}-${ai}`} className={ai % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                    {isFirst && (
                                      <>
                                        <td rowSpan={rowCount} className="border border-slate-300 text-center font-bold text-slate-700 bg-slate-100">{g.serial}</td>
                                        <td rowSpan={rowCount} className="border border-slate-300 text-center text-[8px]">{reg.channel_name || ""}</td>
                                        <td rowSpan={rowCount} className="border border-slate-300 text-center text-[8px] font-mono">{mogaRD}</td>
                                        {/* دوامی */}
                                        <td rowSpan={rowCount} className="border border-slate-300 text-center"></td>
                                        <td rowSpan={rowCount} className="border border-slate-300 text-center"></td>
                                        {/* غیر دوامی */}
                                        <td rowSpan={rowCount} className="border border-slate-300 text-center"></td>
                                        <td rowSpan={rowCount} className="border border-slate-300 text-center"></td>
                                        {/* نمبر کھاتہ */}
                                        <td rowSpan={rowCount} className="border border-slate-300 text-center font-mono">{g.khata_no}</td>
                                        {/* نام */}
                                        <td rowSpan={rowCount} className="border border-slate-300 text-right px-2 text-[9px]">
                                          <div className="font-bold">{g.farmer_name}</div>
                                          <div className="text-[8px] text-slate-500">ولد: {g.father}</div>
                                          <div className="text-[7px] font-mono text-slate-400">{g.cnic}</div>
                                        </td>
                                      </>
                                    )}
                                    {/* مربع / کیلہ */}
                                    <td className="border border-slate-300 text-center font-mono">{acre.murba || ""}</td>
                                    <td className="border border-slate-300 text-center font-mono">{acre.killa || ""}</td>
                                    {/* رقبہ */}
                                    <td className="border border-slate-300 text-center font-bold text-blue-700">{acre.kanal || ""}</td>
                                    <td className="border border-slate-300 text-center text-blue-600">{isFirst ? (tot.marla || "0") : ""}</td>
                                    {/* فش فارم */}
                                    <td className="border border-slate-300"></td><td className="border border-slate-300"></td>
                                    {/* باغ */}
                                    <td className="border border-slate-300"></td><td className="border border-slate-300"></td>
                                    {/* پیڈک */}
                                    <td className="border border-slate-300"></td><td className="border border-slate-300"></td>
                                    {/* کیفیت */}
                                    <td className="border border-slate-300 text-center text-[8px] text-emerald-700">{acre.crop || ""}</td>
                                  </tr>
                                );
                              });
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}