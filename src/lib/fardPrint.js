// Print / PDF builder for Fard Masrooba records.
// Opens a dedicated print window (browser dialog → print or "Save as PDF").
// The قاصرین کی فہرست (list of shareholders) is auto-generated from the fard
// rows and appended as a separate page; it can also be printed standalone.
import { openPrintWindow } from "@/lib/paratPrint";

const URDU_FONT = "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif";

function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildHeader(rec) {
  const mogha = rec.mogha_number ? `${rec.mogha_number}${rec.mogha_side ? `/${rec.mogha_side}` : ""}` : "_____";
  // Each field auto-detects direction: English/Latin → LTR, Urdu → RTL.
  const F = (v) => `<span dir="auto" style="unicode-bidi:isolate">${esc(v || "_____")}</span>`;
  const villageTxt = rec.village2 ? `${F(rec.village)} و ${F(rec.village2)}` : F(rec.village);
  // Mogha number forced LTR so "6000/L" reads left-to-right inside the Urdu RTL line.
  return `فرد مسروبہ ناجائز آبپاشی موگہ نمبری <span dir="ltr" style="display:inline-block">${esc(mogha)}</span>، راجباہ ${F(rec.rajbah)}، موضع ${villageTxt}، ضلعداری سیکشن ${F(rec.section)}، سب ڈویژن ${F(rec.tehsil)}، کینال ڈویژن ${F(rec.district)}`;
}

// Stacked fraction (mustateel over killa) — matches parat warabandi bandubast style
function fracHtml(val) {
  if (!val) return "&nbsp;";
  return String(val).split(",").map((e) => {
    const p = e.trim().split("/");
    if (p.length >= 2) return `<span class="frac"><span class="num">${esc(p[0])}</span><span>${esc(p.slice(1).join("/"))}</span></span>`;
    return `<span>${esc(e.trim())}</span>`;
  }).join(", ");
}

const PRINT_CSS = `
  @page { size: A4; margin: 12mm; @top-left { content: ""; } @top-center { content: ""; } @top-right { content: ""; } @bottom-left { content: ""; } @bottom-center { content: ""; } @bottom-right { content: ""; } }
  body { font-family: ${URDU_FONT}; color: #111; direction: rtl; }
  .hdr { text-align: center; font-size: 16px; font-weight: bold; border: 2px solid #1e3a5f; padding: 8px; margin-bottom: 10px; line-height: 1.9; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #333; padding: 4px 5px; font-size: 12px; text-align: center; }
  th { background: #e2e8f0; font-weight: bold; }
  .tot { background: #fef9e7; font-weight: bold; }
  .total { font-size: 13px; font-weight: bold; margin-top: 6px; }
  .sig { display: flex; justify-content: space-between; margin-top: 55px; font-size: 12px; }
  .frac { display: inline-flex; flex-direction: column; align-items: center; line-height: 1; margin: 0 3px; }
  .frac .num { border-bottom: 1px solid #333; padding: 0 3px; }
`;

// قاصرین کی فہرست — unique farmer names from the fard rows (auto-generated)
function buildQasiran(rows) {
  const seen = new Set();
  const qasiran = [];
  rows.forEach((r) => {
    const name = (r.name || "").trim();
    if (name && !seen.has(name)) { seen.add(name); qasiran.push(name); }
  });
  return qasiran;
}

function qasiranPageHtml(headerLine, qasiran, pageBreak) {
  const rowsHtml = qasiran.length
    ? qasiran.map((name, i) => `<tr><td>${i + 1}</td><td style="text-align:right">${esc(name)}</td></tr>`).join("")
    : '<tr><td colspan="2" style="text-align:center;color:#999">کوئی قاصر نہیں</td></tr>';
  return `
    ${pageBreak ? '<div style="page-break-before: always;"></div>' : ''}
    <div class="hdr">${headerLine}</div>
    <div style="text-align:center;font-size:15px;font-weight:bold;margin:8px 0;">قاصرین کی فہرست</div>
    <table>
      <thead><tr>
        <th style="width:10%">نمبر شمار</th>
        <th>نام و ولدیت</th>
      </tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <div class="sig">
      <div>دستخط پٹواری<br/><br/><br/>__________________</div>
      <div style="text-align:center">دستخط ظلعدار<br/><br/><br/>__________________</div>
    </div>`;
}

export function printFardRecord(rec) {
  let rows = [];
  try { rows = JSON.parse(rec.rows_json || "[]"); } catch { rows = []; }
  const totalAbiana = rows.reduce((s, r) => s + (parseFloat(r.abiana) || 0), 0);
  const totalArea = rows.reduce((s, r) => s + (parseFloat(r.area) || 0), 0);
  const headerLine = buildHeader(rec);
  const qasiran = buildQasiran(rows);

  const rowsHtml = rows.map((r, i) => {
    const mozahName = rec.village2 && r.mozah === "1" ? (rec.village || "") : rec.village2 && r.mozah === "2" ? (rec.village2 || "") : "";
    const nameCell = (r.name ? esc(r.name) : "&nbsp;") + (mozahName ? ` (${esc(mozahName)})` : "");
    return `<tr>
      <td>${i + 1}</td>
      <td style="text-align:right">${nameCell}</td>
      <td>${fracHtml(r.khasra)}</td>
      <td>${esc(r.area) || "&nbsp;"}</td>
      <td>${esc(r.crop) || "&nbsp;"}</td>
      <td>${r.abiana ? esc(r.abiana) + "/-" : "&nbsp;"}</td>
      <td>${esc(r.phone) || "&nbsp;"}</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html dir="rtl" lang="ur"><head><meta charset="utf-8"><title></title><style>${PRINT_CSS}</style></head>
  <body>
    <div class="hdr">${headerLine}</div>
    <table>
      <thead><tr>
        <th style="width:6%">نمبر شمار</th>
        <th>نام و ولدیت</th>
        <th>خسرہ نمبران</th>
        <th style="width:9%">رقبہ</th>
        <th style="width:10%">فصل</th>
        <th style="width:11%">آبیانہ</th>
        <th style="width:12%">فون نمبر</th>
      </tr></thead>
      <tbody>
        ${rowsHtml}
        <tr class="tot"><td colspan="3">کل</td><td>${totalArea || ""}</td><td></td><td>${totalAbiana}/-</td><td></td></tr>
      </tbody>
    </table>
    <div class="total">کل رقم: ${totalAbiana}/-</div>
    <div class="sig">
      <div>دستخط پٹواری<br/><br/><br/>__________________</div>
      <div style="text-align:center">دستخط ظلعدار<br/><br/><br/>__________________</div>
    </div>
    ${qasiranPageHtml(headerLine, qasiran, true)}
  </body></html>`;

  openPrintWindow(html);
}

// Standalone print of just the قاصرین کی فہرست (auto-generated from fard rows)
export function printQasiranList(rec) {
  let rows = [];
  try { rows = JSON.parse(rec.rows_json || "[]"); } catch { rows = []; }
  const headerLine = buildHeader(rec);
  const qasiran = buildQasiran(rows);

  const html = `<!DOCTYPE html><html dir="rtl" lang="ur"><head><meta charset="utf-8"><title></title><style>${PRINT_CSS}</style></head>
  <body>
    ${qasiranPageHtml(headerLine, qasiran, false)}
  </body></html>`;

  openPrintWindow(html);
}