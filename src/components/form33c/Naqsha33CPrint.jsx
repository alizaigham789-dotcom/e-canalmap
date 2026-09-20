/**
 * Naqsha33CPrint — prints the consolidated Naqsha No. 33-C summary table
 * (all villages in one table, totals row, signatures at bottom)
 * matching the PDF format exactly.
 */
import { escapeHtml } from "@/lib/escapeHtml";

export function printNaqsha33C({ villages, fasal, year, district, tehsil, surchargePercent, signatures, showPageBorder, showTableBorder }) {
  const e = escapeHtml;
  const sp = parseFloat(surchargePercent) || 10;

  // Calculate surcharge for each village
  const rows = villages.map((v, i) => {
    const zar = parseFloat(v.total_zar) || 0;
    const surcharge = v.surcharge_override && v.surcharge_override.trim()
      ? parseFloat(v.surcharge_override) || 0
      : zar > 0 ? Math.round(zar * sp / 100) : 0;
    return { ...v, _idx: i + 1, _zar: zar, _surcharge: surcharge };
  });

  const totalBills = rows.reduce((s, r) => s + (parseFloat(r.total_bills) || 0), 0);
  const totalZar = rows.reduce((s, r) => s + r._zar, 0);
  const totalSurcharge = rows.reduce((s, r) => s + r._surcharge, 0);

  const distLabel = district ? `${e(district)} Canal Division` : "";
  const outerBorder = showPageBorder ? "2px solid #000" : "none";
  const tb = showTableBorder ? "1px solid #000" : "1px solid #ccc";

  const sigBlock = (src, title, sub) => `
    <div style="text-align:center;flex:1;display:flex;flex-direction:column;align-items:center;">
      <div style="height:60px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:4px;">
        ${src ? `<img src="${src}" style="max-height:58px;max-width:120px;object-fit:contain;" />` : ""}
      </div>
      <div style="border-top:1.5px solid #000;padding-top:4px;min-width:160px;text-align:center;font-size:12px;">
        <strong>${title}</strong><br/><span style="font-size:11px;">${sub}</span>
      </div>
    </div>`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Naqsha 33-C</title>
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: ${tb}; padding: 5px 8px; text-align: center; font-size: 11px; }
    th { background: #f0f0f0; font-weight: bold; }
    .total-row td { font-weight: bold; background: #f8f8f8; }
    .remarks-col { min-width: 120px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style></head><body>
  <div style="border:${outerBorder};padding:14px 20px;min-height:calc(210mm - 16mm);">
    <div style="text-align:center;margin-bottom:10px;">
      <div style="font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">
        NAQSHA NO. 33-C RECOVERY OF E-ABIANA BILLING CROP ${fasal === "ربیع" ? "RABI" : "KHARIF"} ${e(year)}
        ${tehsil ? `TEHSIL ${e(tehsil.toUpperCase())}` : ""}
        ${district ? `DISTRICT ${e(district.toUpperCase())} OF ${e(district.toUpperCase())} CANAL DIVISION ${e(district.toUpperCase())}` : ""}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:40px;">Sr.<br/>No.</th>
          <th style="min-width:160px;">Village Name</th>
          <th>Total No. Of<br/>Printed Bills</th>
          <th>Total Abiana<br/>(Rs.)</th>
          <th>(${sp}%)<br/>Surcharge<br/>(Rs.)</th>
          <th class="remarks-col">Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td>${r._idx}</td>
            <td style="text-align:left;padding-left:10px;">${e(r.mouza || "—")}</td>
            <td>${r.total_bills || "—"}</td>
            <td>${r._zar ? r._zar.toLocaleString() : "—"}</td>
            <td>${r._surcharge ? r._surcharge.toLocaleString() : ""}</td>
            <td class="remarks-col"></td>
          </tr>`).join("")}
        <tr class="total-row">
          <td colspan="2" style="text-align:right;padding-right:12px;">Total =</td>
          <td>${totalBills.toLocaleString()}</td>
          <td>${totalZar.toLocaleString()}</td>
          <td>${totalSurcharge.toLocaleString()}</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <div style="display:flex;justify-content:space-around;margin-top:30px;padding-bottom:10px;align-items:flex-end;">
      ${sigBlock(signatures?.deputy_img || "", "Deputy Canal Collector", distLabel)}
      ${sigBlock(signatures?.divisional_img || "", "Executive Engineer", distLabel)}
    </div>
  </div>
  </body></html>`;

  const w = window.open("", "_blank", "width=1200,height=900");
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 700);
}