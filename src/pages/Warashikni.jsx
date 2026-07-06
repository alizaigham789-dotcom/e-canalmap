import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, FileText } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const URDU_FONT = "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif";

const DEFAULT_BODY = `قلمی ہے کہ سائل/سائیلان نے درخواست گزاری ہے کہ فریق دوم مذکورہ بالا نے ان کا منظور شدہ پانی روک کر ان کی حق تلفی کی ہے۔ ان کے خلاف قانونی کاروائی عمل میں لائی جائے۔ آپ کو اس ضمن میں ہدایت کی جاتی ہے کہ آپ موقعہ پر جا کر ناجائز آبپاشی کا اندراج کریں اور دونوں فریقین کو مطلع کریں کہ وہ مورخہ: ............... کو بمقام دفتر ضلعداری میں مقررہ وقت پر پابند کریں۔ عدم حاضری کی صورت میں یک طرفہ کاروائی ضابطہ عمل میں لائی جائے گی۔`;

export default function Warashikni() {
  const [form, setForm] = useState({
    number: "",
    date: "",
    from_office: "دفتر ضلعداری سیکشن",
    subject: "وارشکنی درخواست",
    mouza_burji: "",
    rajbaha: "",
    to_munshi: "",
    body: DEFAULT_BODY,
    hearing_date: "",
    section: "",
    sub_division: "جوہر آباد",
  });

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // Inject hearing_date into body text at the placeholder
  const bodyForPrint = (form.body || "").replace(
    "...............",
    form.hearing_date ? form.hearing_date : "..............."
  );

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=900,height=700");
    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ur"><head>
      <meta charset="UTF-8">
      <title>نوٹس وارشکنی</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
        @page { size: A4 portrait; margin: 14mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: ${URDU_FONT}; color: #1e293b; padding: 18px; direction: rtl; }
        .form-border { border: 1px solid #000; padding: 20px; }
        .notice-title { text-align: center; font-size: 18px; font-weight: bold; color: #1e293b; margin-bottom: 14px; }
        .meta-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px; }
        .meta-row .meta-item { flex: 1; }
        .meta-label { font-weight: bold; }
        .meta-value { border-bottom: 1px dotted #555; display: inline-block; width: 160px; text-align: center; }
        .field-line { font-size: 12px; line-height: 2.2; margin-bottom: 6px; }
        .field-label { font-weight: bold; white-space: nowrap; }
        .field-value { border-bottom: 1px dotted #555; display: inline-block; width: 160px; text-align: center; margin-right: 4px; }
        .body-text { font-size: 12px; line-height: 2.4; text-align: justify; margin: 14px 0; }
        .return-clause { font-size: 12px; text-align: center; margin: 18px 0 18px 40px; }
        .signatures { display: flex; justify-content: space-between; margin-top: 30px; gap: 30px; }
        .sig-box { text-align: center; min-width: 160px; }
        .sig-label { font-size: 12px; font-weight: bold; margin-bottom: 28px; }
        .sig-line { border-top: 1px solid #333; padding-top: 4px; font-size: 11px; color: #444; }
      </style>
    </head><body>
      <div class="form-border">
        <div class="notice-title">نوٹس وارشکنی</div>

        <div class="meta-row">
          <div class="meta-item"><span class="meta-label">نمبر:</span> <span class="meta-value">${form.number || ""}</span></div>
          <div class="meta-item"><span class="meta-label">تاریخ:</span> <span class="meta-value">${form.date || ""}</span></div>
        </div>

        <div class="field-line"><span class="field-label">منجانب:</span> دفتر ضلعداری سیکشن <span class="field-value">${form.from_office || ""}</span></div>
        <div class="field-line"><span class="field-label">بمقدمہ:</span> ${form.subject || ""} <span class="field-value">${form.mouza_burji ? "موگہ برجی نمبر " + form.mouza_burji : ""}</span></div>
        <div class="field-line"><span class="field-label">موگہ برجی نمبر:</span> <span class="field-value">${form.mouza_burji || ""}</span></div>
        <div class="field-line"><span class="field-label">راجباہ:</span> <span class="field-value">${form.rajbaha || ""}</span></div>
        <div class="field-line"><span class="field-label">بنام منشی:</span> <span class="field-value">${form.to_munshi || ""}</span></div>

        <div class="body-text">${bodyForPrint}</div>

        <div class="return-clause">بعد از تعمیل اصل ہذا واپس کریں۔</div>

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-label">دستخط ضلعدار</div>
            <div class="sig-line">ضلعداری سیکشن ${form.section || ""}</div>
          </div>
          <div class="sig-box">
            <div class="sig-label">سیکشن</div>
            <div class="sig-line">ملحمہ ٹوانہ سب ڈویژن ${form.sub_division || ""}</div>
          </div>
        </div>
      </div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  const inputCls = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:border-blue-400 text-right";
  const labelCls = "text-[11px] font-bold text-slate-600 mb-1 block";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center gap-2">
          <Link to="/">
            <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-sm font-bold font-heading text-slate-800">Notice Warashikni</h1>
            <p className="text-[9px] text-slate-400 font-mono uppercase tracking-widest">نوٹس وارشکنی</p>
          </div>
          <Button size="sm" onClick={handlePrint} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
            <Printer className="w-3.5 h-3.5" /> پرنٹ
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-6" dir="rtl">
        {/* Form Card */}
        <div className="bg-white rounded-xl border-2 border-slate-800 shadow-sm overflow-hidden">
          {/* Title bar */}
          <div className="px-5 py-3 border-b border-slate-300 text-center">
            <h2 className="text-lg font-bold text-slate-800" style={{ fontFamily: URDU_FONT, lineHeight: 2 }}>
              نوٹس وارشکنی
            </h2>
          </div>

          {/* Form fields — vertical sequence matching print image */}
          <div className="p-5 space-y-3">
            {/* Number + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ fontFamily: URDU_FONT }}>نمبر</label>
                <input value={form.number} onChange={e => update("number", e.target.value)}
                  className={inputCls} placeholder="—" dir="rtl" />
              </div>
              <div>
                <label className={labelCls} style={{ fontFamily: URDU_FONT }}>تاریخ</label>
                <input value={form.date} onChange={e => update("date", e.target.value)}
                  className={inputCls} placeholder="—" dir="rtl" />
              </div>
            </div>

            {/* From office — full width */}
            <div>
              <label className={labelCls} style={{ fontFamily: URDU_FONT }}>منجانب — دفتر ضلعداری سیکشن</label>
              <input value={form.from_office} onChange={e => update("from_office", e.target.value)}
                className={inputCls} dir="rtl" style={{ fontFamily: URDU_FONT }} />
            </div>

            {/* Subject — full width */}
            <div>
              <label className={labelCls} style={{ fontFamily: URDU_FONT }}>بمقدمہ — وارشکنی درخواست</label>
              <input value={form.subject} onChange={e => update("subject", e.target.value)}
                className={inputCls} dir="rtl" style={{ fontFamily: URDU_FONT }} />
            </div>

            {/* Mouza Burji — full width (vertical sequence) */}
            <div>
              <label className={labelCls} style={{ fontFamily: URDU_FONT }}>موگہ برجی نمبر</label>
              <input value={form.mouza_burji} onChange={e => update("mouza_burji", e.target.value)}
                className={inputCls} placeholder="—" dir="ltr" />
            </div>

            {/* Rajbaha — full width (vertical sequence) */}
            <div>
              <label className={labelCls} style={{ fontFamily: URDU_FONT }}>راجباہ</label>
              <input value={form.rajbaha} onChange={e => update("rajbaha", e.target.value)}
                className={inputCls} placeholder="—" dir="rtl" style={{ fontFamily: URDU_FONT }} />
            </div>

            {/* To Munshi — full width */}
            <div>
              <label className={labelCls} style={{ fontFamily: URDU_FONT }}>بنام منشی</label>
              <input value={form.to_munshi} onChange={e => update("to_munshi", e.target.value)}
                className={inputCls} placeholder="—" dir="rtl" style={{ fontFamily: URDU_FONT }} />
            </div>

            {/* Body text */}
            <div>
              <label className={labelCls} style={{ fontFamily: URDU_FONT }}>متن نوٹس</label>
              <textarea value={form.body} onChange={e => update("body", e.target.value)} rows={5}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:border-blue-400 resize-none text-right"
                style={{ fontFamily: URDU_FONT, lineHeight: 2.2 }} dir="rtl" />
            </div>

            {/* Hearing date (goes inside body text) + Section (appears in signatures) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ fontFamily: URDU_FONT }}>مورخہ (متن میں داخل)</label>
                <input value={form.hearing_date} onChange={e => update("hearing_date", e.target.value)}
                  className={inputCls} placeholder="—" dir="rtl" />
              </div>
              <div>
                <label className={labelCls} style={{ fontFamily: URDU_FONT }}>سیکشن</label>
                <input value={form.section} onChange={e => update("section", e.target.value)}
                  className={inputCls} placeholder="—" dir="rtl" style={{ fontFamily: URDU_FONT }} />
              </div>
            </div>

            {/* Return clause — centered, slightly left */}
            <div className="pt-4">
              <p className="text-sm text-slate-700" style={{ fontFamily: URDU_FONT, lineHeight: 2, textAlign: "center", marginRight: 60 }}>
                بعد از تعمیل اصل ہذا واپس کریں۔
              </p>
            </div>

            {/* Signatures */}
            <div className="flex justify-between items-end pt-6 gap-6">
              <div className="text-center flex-1">
                <div className="text-xs font-bold text-slate-700 mb-8" style={{ fontFamily: URDU_FONT }}>
                  دستخط ضلعدار
                </div>
                <div className="border-t border-slate-400 pt-1 text-[10px] text-slate-500" style={{ fontFamily: URDU_FONT }}>
                  ضلعداری سیکشن {form.section || "—"}
                </div>
              </div>
              <div className="text-center flex-1">
                <div className="text-xs font-bold text-slate-700 mb-8" style={{ fontFamily: URDU_FONT }}>
                  سیکشن
                </div>
                <div className="border-t border-slate-400 pt-1 text-[10px] text-slate-500" style={{ fontFamily: URDU_FONT }}>
                  ملحمہ ٹوانہ سب ڈویژن {form.sub_division || "—"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick info */}
        <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400 px-1">
          <FileText className="w-3 h-3" />
          <span>فارم بھریں اور پرنٹ بٹن دبائیں — A4 پر پرنٹ ہوگا</span>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}