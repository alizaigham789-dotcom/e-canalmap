import React, { useState } from "react";
import { Pencil } from "lucide-react";
import { COL_LETTERS, PRINT_CSS, BW_CSS, fracHtml, bandubastHtml, tarmeemMarker, sumCol, sumPair, d } from "@/lib/paratHelpers";
import { openPrintWindow } from "@/lib/paratPrint";

// Columns on the summary side that are hidden in print by default and can be
// toggled on individually: C (کل رقبہ), D (غیر ممکن), F/G (واری بحساب),
// H/I (زائدہ وصولی), J/K (وضگی).
const TOGGLE_COLS = ["C", "D", "F", "G", "H", "I", "J", "K"];

export default function ParatPrintModal({ docType, headerLine, rows, notes, printRowSr, printColSr, setPrintRowSr, setPrintColSr, printCols, setPrintCols, onClose, variant }) {
  const [pageSize, setPageSize] = useState("A4");
  const [bw, setBw] = useState(false);

  const isJadeed = variant === "jadeed";
  const showSummary = !isJadeed;

  const spanFG = (printCols.F ? 1 : 0) + (printCols.G ? 1 : 0);
  const spanHI = (printCols.H ? 1 : 0) + (printCols.I ? 1 : 0);
  const spanJK = (printCols.J ? 1 : 0) + (printCols.K ? 1 : 0);

  const thP = { border: "1.5px solid #1e3a5f", padding: "4px 5px", textAlign: "center", backgroundColor: "#dbeafe", fontSize: "12px", fontWeight: "bold", fontFamily: "'Noto Nastaliq Urdu', serif", color: "#1e3a5f" };
  const thLetters = { ...thP, backgroundColor: "#f0f4ff" };
  const thSub = { ...thP, backgroundColor: "#eff6ff", fontSize: "9px", padding: "2px 3px" };
  const tdP = { border: "1.5px solid #555", padding: "2px 3px", textAlign: "center", fontSize: "8px", fontFamily: "'Noto Nastaliq Urdu', serif" };
  const tdTotal = { border: "1.5px solid #333", padding: "2px 3px", textAlign: "center", fontSize: "8px", fontWeight: "bold", backgroundColor: "#fef9e7", fontFamily: "'Noto Nastaliq Urdu', serif" };

  // Build the visible-letter list for the print column-shumar row. Summary-side
  // letters are included only when their column is toggled on; main-side letters
  // are always shown.
  const printVisibleLetters = (() => {
    if (!showSummary) return COL_LETTERS.slice(7, 7 + 17);
    const sum = [
      { l: "A", show: true }, { l: "B", show: true },
      { l: "C", show: printCols.C }, { l: "D", show: printCols.D },
      { l: "E", show: true },
      { l: "F", show: printCols.F }, { l: "G", show: printCols.G },
      { l: "H", show: printCols.H }, { l: "I", show: printCols.I },
      { l: "J", show: printCols.J }, { l: "K", show: printCols.K },
      { l: "L", show: true }, { l: "M", show: true },
      { l: "N", show: true }, { l: "O", show: true },
    ];
    const main = COL_LETTERS.slice(15, 15 + 19); // P..AH
    return sum.filter(x => x.show).map(x => x.l).concat(main);
  })();

  const handlePrint = () => {
    const content = document.getElementById("parat-print-content").innerHTML;
    const css = PRINT_CSS.replace("A4 landscape", `${pageSize} landscape`);
    const html = `<!DOCTYPE html><html dir="rtl"><head><title></title><style>${css}${bw ? BW_CSS : ""}</style></head><body><div class="print-page-wrap">${content}</div></body></html>`;
    openPrintWindow(html);
  };

  const headerRows = (
    <>
      {printColSr && (
        <tr className="col-letters-row">
          {printRowSr && <th style={{ ...thLetters, fontSize: "7px" }}>#</th>}
          {printVisibleLetters.map((l, i) => <th key={i} style={{ ...thLetters, fontSize: "7px" }}>{l}</th>)}
        </tr>
      )}
      <tr>
        {printRowSr && <th style={thP} rowSpan={2}>نمبرشمار</th>}
        {showSummary && <>
        <th style={thP} rowSpan={2}>کھاتہ نمبر</th>
        <th style={{ ...thP, minWidth: 70 }} rowSpan={2}>نام مالک معہ والدیت</th>
        {printCols.C && <th style={thP}>کل رقبہ</th>}
        {printCols.D && <th style={thP}>غیر ممکن رقبہ</th>}
        <th style={thP}>خالص رقبہ</th>
        {spanFG > 0 && <th style={thP} colSpan={spanFG}>واری بحساب رقبہ</th>}
        {spanHI > 0 && <th style={thP} colSpan={spanHI}>زائدہ وصولی</th>}
        {spanJK > 0 && <th style={thP} colSpan={spanJK}>وضگی</th>}
        <th style={thP} colSpan={2}>خالص واری</th>
        <th style={thP} colSpan={2}>نکہ جات</th>
        </>}
        <th style={thP} rowSpan={2}>کھاتہ نمبر</th>
        <th style={{ ...thP, minWidth: 80 }} rowSpan={2}>نام مالک معہ والدیت</th>
        <th style={{ ...thP, minWidth: 80 }} rowSpan={2}>نمبران بندوبست</th>
        <th style={thP}>کل رقبہ</th>
        <th style={thP}>غیر ممکن رقبہ</th>
        <th style={thP}>خالص رقبہ</th>
        <th style={thP} colSpan={2}>واری بحساب رقبہ</th>
        {!showSummary && <>
        <th style={thP} colSpan={2}>زائدہ وصولی</th>
        <th style={thP} colSpan={2}>وضگی</th>
        </>}
        {showSummary && <>
        <th style={thP} colSpan={2}>زائدہ وصولی</th>
        <th style={thP} colSpan={2}>وضگی</th>
        </>}
        <th style={thP} colSpan={2}>خالص واری</th>
        <th style={thP} colSpan={2}>نکہ جات</th>
        <th style={thP} rowSpan={2}>تشریح اوقات دن</th>
        <th style={thP} rowSpan={2}>تشریح اوقات رات</th>
      </tr>
      <tr>
        {showSummary && <>
        {printCols.C && <th style={thSub}>ایکڑ</th>}
        {printCols.D && <th style={thSub}>ایکڑ</th>}
        <th style={thSub}>ایکڑ</th>
        {printCols.F && <th style={thSub}>منٹ</th>}{printCols.G && <th style={thSub}>گھنٹے</th>}
        {printCols.H && <th style={thSub}>منٹ</th>}{printCols.I && <th style={thSub}>گھنٹے</th>}
        {printCols.J && <th style={thSub}>منٹ</th>}{printCols.K && <th style={thSub}>گھنٹے</th>}
        <th style={thSub}>منٹ</th><th style={thSub}>گھنٹے</th>
        <th style={thSub}>لیگا</th><th style={thSub}>دیگا</th>
        </>}
        <th style={thSub}>ایکڑ</th>
        <th style={thSub}>ایکڑ</th>
        <th style={thSub}>ایکڑ</th>
        <th style={thSub}>منٹ</th><th style={thSub}>گھنٹے</th>
        {!showSummary && <>
        <th style={thSub}>منٹ</th><th style={thSub}>گھنٹے</th>
        <th style={thSub}>منٹ</th><th style={thSub}>گھنٹے</th>
        </>}
        {showSummary && <>
        <th style={thSub}>منٹ</th><th style={thSub}>گھنٹے</th>
        <th style={thSub}>منٹ</th><th style={thSub}>گھنٹے</th>
        </>}
        <th style={thSub}>منٹ</th><th style={thSub}>گھنٹے</th>
        <th style={thSub}>لیگا</th><th style={thSub}>دیگا</th>
      </tr>
    </>
  );

  const dataRows = rows.map((row, i) => (
    <tr key={i}>
      {printRowSr && <td style={tdP}>{i + 1}</td>}
      {showSummary && <>
      <td style={tdP}>{d(row.khatoni2)}</td>
      <td style={{ ...tdP, textAlign: "right" }}>{d(row.owner_name2)}</td>
      {printCols.C && <td style={tdP}>{d(row.total_area2)}</td>}
      {printCols.D && <td style={tdP}>{d(row.ghair_mumkin)}</td>}
      <td style={tdP}>{d(row.khalis_raqba)}</td>
      {printCols.F && <td style={tdP}>{d(row.waari_minute)}</td>}
      {printCols.G && <td style={tdP}>{d(row.waari_ghante)}</td>}
      {printCols.H && <td style={tdP}>{d(row.zaidah_minute)}</td>}
      {printCols.I && <td style={tdP}>{d(row.zaidah_ghante)}</td>}
      {printCols.J && <td style={tdP}>{d(row.wazgi_minute)}</td>}
      {printCols.K && <td style={tdP}>{d(row.wazgi_ghante)}</td>}
      <td style={tdP}>{d(row.khalis_waari2_minute)}</td>
      <td style={tdP}>{d(row.khalis_waari2_ghante)}</td>
      <td style={tdP} dangerouslySetInnerHTML={{ __html: row.nikha2_lega ? fracHtml(row.nikha2_lega) : "-" }} />
      <td style={tdP} dangerouslySetInnerHTML={{ __html: row.nikha2_dega ? fracHtml(row.nikha2_dega) : "-" }} />
      </>}
      <td style={tdP}>{d(row.khatoni)}{tarmeemMarker(row) ? <><br /><span style={{ fontSize: "7px", color: "#dc2626" }}>{tarmeemMarker(row)}</span></> : null}</td>
      <td style={{ ...tdP, textAlign: "right" }}>{d(row.owner_name)}</td>
      <td style={tdP} dangerouslySetInnerHTML={{ __html: row.bandubast ? bandubastHtml(row.bandubast) : "-" }} />
      <td style={tdP}>{d(row.total_area)}</td>
      <td style={tdP}>{d(row.ghair_mumkin)}</td>
      <td style={tdP}>{d(row.khalis_raqba)}</td>
      <td style={tdP}>{d(row.waari_minute)}</td>
      <td style={tdP}>{d(row.waari_ghante)}</td>
      {!showSummary && <><td style={tdP}>{d(row.zaidah_minute)}</td>
      <td style={tdP}>{d(row.zaidah_ghante)}</td>
      <td style={tdP}>{d(row.wazgi_minute)}</td>
      <td style={tdP}>{d(row.wazgi_ghante)}</td></>}
      {showSummary && <><td style={tdP}>{d(row.zaidah_minute)}</td>
      <td style={tdP}>{d(row.zaidah_ghante)}</td>
      <td style={tdP}>{d(row.wazgi_minute)}</td>
      <td style={tdP}>{d(row.wazgi_ghante)}</td></>}
      <td style={tdP}>{d(row.khalis_waari_minute)}</td>
      <td style={tdP}>{d(row.khalis_waari_ghante)}</td>
      <td style={tdP} dangerouslySetInnerHTML={{ __html: row.nikha_lega ? fracHtml(row.nikha_lega) : "-" }} />
      <td style={tdP} dangerouslySetInnerHTML={{ __html: row.nikha_dega ? fracHtml(row.nikha_dega) : "-" }} />
      <td style={tdP}>{d(row.tashreeh_din)}</td>
      <td style={tdP}>{d(row.tashreeh_raat)}</td>
    </tr>
  ));

  const totalRow = (
    <tr className="total-row">
      {printRowSr && <td style={tdTotal}>—</td>}
      {showSummary && <>
      <td style={tdTotal}>—</td>
      <td style={{ ...tdTotal, textAlign: "right" }}>میزان</td>
      {printCols.C && <td style={tdTotal}>{sumCol(rows, "total_area2")}</td>}
      {printCols.D && <td style={tdTotal}>{sumCol(rows, "ghair_mumkin")}</td>}
      <td style={tdTotal}>{sumCol(rows, "khalis_raqba")}</td>
      {printCols.F && <td style={tdTotal}>{sumPair(rows, "waari_minute", "waari_ghante").m}</td>}
      {printCols.G && <td style={tdTotal}>{sumPair(rows, "waari_minute", "waari_ghante").h}</td>}
      {printCols.H && <td style={tdTotal}>{sumPair(rows, "zaidah_minute", "zaidah_ghante").m}</td>}
      {printCols.I && <td style={tdTotal}>{sumPair(rows, "zaidah_minute", "zaidah_ghante").h}</td>}
      {printCols.J && <td style={tdTotal}>{sumPair(rows, "wazgi_minute", "wazgi_ghante").m}</td>}
      {printCols.K && <td style={tdTotal}>{sumPair(rows, "wazgi_minute", "wazgi_ghante").h}</td>}
      <td style={tdTotal}>{sumPair(rows, "khalis_waari2_minute", "khalis_waari2_ghante").m}</td>
      <td style={tdTotal}>{sumPair(rows, "khalis_waari2_minute", "khalis_waari2_ghante").h}</td>
      <td style={tdTotal}>—</td><td style={tdTotal}>—</td>
      </>}
      <td style={tdTotal}>—</td>
      <td style={{ ...tdTotal, textAlign: "right" }}>میزان</td>
      <td style={tdTotal}>—</td>
      <td style={tdTotal}>{sumCol(rows, "total_area")}</td>
      <td style={tdTotal}>{sumCol(rows, "ghair_mumkin")}</td>
      <td style={tdTotal}>{sumCol(rows, "khalis_raqba")}</td>
      <td style={tdTotal}>{sumPair(rows, "waari_minute", "waari_ghante").m}</td>
      <td style={tdTotal}>{sumPair(rows, "waari_minute", "waari_ghante").h}</td>
      {!showSummary && <>
      <td style={tdTotal}>{sumPair(rows, "zaidah_minute", "zaidah_ghante").m}</td>
      <td style={tdTotal}>{sumPair(rows, "zaidah_minute", "zaidah_ghante").h}</td>
      <td style={tdTotal}>{sumPair(rows, "wazgi_minute", "wazgi_ghante").m}</td>
      <td style={tdTotal}>{sumPair(rows, "wazgi_minute", "wazgi_ghante").h}</td>
      </>}
      {showSummary && <>
      <td style={tdTotal}>{sumPair(rows, "zaidah_minute", "zaidah_ghante").m}</td>
      <td style={tdTotal}>{sumPair(rows, "zaidah_minute", "zaidah_ghante").h}</td>
      <td style={tdTotal}>{sumPair(rows, "wazgi_minute", "wazgi_ghante").m}</td>
      <td style={tdTotal}>{sumPair(rows, "wazgi_minute", "wazgi_ghante").h}</td>
      </>}
      <td style={tdTotal}>{sumPair(rows, "khalis_waari_minute", "khalis_waari_ghante").m}</td>
      <td style={tdTotal}>{sumPair(rows, "khalis_waari_minute", "khalis_waari_ghante").h}</td>
      <td style={tdTotal}>—</td><td style={tdTotal}>—</td>
      <td style={tdTotal}>—</td><td style={tdTotal}>—</td>
    </tr>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-auto py-6">
      <div className="bg-white rounded-xl shadow-2xl max-w-[1300px] w-full mx-4">
        <div className="flex items-center justify-between px-5 py-3 border-b bg-slate-50 rounded-t-xl">
          <h3 className="text-sm font-bold text-slate-800">Print Preview — {docType}</h3>
          <div className="flex gap-3 items-center flex-wrap">
            <label className="flex items-center gap-1 text-[11px] text-slate-700 font-medium" dir="rtl">
              صفحہ:
              <select value={pageSize} onChange={e => setPageSize(e.target.value)} className="border border-slate-300 rounded px-1.5 py-1 text-xs bg-white">
                <option value="A4">A4</option>
                <option value="A3">A3</option>
                <option value="A5">A5</option>
                <option value="Legal">Legal</option>
                <option value="Letter">Letter</option>
              </select>
            </label>
            <button
              onClick={() => setBw(v => !v)}
              title={bw ? "Black & White — کلک کر کے رنگین کریں" : "رنگین پرنٹ — کلک کر کے Black & White کریں"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${bw ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"}`}
            >
              <Pencil className="w-3.5 h-3.5" />
              {bw ? "B&W" : "رنگین"}
            </button>
            <label className="flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer" dir="rtl">
              <input type="checkbox" checked={printRowSr} onChange={e => setPrintRowSr(e.target.checked)} className="w-3 h-3" />
              قطار نمبرشمار
            </label>
            <label className="flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer" dir="rtl">
              <input type="checkbox" checked={printColSr} onChange={e => setPrintColSr(e.target.checked)} className="w-3 h-3" />
              کالم نمبرشمار
            </label>
            <button onClick={handlePrint} className="px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">🖨 Print / PDF</button>
            <button onClick={onClose} className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs rounded-lg hover:bg-slate-300">بند کریں</button>
          </div>
        </div>

        {/* Optional summary-side columns — hidden in print by default */}
        {showSummary && (
          <div className="px-5 py-2 border-b bg-slate-50 flex items-center gap-2 flex-wrap" dir="rtl">
            <span className="text-[10px] font-semibold text-slate-600" style={{ fontFamily: "serif" }}>پرنٹ میں کالم:</span>
            {TOGGLE_COLS.map(col => (
              <label key={col} className="flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer bg-white border border-slate-200 rounded px-1.5 py-0.5">
                <input
                  type="checkbox"
                  checked={printCols[col]}
                  onChange={e => setPrintCols(prev => ({ ...prev, [col]: e.target.checked }))}
                  className="w-3 h-3 accent-blue-600"
                />
                <span className="font-mono font-bold text-slate-700">{col}</span>
              </label>
            ))}
            <span className="text-[9px] text-slate-400" style={{ fontFamily: "serif" }}>(بند تو پہلے سے — آن کرنے پر پرنٹ میں دکھائی دیں گے)</span>
          </div>
        )}

        {bw && <style>{BW_CSS}</style>}
        <div id="parat-print-content" className={`p-6 overflow-x-auto ${bw ? "bw-mode" : ""}`} style={{ direction: "rtl", fontFamily: "'Noto Nastaliq Urdu', serif" }}>
          <div className="parat-page">
            <table style={{ borderCollapse: "collapse", width: "100%", direction: "rtl" }}>
              <caption style={{ textAlign: "center", fontSize: "16px", fontWeight: "bold", marginTop: "6px", marginBottom: "22px", paddingTop: "10px", paddingBottom: "10px", borderBottom: "1.5px solid #1e3a5f", fontFamily: "'Noto Nastaliq Urdu', serif", color: "#1e3a5f", lineHeight: 2.2, letterSpacing: "0.5px", wordSpacing: "0.3em", whiteSpace: "nowrap", captionSide: "top" }}>
                {headerLine}
              </caption>
              <thead>
                {headerRows}
              </thead>
              <tbody>
                {dataRows}
                {totalRow}
              </tbody>
            </table>
          </div>

          <div className="final-block">
            <div className="notes-block" style={{ direction: "rtl", marginTop: "1em" }}>
              <div style={{ fontSize: "16px", fontWeight: "bold", fontFamily: "'Noto Nastaliq Urdu', serif", marginBottom: "8px" }}>جناب عالیٰ</div>
              <div style={{ fontSize: "14px", lineHeight: 2.2, fontFamily: "'Noto Nastaliq Urdu', serif" }}>
                {notes.filter(n => n.trim()).map((note, i) => (
                  <div key={i} style={{ marginBottom: "2px" }}>{i + 1}- {note}</div>
                ))}
              </div>
            </div>
            <div className="signatures" style={{ display: "flex", justifyContent: "space-between", marginTop: "10mm", fontSize: "12px", fontFamily: "'Noto Nastaliq Urdu', serif" }}>
              <div style={{ textAlign: "center", borderTop: "1px solid #333", paddingTop: "4px", width: "200px", whiteSpace: "nowrap" }}>دستخط نہری پٹواری</div>
              <div style={{ textAlign: "center", borderTop: "1px solid #333", paddingTop: "4px", width: "200px", whiteSpace: "nowrap" }}>دستخط ضلعدار</div>
              <div style={{ textAlign: "center", borderTop: "1px solid #333", paddingTop: "4px", width: "200px", whiteSpace: "nowrap" }}>دستخط سب ڈویژنل کینال آفیسر</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}