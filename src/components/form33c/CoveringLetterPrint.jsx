/**
 * CoveringLetterPrint — prints the covering letter (page 1 of the PDF)
 * from Executive Engineer to Assistant Commissioner with Naqsha 33-C summary.
 */
export function printCoveringLetter({ villages, fasal, year, district, tehsil, letterData, signatures }) {
  const totalBills = villages.reduce((s, v) => s + (parseFloat(v.total_bills) || 0), 0);
  const total33C = villages.length;

  const today = new Date();
  const dateStr = letterData?.date || `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
  const numberStr = letterData?.number || "";
  const toOffice = letterData?.to || (tehsil ? `اسسٹنٹ کمشنر تحصیل ${tehsil}` : "اسسٹنٹ کمشنر");
  const fromOffice = letterData?.from || (district ? `ایگزیکٹواِنجینئر خوشاب کینال ڈویژن ${district}` : "ایگزیکٹواِنجینئر");
  const govtOrder = letterData?.govt_order || "";
  const cropLabel = fasal === "ربیع" ? "ربیع" : "خریف";

  const sigBlock = (src, title, sub) => `
    <div style="text-align:center;flex:1;">
      <div style="height:55px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:4px;">
        ${src ? `<img src="${src}" style="max-height:53px;max-width:110px;object-fit:contain;" />` : ""}
      </div>
      <div style="border-top:1.5px solid #000;padding-top:4px;text-align:center;font-size:13px;">
        <strong>${title}</strong><br/>${sub}
      </div>
    </div>`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Covering Letter 33-C</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
    @page { size: A4 portrait; margin: 15mm 20mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Noto Nastaliq Urdu', serif; font-size: 16px; direction: rtl; line-height: 2; }
    .label { display: inline-block; width: 120px; font-weight: bold; }
    .dash-line { display: inline-block; border-bottom: 1px solid #333; min-width: 200px; text-align: center; }
    .summary-table { border-collapse: collapse; width: 80%; margin: 16px auto; font-size: 15px; }
    .summary-table td, .summary-table th { border: 1px solid #333; padding: 6px 12px; text-align: center; }
    @media print { body { -webkit-print-color-adjust: exact; } }
  </style></head><body>
  <div style="direction:rtl;padding:10px;">

    <!-- Header line: نمبر / تاریخ -->
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;">
      <span>نمبر:۔ <span class="dash-line" style="min-width:160px;">${numberStr}</span></span>
      <span>تاریخ:۔ <span class="dash-line" style="min-width:140px;">${dateStr}</span></span>
    </div>

    <div style="margin-bottom:10px;font-size:16px;line-height:2.2;">
      <div><span class="label">از دفتر:۔</span> ${fromOffice}</div>
      <div><span class="label">بجانب:۔</span> ${toOffice}</div>
      <div><span class="label">عنوان:۔</span> ریکوری ای۔آبیانہ پر عملدرآمد بابت فصل ${cropLabel} ${year}ء</div>
    </div>

    ${govtOrder ? `<div style="font-size:13px;margin-bottom:8px;line-height:1.8;">بحوالہ اولیکشن نمبر: ${govtOrder}</div>` : ""}

    <div style="font-size:15px;margin-bottom:10px;line-height:2;">
      ڈیپارٹمنٹ (ریکوری سیکشن) بابت ریکوری ای۔آبیانہ پر عملدرآمد فصل ${cropLabel} ${year}ء بمراد کاروائی ضابطہ ارسال ہے۔ لسٹ مواضعات وتعداد بلز لاف ہذا ہیں۔
    </div>

    <div style="font-size:15px;margin-bottom:6px;text-align:right;">تفصیل درج ذیل ہے۔</div>

    <!-- Summary 3-col table -->
    <table class="summary-table">
      <thead>
        <tr>
          <th>تعداد 33-C</th>
          <th>کل پرعملد بلز</th>
          <th>تعداد موضع جات/ چکوک ای۔آبیانہ بلنگ</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${total33C}</td>
          <td>${totalBills.toLocaleString()}</td>
          <td>${total33C}</td>
        </tr>
      </tbody>
    </table>

    <!-- Signature -->
    <div style="display:flex;justify-content:flex-start;margin-top:40px;padding-bottom:10px;align-items:flex-end;direction:ltr;">
      ${sigBlock(signatures?.divisional_img || "", "Executive Engineer", district ? `${district} Canal Division<br/>${district}` : "")}
    </div>

  </div>
  </body></html>`;

  const w = window.open("", "_blank", "width=900,height=1100");
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 900);
}