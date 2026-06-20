import React from "react";

export default function WarabandiPrint({ data, rows, onClose }) {
  const sum = (key) => rows.reduce((s, r) => s + (parseFloat(r[key]) || 0), 0);
  const totalAcre = sum("area_acre");
  const totalKanal = sum("area_kanal");
  const totalMarla = sum("area_marla");
  const totalHours = sum("duration_hours");
  const totalMinutes = sum("duration_minutes");
  const adjH = totalHours + Math.floor(totalMinutes / 60);
  const adjM = totalMinutes % 60;

  const handlePrint = () => {
    const printArea = document.getElementById("warabandi-print-area");
    const w = window.open("", "_blank", "width=1100,height=800");
    w.document.write(`<!DOCTYPE html><html><head><title>پرت وارابندی</title>
      <style>
        @page { size: A4 landscape; margin: 12mm; }
        body { font-family: 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif; margin:0; padding:20px; direction:rtl; color:#000; font-size:11px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1.5px solid #333; padding: 4px 6px; text-align: center; }
        th { background: #f0f0f0; font-weight: bold; font-size: 10px; }
        .header { text-align: center; margin-bottom: 12px; }
        .header h1 { font-size: 16px; margin: 0; }
        .meta-table { width: 100%; border: none; margin-bottom: 10px; }
        .meta-table td { border: none; padding: 2px 8px; text-align: right; font-size: 11px; }
        .meta-label { font-weight: bold; }
        .footer-sign { display: flex; justify-content: space-between; margin-top: 24px; font-size: 11px; }
        .totals td { font-weight: bold; background: #f5f5f0; }
      </style>
    </head><body>${printArea.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-auto py-8">
      <div className="bg-white rounded-xl shadow-2xl max-w-[1100px] w-full mx-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-slate-50 rounded-t-xl print:hidden">
          <h3 className="text-sm font-bold text-slate-800 font-heading">Print Preview — پرت وارابندی</h3>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
              🖨 Print / PDF
            </button>
            <button onClick={onClose} className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs rounded-lg hover:bg-slate-300">
              Close
            </button>
          </div>
        </div>

        {/* Print Content */}
        <div id="warabandi-print-area" className="p-8" style={{ direction: "rtl", fontFamily: "serif" }}>
          {/* Header */}
          <div className="text-center mb-4">
            <p className="text-xs text-slate-600 mb-1">
              پرت وارابندی موغہ نمبر {data.mogha_number || "___"} / 16000 واجبہ آبیانہ تحقیقات موسم خریف رنجی غلطنگ وادی نکال / ساب ایران قناۃ آراضی {data.village_name || "___"} خرقوب
            </p>
            <p className="text-[10px] text-slate-500">
              پاری ند نظر ({data.total_cca || "___"}) ({data.total_khasra_area || "___"})
            </p>
          </div>

          {/* Meta Info */}
          <table className="w-full mb-4" style={{ borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td className="border border-slate-400 px-2 py-1 text-xs bg-slate-50 font-bold">نمبر شمار</td>
                <td className="border border-slate-400 px-2 py-1 text-xs">حصہ داران کے نام ووالدیت</td>
                <td className="border border-slate-400 px-2 py-1 text-xs bg-slate-50 font-bold">تفصیل نمبر</td>
                <td className="border border-slate-400 px-2 py-1 text-xs" colSpan={2}>
                  <div className="flex justify-between text-[10px]">
                    <span>خیوط نمبر: {data.order_number || ""}</span>
                    <span>کھتونی نمبر</span>
                  </div>
                </td>
                <td className="border border-slate-400 px-2 py-1 text-xs bg-slate-50 font-bold">رقبہ</td>
                <td className="border border-slate-400 px-2 py-1 text-xs bg-slate-50 font-bold">مدت / وقت</td>
                <td className="border border-slate-400 px-2 py-1 text-xs bg-slate-50 font-bold">کیفیت</td>
              </tr>
            </tbody>
          </table>

          {/* Main Data Table */}
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th className="border border-slate-400 px-1 py-1.5 bg-slate-50 text-[10px]">نمبر<br/>شمار</th>
                <th className="border border-slate-400 px-1 py-1.5 bg-slate-50 text-[10px]">نام مالک</th>
                <th className="border border-slate-400 px-1 py-1.5 bg-slate-50 text-[10px]">ولدیت</th>
                <th className="border border-slate-400 px-1 py-1.5 bg-slate-50 text-[10px]">خیوط<br/>نمبر</th>
                <th className="border border-slate-400 px-1 py-1.5 bg-slate-50 text-[10px]">کھتونی<br/>نمبر</th>
                <th className="border border-slate-400 px-1 py-1.5 bg-slate-50 text-[10px]">خسرہ<br/>نمبر</th>
                <th className="border border-slate-400 px-1 py-1.5 bg-slate-50 text-[10px]">ایکڑ</th>
                <th className="border border-slate-400 px-1 py-1.5 bg-slate-50 text-[10px]">کنال</th>
                <th className="border border-slate-400 px-1 py-1.5 bg-slate-50 text-[10px]">مرلہ</th>
                <th className="border border-slate-400 px-1 py-1.5 bg-slate-50 text-[10px]">حصہ آب</th>
                <th className="border border-slate-400 px-1 py-1.5 bg-slate-50 text-[10px]">گھنٹے</th>
                <th className="border border-slate-400 px-1 py-1.5 bg-slate-50 text-[10px]">منٹ</th>
                <th className="border border-slate-400 px-1 py-1.5 bg-slate-50 text-[10px]">کیفیت</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td className="border border-slate-400 px-1 py-1 text-[10px] text-center">{row.sr_no || i + 1}</td>
                  <td className="border border-slate-400 px-1 py-1 text-[10px]">{row.owner_name}</td>
                  <td className="border border-slate-400 px-1 py-1 text-[10px]">{row.father_name}</td>
                  <td className="border border-slate-400 px-1 py-1 text-[10px] text-center">{row.khewat_no}</td>
                  <td className="border border-slate-400 px-1 py-1 text-[10px] text-center">{row.khatoni_no}</td>
                  <td className="border border-slate-400 px-1 py-1 text-[10px] text-center">{row.khasra_no}</td>
                  <td className="border border-slate-400 px-1 py-1 text-[10px] text-center">{row.area_acre}</td>
                  <td className="border border-slate-400 px-1 py-1 text-[10px] text-center">{row.area_kanal}</td>
                  <td className="border border-slate-400 px-1 py-1 text-[10px] text-center">{row.area_marla}</td>
                  <td className="border border-slate-400 px-1 py-1 text-[10px] text-center">{row.water_share}</td>
                  <td className="border border-slate-400 px-1 py-1 text-[10px] text-center">{row.duration_hours}</td>
                  <td className="border border-slate-400 px-1 py-1 text-[10px] text-center">{row.duration_minutes}</td>
                  <td className="border border-slate-400 px-1 py-1 text-[10px]">{row.remarks}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} className="border border-slate-400 px-2 py-1.5 text-[10px] font-bold text-left">مجموعہ</td>
                <td className="border border-slate-400 px-1 py-1.5 text-[10px] text-center font-bold">{totalAcre || ""}</td>
                <td className="border border-slate-400 px-1 py-1.5 text-[10px] text-center font-bold">{totalKanal || ""}</td>
                <td className="border border-slate-400 px-1 py-1.5 text-[10px] text-center font-bold">{totalMarla || ""}</td>
                <td className="border border-slate-400 px-1 py-1.5 text-[10px] text-center font-bold"></td>
                <td className="border border-slate-400 px-1 py-1.5 text-[10px] text-center font-bold">{adjH || ""}</td>
                <td className="border border-slate-400 px-1 py-1.5 text-[10px] text-center font-bold">{adjM || ""}</td>
                <td className="border border-slate-400 px-1 py-1.5 text-[10px]"></td>
              </tr>
            </tfoot>
          </table>

          {/* Footer Signatures */}
          <div className="flex justify-between mt-8 text-xs">
            <div className="text-center">
              <div className="border-t border-slate-400 pt-1 px-8">دستخط ملہدار</div>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-400 pt-1 px-8">وضاحت نقشہ</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}