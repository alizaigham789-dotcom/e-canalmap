import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Printer, FileText, Search, ChevronDown, Layers, MapPin } from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// Pakistani CNIC format: 12345-1234567-1
function formatCNIC(cnic) {
  const s = String(cnic || "").replace(/\D/g, "");
  if (s.length === 13) return `${s.slice(0, 5)}-${s.slice(5, 12)}-${s.slice(12)}`;
  return cnic || "";
}

// Pakistani mobile format: 0300-1234567
function formatPhone(phone) {
  const s = String(phone || "").replace(/\D/g, "");
  if (s.length === 11 && s.startsWith("0")) return `${s.slice(0, 4)}-${s.slice(4)}`;
  return phone || "";
}

// Total area as "X ایکر Y کنال"
function fmtArea(kanal, marla) {
  let totalKanal = (kanal || 0) + (marla || 0) / 20;
  const acres = Math.floor(totalKanal / 8);
  const remK = Math.round(totalKanal % 8);
  return `${acres} ایکڑ ${remK} کنال`;
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
      map.set(key, { key, serial: serial++, farmer_name: a.farmer_name || "", father: a.father || "", cnic: a.cnic || "", khata_no: a.khata_no || "", phone: a.phone || "", tenure: a.tenure || "", land_type: a.land_type || "", crop_name: a.crop_name || "", moga_number: "", channel_name: "", outlet_side: "", items: [] });
    }
    const g = map.get(key);
    const pick = (k) => { if (!g[k] && a[k]) g[k] = a[k]; };
    pick("father"); pick("cnic"); pick("khata_no"); pick("phone"); pick("tenure"); pick("land_type"); pick("crop_name");
    pick("moga_number"); pick("channel_name"); pick("outlet_side");
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
function buildPrintHTML(meta, groups, mode = "moga") {
  const village = esc(meta.mouza || meta.village || "");
  const tehsil = esc(meta.tehsil || "");
  const district = esc(meta.district || "");
  const title = mode === "mouza" ? "فارم نمبر 1 روبکاری رجسٹر (موضع وار)" : "فارم نمبر 1 روبکاری رجسٹر";

  let bodyRows = "";
  for (const g of groups) {
    const tot = groupTotals(g.items);
    const acres = farmerAcres(g.items);
    const cnicFmt = formatCNIC(g.cnic);
    const phoneFmt = formatPhone(g.phone);
    const areaStr = fmtArea(tot.kanal, tot.marla);
    const gMoga = `${g.moga_number || meta.moga_number || ""}${g.outlet_side || meta.outlet_side ? `-${g.outlet_side || meta.outlet_side}` : ""}`;
    const gRajbah = g.channel_name || meta.channel_name || "";
    const nameCell = `
      <div class="fname">${esc(g.farmer_name)}</div>
      <div class="fsub">ولد: ${esc(g.father)}</div>
      <div class="fcnic">شناختی کارڈ: ${esc(cnicFmt)}</div>
      <div class="fphone">فون نمبر: ${esc(phoneFmt)}</div>
      <div class="ftot">کل رقبہ: ${esc(areaStr)}</div>`;

    const rowCount = Math.max(acres.length, 1);

    for (let ai = 0; ai < rowCount; ai++) {
      const acre = acres[ai] || {};
      const isFirst = ai === 0;
      bodyRows += `<tr>`;
      if (isFirst) {
        bodyRows += `<td class="sr" rowspan="${rowCount}">${g.serial}</td>`;
        bodyRows += `<td rowspan="${rowCount}" class="rajbah">${esc(gRajbah)}</td>`;
        bodyRows += `<td rowspan="${rowCount}" class="moga">${esc(gMoga)}</td>`;
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
  body { font-family: 'Noto Nastaliq Urdu', Arial, sans-serif; direction: rtl; font-size: 8px; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h2 { text-align: center; font-size: 24px; margin: 0 0 4px; color: #000; }
  .meta { text-align: center; font-size: 14px; margin-bottom: 8px; color: #000; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 3px 4px; vertical-align: middle; text-align: center; word-break: break-word; color: #000; }
  thead th { background: #e1ebff; color: #000; font-size: 20px; font-weight: 700; white-space: nowrap; }
  .group-head th { background: #dbe5ff; color: #000; font-size: 16px; white-space: nowrap; }
  .sr { font-weight: 700; font-size: 16px; background: #f1f5f9 !important; min-width: 28px; color: #000; }
  .name { text-align: right; padding: 3px 5px; min-width: 130px; }
  .fname { font-size: 16px; font-weight: 700; color: #000; white-space: nowrap; }
  .fsub { font-size: 16px; color: #000; margin-top: 2px; font-weight: 700; white-space: nowrap; }
  .fcnic { font-size: 16px; color: #000; margin-top: 2px; }
  .fphone { font-size: 16px; color: #000; margin-top: 2px; }
  .ftot { font-size: 12px; color: #000; font-weight: 700; margin-top: 2px; }
  .rajbah { min-width: 60px; font-size: 16px; font-weight: 700; color: #000; }
  .moga { min-width: 56px; font-size: 16px; font-weight: 700; color: #000; }
  .khata { min-width: 34px; font-size: 12px; color: #000; }
  .murba, .killa { min-width: 24px; font-size: 11px; color: #000; }
  .raqba { min-width: 22px; font-size: 11px; color: #000; }
  .fishfarm, .bagh, .paddy { min-width: 22px; }
  .kaifiyat { min-width: 40px; font-size: 10px; color: #000; }
  .dawami { min-width: 22px; }
  tr:nth-child(even) td { background: #f8fafc; }
  .totals { margin-top: 8px; text-align: right; font-size: 14px; font-weight: bold; color: #000; }
  .foot { margin-top: 16px; display: flex; justify-content: space-between; font-size: 12px; color: #000; }
</style>
</head><body>
<h2>${title}</h2>
<div class="meta">
  موضع: ${village} &nbsp;|&nbsp; تحصیل: ${tehsil} &nbsp;|&nbsp; ضلع: ${district}
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
  const [viewMode, setViewMode] = useState("moga"); // "moga" | "mouza"
  const [expandedId, setExpandedId] = useState(null);

  const { data: registers = [], isLoading } = useQuery({
    queryKey: ["form1-registers-all"],
    queryFn: () => base44.entities.Form1Register.list("-updated_date", 200),
  });

  // Mouza-wise: group registers by village/mouza, combine their rows (tagged with moga)
  const mouzaGroups = useMemo(() => {
    const map = new Map();
    for (const r of registers) {
      const key = r.mouza || r.village || "بے نام";
      if (!map.has(key)) {
        map.set(key, { key, mouza: key, village: r.village || "", tehsil: r.tehsil || "", district: r.district || "", registers: [], allRows: [] });
      }
      const g = map.get(key);
      g.registers.push(r);
      const rows = parseRows(r.rows_json).map(row => ({ ...row, moga_number: r.moga_number || "", channel_name: r.channel_name || "", outlet_side: r.outlet_side || "" }));
      g.allRows.push(...rows);
    }
    return [...map.values()];
  }, [registers]);

  const filteredMoga = useMemo(() => {
    if (!search.trim()) return registers;
    const s = search.toLowerCase();
    return registers.filter(r =>
      (r.map_title || "").toLowerCase().includes(s) ||
      (r.moga_number || "").toLowerCase().includes(s) ||
      (r.village || "").toLowerCase().includes(s) ||
      (r.channel_name || "").toLowerCase().includes(s)
    );
  }, [registers, search]);

  const filteredMouza = useMemo(() => {
    if (!search.trim()) return mouzaGroups;
    const s = search.toLowerCase();
    return mouzaGroups.filter(g =>
      g.mouza.toLowerCase().includes(s) ||
      g.tehsil.toLowerCase().includes(s)
    );
  }, [mouzaGroups, search]);

  const handlePrintMoga = (reg) => {
    const rows = parseRows(reg.rows_json).map(row => ({ ...row, moga_number: reg.moga_number || "", channel_name: reg.channel_name || "", outlet_side: reg.outlet_side || "" }));
    const groups = groupAllocations(rows);
    if (groups.length === 0) { alert("اس رجسٹر میں کوئی ڈیٹا نہیں"); return; }
    const html = buildPrintHTML(reg, groups, "moga");
    const win = window.open("", "_blank");
    if (!win) { alert("پاپ اپ بلاک ہے — اجازت دیں"); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 800);
  };

  const handlePrintMouza = (mg) => {
    const groups = groupAllocations(mg.allRows);
    if (groups.length === 0) { alert("اس موضع میں کوئی ڈیٹا نہیں"); return; }
    const meta = { mouza: mg.mouza, village: mg.village, tehsil: mg.tehsil, district: mg.district };
    const html = buildPrintHTML(meta, groups, "mouza");
    const win = window.open("", "_blank");
    if (!win) { alert("پاپ اپ بلاک ہے — اجازت دیں"); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 800);
  };

  // Shared table renderer (on-screen)
  const renderTable = (groups) => {
    return (
      <table className="w-full text-[9px] border-collapse min-w-[900px] [&_th]:whitespace-nowrap" dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', Arial, sans-serif" }}>
        <thead>
          <tr className="bg-[#e1ebff] text-black">
            <th rowSpan={2} className="border border-slate-500 px-1 py-1.5 min-w-[28px] text-base">نمبر شمار<br/><span className="text-[8px]">1</span></th>
            <th rowSpan={2} className="border border-slate-500 px-1 py-1.5 min-w-[64px] text-base">راجباہ/مائنر<br/><span className="text-[8px]">2</span></th>
            <th rowSpan={2} className="border border-slate-500 px-1 py-1.5 min-w-[60px] text-base">نمبر موگہ RD<br/><span className="text-[8px]">3</span></th>
            <th colSpan={2} className="border border-slate-500 px-1 py-1 text-base">دوامی<br/><span className="text-[8px]">4</span></th>
            <th colSpan={2} className="border border-slate-500 px-1 py-1 text-base">غیر دوامی<br/><span className="text-[8px]">5</span></th>
            <th rowSpan={2} className="border border-slate-500 px-1 py-1.5 min-w-[34px] text-base">نمبر کھاتہ<br/><span className="text-[8px]">6</span></th>
            <th rowSpan={2} className="border border-slate-500 px-1 py-1.5 min-w-[150px] text-base">نام مالک/معہ ولدیت/قومیت/سکونت<br/><span className="text-[8px]">7</span></th>
            <th colSpan={2} className="border border-slate-500 px-1 py-1 text-base">نمبر خسرہ بندوبست<br/><span className="text-[8px]">8</span></th>
            <th colSpan={2} className="border border-slate-500 px-1 py-1 text-base">رقبہ<br/><span className="text-[8px]">9</span></th>
            <th colSpan={2} className="border border-slate-500 px-1 py-1 text-base">فش فارم<br/><span className="text-[8px]">10</span></th>
            <th colSpan={2} className="border border-slate-500 px-1 py-1 text-base">باغ منظورشدہ<br/><span className="text-[8px]">11</span></th>
            <th colSpan={2} className="border border-slate-500 px-1 py-1 text-base">پیڈک ایریا<br/><span className="text-[8px]">12</span></th>
            <th rowSpan={2} className="border border-slate-500 px-1 py-1.5 min-w-[44px] text-base">کیفیت<br/><span className="text-[8px]">13</span></th>
          </tr>
          <tr className="bg-[#dbe5ff] text-black text-[10px]">
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
            const gMoga = `${g.moga_number || ""}${g.outlet_side ? `-${g.outlet_side}` : ""}`;
            return Array.from({ length: rowCount }).map((_, ai) => {
              const acre = acres[ai] || {};
              const isFirst = ai === 0;
              return (
                <tr key={`${g.key}-${ai}`} className={ai % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  {isFirst && (
                    <>
                      <td rowSpan={rowCount} className="border border-slate-300 text-center font-bold text-slate-700 bg-slate-100 text-base text-black">{g.serial}</td>
                      <td rowSpan={rowCount} className="border border-slate-300 text-center text-sm font-bold text-black">{g.channel_name || ""}</td>
                      <td rowSpan={rowCount} className="border border-slate-300 text-center text-sm font-bold text-black font-mono">{gMoga}</td>
                      <td rowSpan={rowCount} className="border border-slate-300 text-center"></td>
                      <td rowSpan={rowCount} className="border border-slate-300 text-center"></td>
                      <td rowSpan={rowCount} className="border border-slate-300 text-center"></td>
                      <td rowSpan={rowCount} className="border border-slate-300 text-center"></td>
                      <td rowSpan={rowCount} className="border border-slate-300 text-center font-mono text-xs text-black">{g.khata_no}</td>
                      <td rowSpan={rowCount} className="border border-slate-300 text-right px-2">
                        <div className="text-lg font-bold text-black whitespace-nowrap">{g.farmer_name}</div>
                        <div className="text-lg font-bold text-black mt-0.5 whitespace-nowrap">ولد: {g.father}</div>
                        <div className="text-lg text-black mt-0.5">شناختی کارڈ: {formatCNIC(g.cnic)}</div>
                        <div className="text-lg text-black mt-0.5">فون نمبر: {formatPhone(g.phone)}</div>
                        <div className="text-sm font-bold text-black mt-0.5">کل رقبہ: {fmtArea(tot.kanal, tot.marla)}</div>
                      </td>
                    </>
                  )}
                  <td className="border border-slate-300 text-center font-mono text-black">{acre.murba || ""}</td>
                  <td className="border border-slate-300 text-center font-mono text-black">{acre.killa || ""}</td>
                  <td className="border border-slate-300 text-center font-bold text-blue-700">{acre.kanal || ""}</td>
                  <td className="border border-slate-300 text-center text-blue-600">{isFirst ? (tot.marla || "0") : ""}</td>
                  <td className="border border-slate-300"></td><td className="border border-slate-300"></td>
                  <td className="border border-slate-300"></td><td className="border border-slate-300"></td>
                  <td className="border border-slate-300"></td><td className="border border-slate-300"></td>
                  <td className="border border-slate-300 text-center text-[8px] text-emerald-700">{acre.crop || ""}</td>
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    );
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
        {/* View mode toggle */}
        <div className="flex items-center gap-2 mb-3 bg-white rounded-xl p-1.5 shadow-sm border border-slate-200">
          <button
            onClick={() => setViewMode("moga")}
            className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-bold transition-all ${viewMode === "moga" ? "bg-amber-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}
          >
            <MapPin className="w-3.5 h-3.5" /> موگے وار (Moga-wise)
          </button>
          <button
            onClick={() => setViewMode("mouza")}
            className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-bold transition-all ${viewMode === "mouza" ? "bg-purple-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}
          >
            <Layers className="w-3.5 h-3.5" /> موضع وار (Mouza-wise)
          </button>
        </div>

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
        ) : viewMode === "moga" ? (
          filteredMoga.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">کوئی رجسٹر نہیں ملا</p>
              <p className="text-xs mt-1 text-slate-400">جیو میپ میں پیچ الاٹ کر کے رجسٹر محفوظ کریں</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMoga.map(reg => {
                const rows = parseRows(reg.rows_json).map(row => ({ ...row, moga_number: reg.moga_number || "", channel_name: reg.channel_name || "", outlet_side: reg.outlet_side || "" }));
                const groups = groupAllocations(rows);
                const isOpen = expandedId === reg.id;
                return (
                  <div key={reg.id} className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
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
                          onClick={e => { e.stopPropagation(); handlePrintMoga(reg); }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors tap-target"
                          title="پرنٹ / PDF"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                    {isOpen && (
                      <div className="border-t border-slate-200 overflow-x-auto">
                        {groups.length === 0 ? (
                          <div className="py-6 text-center text-slate-400 text-sm">ابھی کوئی ڈیٹا نہیں</div>
                        ) : renderTable(groups)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Mouza-wise view */
          filteredMouza.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">کوئی موضع نہیں ملا</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMouza.map(mg => {
                const groups = groupAllocations(mg.allRows);
                const isOpen = expandedId === `mouza-${mg.key}`;
                return (
                  <div key={mg.key} className="bg-white rounded-2xl shadow border border-purple-200 overflow-hidden">
                    <div
                      className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-purple-50 transition-colors"
                      onClick={() => setExpandedId(isOpen ? null : `mouza-${mg.key}`)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                          <Layers className="w-4 h-4 text-purple-700" />
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-800">موضع: {mg.mouza}</p>
                          <p className="text-[10px] text-slate-500">
                            {mg.tehsil || "—"} &nbsp;|&nbsp; {mg.district || "—"} &nbsp;|&nbsp; {mg.registers.length} موگے
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          {groups.length} زمیندار
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); handlePrintMouza(mg); }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors tap-target"
                          title="پورے موضع کا پرنٹ / PDF"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                    {isOpen && (
                      <div className="border-t border-slate-200 overflow-x-auto">
                        {groups.length === 0 ? (
                          <div className="py-6 text-center text-slate-400 text-sm">ابھی کوئی ڈیٹا نہیں</div>
                        ) : renderTable(groups)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </main>
    </div>
  );
}