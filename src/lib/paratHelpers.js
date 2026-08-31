// Shared helpers for the Parat Warabandi form + print modal.

// Column letters extended beyond Z (AA, AB, ...) so every leaf column gets a label.
export const COL_LETTERS = [
  "A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z",
  "AA","AB","AC","AD","AE","AF","AG","AH","AI","AJ","AK","AL","AM","AN","AO","AP","AQ","AR"
];

export function sumCol(rows, key) {
  const s = rows.reduce((acc, r) => acc + (parseFloat(r[key]) || 0), 0);
  return s === 0 ? "-" : String(s % 1 === 0 ? s : s.toFixed(2));
}

// منٹ + گھنٹے کا مجموعہ — 60 منٹ = 1 گھنٹہ carry
export function sumPair(rows, minKey, hrKey) {
  let total = 0;
  for (const r of rows) {
    total += (parseFloat(r[hrKey]) || 0) * 60 + (parseFloat(r[minKey]) || 0);
  }
  if (total === 0) return { m: "-", h: "-" };
  return { m: String(total % 60), h: String(Math.floor(total / 60)) };
}

export function d(val) { return (val === "" || val === null || val === undefined) ? "-" : val; }

export const PRINT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
  @page { size: 297mm 210mm; margin: 10mm 10mm 10mm 10mm; @top-left { content: ""; } @top-center { content: ""; } @top-right { content: ""; } @bottom-left { content: ""; } @bottom-center { content: ""; } @bottom-right { content: counter(page) " / " counter(pages); direction: ltr; unicode-bidi: embed; font-family: sans-serif; font-size: 9px; color: #555; padding: 0 6mm 4mm 0; } }
  html, body { width: 100%; }
  body { font-family: 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif; margin:0; padding:0; direction:rtl; color:#000; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .print-page-wrap { box-sizing: border-box; }
  .parat-page { box-sizing: border-box; }
  .notes-block { direction: rtl; margin-top: 1em; }
  .final-block { box-sizing: border-box; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1.5px solid #333; padding: 2px 3px; text-align: center; font-size: 7.5px; font-family: 'Noto Nastaliq Urdu', serif; }
  th { font-weight: bold; }
  .total-row td { font-weight: bold; }
  tr { page-break-inside: avoid; }
  .frac { display: inline-flex; flex-direction: column; align-items: center; line-height: 1.1; font-size: 7px; }
  .frac .num { border-bottom: 1.5px solid #000; padding-bottom: 1px; }
  .tashreeh-table th { font-size: 7px; padding: 2px; }
  .tashreeh-table td { font-size: 7px; padding: 2px; }
  .signatures { margin-top: 10mm; margin-bottom: 10mm; page-break-inside: avoid; break-inside: avoid; }
  @media print { .col-letters-row { display: none !important; } }
`;

export const BW_CSS = `
  .bw-mode caption { color:#000 !important; background:transparent !important; }
  .bw-mode th { background:#fff !important; color:#000 !important; border-color:#000 !important; }
  .bw-mode td { background:#fff !important; color:#000 !important; border-color:#000 !important; }
  .bw-mode .total-row td { background:#fff !important; color:#000 !important; font-weight:bold !important; }
  .bw-mode .frac .num { border-bottom-color:#000 !important; }
  .bw-mode .signatures, .bw-mode .sig-item { border-color:#000 !important; color:#000 !important; background:transparent !important; }
`;

// Tarmeem annotation for a row: returns "ترمیم" if the owner name changed
// between the summary side (B = owner_name2) and the main side (Q = owner_name),
// or "ترمیم رقبہ" if the khalis raqba (E = khalis_raqba) differs from the main
// total area (U = total_area). Raqba takes precedence when both changed.
export function tarmeemMarker(row) {
  if (!row) return "";
  const nameChanged = !!(row.owner_name2 && row.owner_name && row.owner_name2.trim() !== row.owner_name.trim());
  const eVal = parseFloat(row.khalis_raqba);
  const uVal = parseFloat(row.total_area);
  const raqbaChanged = !isNaN(eVal) && !isNaN(uVal) && eVal !== uVal;
  if (raqbaChanged) return "ترمیم رقبہ";
  if (nameChanged) return "ترمیم";
  return "";
}

export function fracHtml(val) {
  if (!val) return "-";
  const entries = val.split(",").map(e => e.trim()).filter(Boolean);
  return entries.map(entry => {
    const parts = entry.split("/");
    if (parts.length >= 2) {
      return `<span class="frac"><span class="num">${parts[0]}</span><span>${parts.slice(1).join("/")}</span></span>`;
    }
    return `<span>${entry}</span>`;
  }).join(", ");
}

// Expand a killa range token "1-5" → "1,2,3,4,5". Pass-through for plain numbers
// and already-comma-separated lists. "1-3,7-9" → "1,2,3,7,8,9".
function expandKillaRanges(part) {
  const tokens = String(part).split(",");
  const out = [];
  for (const t of tokens) {
    const tr = t.trim();
    const m = tr.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      const a = parseInt(m[1], 10), b = parseInt(m[2], 10);
      if (a <= b && b - a < 200) {
        for (let i = a; i <= b; i++) out.push(String(i));
        continue;
      }
    }
    if (tr) out.push(tr);
  }
  return out.join(",");
}

// Bandubast print formatter: each mustateel ("4567/1-5") becomes its own fraction
// (mustateel on top, killa numbers below, slash as the fraction bar). Multiple
// mustateels are separated by space and/or comma in the input, and rendered as
// SEPARATE fractions (never merged). Killa ranges expand: "4567/1-5" →
// "4567" over "1,2,3,4,5".
export function bandubastHtml(val) {
  if (!val) return "-";
  const tokens = String(val).split(/\s+/).map(t => t.trim()).filter(Boolean);
  const entries = [];
  for (const tok of tokens) {
    // A single token may itself pack comma-separated mustateels if it contains
    // more than one "/". A lone slash means the commas inside belong to the
    // killa list — keep them intact.
    const slashCount = (tok.match(/\//g) || []).length;
    if (slashCount > 1) {
      for (const e of tok.split(",")) { const ee = e.trim(); if (ee) entries.push(ee); }
    } else {
      entries.push(tok);
    }
  }
  return entries.map(entry => {
    const idx = entry.indexOf("/");
    if (idx === -1) return `<span>${entry}</span>`;
    const mustateel = entry.slice(0, idx);
    const killaPart = expandKillaRanges(entry.slice(idx + 1));
    return `<span class="frac"><span class="num">${mustateel}</span><span>${killaPart}</span></span>`;
  }).join("&nbsp;&nbsp;");
}