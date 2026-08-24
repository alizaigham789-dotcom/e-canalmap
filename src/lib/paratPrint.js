// Batch PDF/print builder for Parat Warabandi records.
// Replicates the PrintModal table structure as HTML strings so multiple
// selected records can be printed in a single window with a preview.

const COL_LETTERS = ["ا","ب","ج","د","ہ","و","ز","ح","ط","ی","ک","ل","م","ن","س","ع","ف","ص","ق","ر","ش","ت","ث","خ"];

const S = {
  thP: "border:1.5px solid #1e3a5f;padding:4px 5px;text-align:center;background-color:#dbeafe;font-size:12px;font-weight:bold;font-family:'Noto Nastaliq Urdu',serif;color:#1e3a5f",
  thPL: "border:1.5px solid #1e3a5f;padding:4px 5px;text-align:center;background-color:#f0f4ff;font-size:7px;font-weight:bold;font-family:'Noto Nastaliq Urdu',serif;color:#1e3a5f",
  thSub: "border:1.5px solid #1e3a5f;padding:2px 3px;text-align:center;background-color:#eff6ff;font-size:9px;font-weight:bold;font-family:'Noto Nastaliq Urdu',serif;color:#1e3a5f",
  td: "border:1.5px solid #555;padding:2px 3px;text-align:center;font-size:8px;font-family:'Noto Nastaliq Urdu',serif",
  tdR: "border:1.5px solid #555;padding:2px 3px;text-align:right;font-size:8px;font-family:'Noto Nastaliq Urdu',serif",
  tt: "border:1.5px solid #333;padding:2px 3px;text-align:center;font-size:8px;font-weight:bold;background-color:#fef9e7;font-family:'Noto Nastaliq Urdu',serif",
  ttR: "border:1.5px solid #333;padding:2px 3px;text-align:right;font-size:8px;font-weight:bold;background-color:#fef9e7;font-family:'Noto Nastaliq Urdu',serif",
  caption: "text-align:center;font-size:16px;font-weight:bold;margin-top:6px;margin-bottom:22px;padding-top:10px;padding-bottom:10px;border-bottom:1.5px solid #1e3a5f;font-family:'Noto Nastaliq Urdu',serif;color:#1e3a5f;line-height:2.2;letter-spacing:0.5px;word-spacing:0.3em;white-space:nowrap;caption-side:top",
};

function d(v) { return (v === "" || v === null || v === undefined) ? "-" : v; }
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

function fracHtml(val) {
  if (!val) return "-";
  const entries = String(val).split(",").map((e) => e.trim()).filter(Boolean);
  return entries.map((entry) => {
    const parts = entry.split("/");
    if (parts.length >= 2) {
      return `<span class="frac"><span class="num">${esc(parts[0])}</span><span>${esc(parts.slice(1).join("/"))}</span></span>`;
    }
    return `<span>${esc(entry)}</span>`;
  }).join(", ");
}

function sumCol(rows, key) {
  const s = rows.reduce((a, r) => a + (parseFloat(r[key]) || 0), 0);
  return s === 0 ? "-" : String(s % 1 === 0 ? s : s.toFixed(2));
}

function sumPair(rows, minKey, hrKey) {
  let total = 0;
  for (const r of rows) total += (parseFloat(r[hrKey]) || 0) * 60 + (parseFloat(r[minKey]) || 0);
  if (total === 0) return { m: "-", h: "-" };
  return { m: String(total % 60), h: String(Math.floor(total / 60)) };
}

export function buildParatRecordHTML(record, opts = {}) {
  const printRowSr = opts.printRowSr !== false;
  // Column number-shumar (column letters) is OFF by default per requirement.
  const printColSr = opts.printColSr === true;

  let data = {};
  try { data = JSON.parse(record.data_json || "{}"); } catch {}
  const h = data.header || {};
  const header = {
    mogha_number: record.mogha_number || h.mogha_number || "",
    mogha_side: record.mogha_side || h.mogha_side || "R",
    rajbaha: h.rajbaha || "",
    mouza: record.mouza || h.mouza || "",
    section: h.section || "",
    sub_division: h.sub_division || "",
    canal_division: h.canal_division || "",
  };
  const rows = data.rows || [];
  const notes = data.notes || [];
  const docType = record.doc_type || data.docType || "پرت وارہ بندی";
  const isJadeed = docType === "پرت وارہ بندی";
  const showSummary = !isJadeed;
  const moghaFull = `${header.mogha_number}/${header.mogha_side}`;

  const parts = [isJadeed ? "پرت وارابندی" : "کیس ترمیم وارابندی", "موگہ نمبری", moghaFull];
  if (header.rajbaha) parts.push(`راجباہ ${header.rajbaha}`);
  if (header.mouza) parts.push(`موضع ${header.mouza}`);
  if (header.section) parts.push(`سیکشن ${header.section}`);
  if (header.sub_division) parts.push(`سب ڈویژن ${header.sub_division}`);
  if (header.canal_division) parts.push(`کینال ڈویژن ${header.canal_division}`);
  const headerLineStr = parts
    .map((p) => (p === moghaFull
      ? `<span dir="ltr" style="unicode-bidi:isolate;display:inline-block">${esc(moghaFull)}</span>`
      : esc(p)))
    .join(" ");

  let colLettersRow = "";
  if (printColSr) {
    const cells = (printRowSr ? `<th style="${S.thPL}">#</th>` : "")
      + COL_LETTERS.slice(isJadeed ? 7 : 0).map((l) => `<th style="${S.thPL}">${l}</th>`).join("");
    colLettersRow = `<tr>${cells}</tr>`;
  }

  let mainHeader = "<tr>";
  if (printRowSr) mainHeader += `<th style="${S.thP}" rowspan="2">نمبرشمار</th>`;
  if (showSummary) {
    mainHeader += `<th style="${S.thP}" rowspan="2">کھاتہ نمبر</th>`;
    mainHeader += `<th style="${S.thP};min-width:70px" rowspan="2">نام مالک معہ والدیت</th>`;
    mainHeader += `<th style="${S.thP};min-width:80px" rowspan="2">نمبران بندوبست</th>`;
    mainHeader += `<th style="${S.thP}">کل رقبہ</th>`;
    mainHeader += `<th style="${S.thP}" colspan="2">خالص واری</th>`;
    mainHeader += `<th style="${S.thP}" colspan="2">نکہ جات</th>`;
  }
  mainHeader += `<th style="${S.thP}" rowspan="2">کھاتہ نمبر</th>`;
  mainHeader += `<th style="${S.thP};min-width:80px" rowspan="2">نام مالک معہ والدیت</th>`;
  mainHeader += `<th style="${S.thP};min-width:80px" rowspan="2">نمبران بندوبست</th>`;
  mainHeader += `<th style="${S.thP}">کل رقبہ</th>`;
  mainHeader += `<th style="${S.thP}">غیر ممکن رقبہ</th>`;
  mainHeader += `<th style="${S.thP}">خالص رقبہ</th>`;
  mainHeader += `<th style="${S.thP}" colspan="2">واری بحساب رقبہ</th>`;
  mainHeader += `<th style="${S.thP}" colspan="2">زائدہ وصولی</th>`;
  mainHeader += `<th style="${S.thP}" colspan="2">وضگی</th>`;
  mainHeader += `<th style="${S.thP}" colspan="2">خالص واری</th>`;
  mainHeader += `<th style="${S.thP}" colspan="2">نکہ جات</th>`;
  mainHeader += `<th style="${S.thP}" rowspan="2">تشریح اوقات دن</th>`;
  mainHeader += `<th style="${S.thP}" rowspan="2">تشریح اوقات رات</th>`;
  mainHeader += "</tr>";

  let subHeader = "<tr>";
  if (showSummary) {
    subHeader += `<th style="${S.thSub}">ایکڑ</th>`;
    subHeader += `<th style="${S.thSub}">منٹ</th><th style="${S.thSub}">گھنٹے</th>`;
    subHeader += `<th style="${S.thSub}">لیگا</th><th style="${S.thSub}">دیگا</th>`;
  }
  subHeader += `<th style="${S.thSub}">ایکڑ</th>`;
  subHeader += `<th style="${S.thSub}">ایکڑ</th>`;
  subHeader += `<th style="${S.thSub}">ایکڑ</th>`;
  subHeader += `<th style="${S.thSub}">منٹ</th><th style="${S.thSub}">گھنٹے</th>`;
  subHeader += `<th style="${S.thSub}">منٹ</th><th style="${S.thSub}">گھنٹے</th>`;
  subHeader += `<th style="${S.thSub}">منٹ</th><th style="${S.thSub}">گھنٹے</th>`;
  subHeader += `<th style="${S.thSub}">منٹ</th><th style="${S.thSub}">گھنٹے</th>`;
  subHeader += `<th style="${S.thSub}">لیگا</th><th style="${S.thSub}">دیگا</th>`;
  subHeader += "</tr>";

  const dataRows = rows.map((row, i) => {
    let r = "<tr>";
    if (printRowSr) r += `<td style="${S.td}">${i + 1}</td>`;
    if (showSummary) {
      r += `<td style="${S.td}">${esc(d(row.khatoni2))}</td>`;
      r += `<td style="${S.tdR}">${esc(d(row.owner_name2))}</td>`;
      r += `<td style="${S.td}">${row.bandubast2 ? fracHtml(row.bandubast2) : "-"}</td>`;
      r += `<td style="${S.td}">${esc(d(row.total_area2))}</td>`;
      r += `<td style="${S.td}">${esc(d(row.khalis_waari2_minute))}</td>`;
      r += `<td style="${S.td}">${esc(d(row.khalis_waari2_ghante))}</td>`;
      r += `<td style="${S.td}">${row.nikha2_lega ? fracHtml(row.nikha2_lega) : "-"}</td>`;
      r += `<td style="${S.td}">${row.nikha2_dega ? fracHtml(row.nikha2_dega) : "-"}</td>`;
    }
    r += `<td style="${S.td}">${esc(d(row.khatoni))}</td>`;
    r += `<td style="${S.tdR}">${esc(d(row.owner_name))}</td>`;
    r += `<td style="${S.td}">${row.bandubast ? fracHtml(row.bandubast) : "-"}</td>`;
    r += `<td style="${S.td}">${esc(d(row.total_area))}</td>`;
    r += `<td style="${S.td}">${esc(d(row.ghair_mumkin))}</td>`;
    r += `<td style="${S.td}">${esc(d(row.khalis_raqba))}</td>`;
    r += `<td style="${S.td}">${esc(d(row.waari_minute))}</td>`;
    r += `<td style="${S.td}">${esc(d(row.waari_ghante))}</td>`;
    r += `<td style="${S.td}">${esc(d(row.zaidah_minute))}</td>`;
    r += `<td style="${S.td}">${esc(d(row.zaidah_ghante))}</td>`;
    r += `<td style="${S.td}">${esc(d(row.wazgi_minute))}</td>`;
    r += `<td style="${S.td}">${esc(d(row.wazgi_ghante))}</td>`;
    r += `<td style="${S.td}">${esc(d(row.khalis_waari_minute))}</td>`;
    r += `<td style="${S.td}">${esc(d(row.khalis_waari_ghante))}</td>`;
    r += `<td style="${S.td}">${row.nikha_lega ? fracHtml(row.nikha_lega) : "-"}</td>`;
    r += `<td style="${S.td}">${row.nikha_dega ? fracHtml(row.nikha_dega) : "-"}</td>`;
    r += `<td style="${S.td}">${esc(d(row.tashreeh_din))}</td>`;
    r += `<td style="${S.td}">${esc(d(row.tashreeh_raat))}</td>`;
    r += "</tr>";
    return r;
  }).join("");

  const sp = (minKey, hrKey) => sumPair(rows, minKey, hrKey);
  let totalRow = '<tr class="total-row">';
  if (printRowSr) totalRow += `<td style="${S.tt}">—</td>`;
  if (showSummary) {
    totalRow += `<td style="${S.tt}">—</td>`;
    totalRow += `<td style="${S.ttR}">میزان</td>`;
    totalRow += `<td style="${S.tt}">—</td>`;
    totalRow += `<td style="${S.tt}">${sumCol(rows, "total_area2")}</td>`;
    totalRow += `<td style="${S.tt}">${sp("khalis_waari2_minute", "khalis_waari2_ghante").m}</td>`;
    totalRow += `<td style="${S.tt}">${sp("khalis_waari2_minute", "khalis_waari2_ghante").h}</td>`;
    totalRow += `<td style="${S.tt}">—</td><td style="${S.tt}">—</td>`;
  }
  totalRow += `<td style="${S.tt}">—</td>`;
  totalRow += `<td style="${S.ttR}">میزان</td>`;
  totalRow += `<td style="${S.tt}">—</td>`;
  totalRow += `<td style="${S.tt}">${sumCol(rows, "total_area")}</td>`;
  totalRow += `<td style="${S.tt}">${sumCol(rows, "ghair_mumkin")}</td>`;
  totalRow += `<td style="${S.tt}">${sumCol(rows, "khalis_raqba")}</td>`;
  totalRow += `<td style="${S.tt}">${sp("waari_minute", "waari_ghante").m}</td>`;
  totalRow += `<td style="${S.tt}">${sp("waari_minute", "waari_ghante").h}</td>`;
  totalRow += `<td style="${S.tt}">${sp("zaidah_minute", "zaidah_ghante").m}</td>`;
  totalRow += `<td style="${S.tt}">${sp("zaidah_minute", "zaidah_ghante").h}</td>`;
  totalRow += `<td style="${S.tt}">${sp("wazgi_minute", "wazgi_ghante").m}</td>`;
  totalRow += `<td style="${S.tt}">${sp("wazgi_minute", "wazgi_ghante").h}</td>`;
  totalRow += `<td style="${S.tt}">${sp("khalis_waari_minute", "khalis_waari_ghante").m}</td>`;
  totalRow += `<td style="${S.tt}">${sp("khalis_waari_minute", "khalis_waari_ghante").h}</td>`;
  totalRow += `<td style="${S.tt}">—</td><td style="${S.tt}">—</td>`;
  totalRow += `<td style="${S.tt}">—</td><td style="${S.tt}">—</td>`;
  totalRow += "</tr>";

  const notesHtml = notes
    .filter((n) => n && n.trim())
    .map((n, i) => `<div style="margin-bottom:2px">${i + 1}- ${esc(n)}</div>`)
    .join("");

  const signaturesHtml = `<div class="signatures">
    <div class="sig-item">دستخط نہری پٹواری</div>
    <div class="sig-item">دستخط ضلعدار</div>
    <div class="sig-item">دستخط سب ڈویژنل کینال آفیسر</div>
  </div>`;

  return `
  <div class="parat-page">
    <table style="border-collapse:collapse;width:100%;direction:rtl">
      <caption style="${S.caption}">${headerLineStr}</caption>
      <thead>${colLettersRow}${mainHeader}${subHeader}</thead>
      <tbody>${dataRows}${totalRow}</tbody>
    </table>
  </div>
  <div class="final-block">
    <div class="notes-block">
      <div style="font-size:16px;font-weight:bold;font-family:'Noto Nastaliq Urdu',serif;margin-bottom:8px">جناب عالیٰ</div>
      <div style="font-size:14px;line-height:2.2;font-family:'Noto Nastaliq Urdu',serif">${notesHtml}</div>
    </div>
    ${signaturesHtml}
  </div>`;
}

export function buildBatchHTML(records, opts = {}) {
  return (records || []).map((r) => buildParatRecordHTML(r, opts)).join("\n");
}

export function buildPrintCSS(opts = {}) {
  const pageSize = opts.pageSize || "A4";
  const orientation = opts.orientation || "landscape";
  return `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
    @page { size: ${pageSize} ${orientation}; margin: 10mm 10mm 10mm 10mm; @top-left { content: ""; } @top-center { content: ""; } @top-right { content: ""; } @bottom-left { content: ""; } @bottom-center { content: ""; } @bottom-right { content: counter(page) " / " counter(pages); direction: ltr; unicode-bidi: embed; font-family: sans-serif; font-size: 9px; color: #555; padding: 0 6mm 4mm 0; } }
    body { font-family: 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif; margin:0; padding:0; direction:rtl; color:#000; }
    .parat-page { box-sizing: border-box; }
    .notes-block { direction: rtl; margin-top: 1em; }
    .final-block { box-sizing: border-box; display: flex; flex-direction: column; min-height: 85vh; page-break-inside: avoid; break-inside: avoid; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1.5px solid #333; padding: 2px 3px; text-align: center; font-size: 7.5px; font-family: 'Noto Nastaliq Urdu', serif; }
    th { font-weight: bold; }
    .total-row td { font-weight: bold; }
    tr { page-break-inside: avoid; }
    .frac { display: inline-flex; flex-direction: column; align-items: center; line-height: 1.1; font-size: 7px; }
    .frac .num { border-bottom: 1.5px solid #000; padding-bottom: 1px; }
    .signatures { display:flex; justify-content:space-between; margin-top: auto; margin-bottom: 10mm; page-break-inside: avoid; break-inside: avoid; font-size: 12px; font-family: 'Noto Nastaliq Urdu', serif; }
    .sig-item { text-align:center; border-top:1px solid #333; padding-top:4px; width:200px; white-space:nowrap; }
  `;
}

// Open a print window from an HTML string. The child page prints itself once
// loaded (via an injected script), so the opener never calls w.print() on a
// not-yet-ready / null window — this fixes the print dialog not appearing.
// Tries a blob URL first (no "about:blank" footer); falls back to about:blank
// + document.write if the popup is blocked.
const AUTO_PRINT_SCRIPT = "<script>(function(){var d=false;function p(){if(d)return;d=true;window.print();}if(document.fonts&&document.fonts.ready){document.fonts.ready.then(function(){setTimeout(p,80);});}setTimeout(p,1500);})();</script>";

export function openPrintWindow(html) {
  const doc = html.includes("</body>") ? html.replace("</body>", AUTO_PRINT_SCRIPT + "</body>") : html + AUTO_PRINT_SCRIPT;
  let url = null;
  try {
    const blob = new Blob([doc], { type: "text/html;charset=utf-8" });
    url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank", "width=1300,height=900");
    if (w) { setTimeout(() => URL.revokeObjectURL(url), 60000); return; }
  } catch {}
  if (url) URL.revokeObjectURL(url);
  const w = window.open("", "_blank", "width=1300,height=900");
  if (!w) return;
  w.document.open();
  w.document.write(doc);
  w.document.close();
}

export function printParatBatch(records, opts = {}) {
  if (!records || records.length === 0) return;
  const css = buildPrintCSS(opts);
  const body = buildBatchHTML(records, opts);
  const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title></title><style>${css}</style></head><body>${body}</body></html>`;
  openPrintWindow(html);
}