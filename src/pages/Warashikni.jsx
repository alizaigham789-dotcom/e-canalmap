import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, FileText } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const URDU_FONT = "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif";

const DEFAULT_BODY = `بموجب ضابطہ نمبر 51 پرت وارہ بندی، حصہ داران موگہ ایڑ چی نمبر مذکورہ بالا کو نوٹس دیا جاتا ہے کہ مورخہ مذکورہ بالا کو دوران کاروائی ضلعداری حاضر ہو کر اپنا اپنا حق وارشکنی درج کروائیں۔`;

export default function Warashikni() {
  const [form, setForm] = useState({
    number: "",
    date: "",
    from_office: "دفتر ضلعداری سیکشن",
    subject: "دارہ شکنی پر درخواست",
    mouza_airchi: "",
    rajbaha: "",
    to_munshi: "",
    body: DEFAULT_BODY,
    footer_date: "",
    section: "",
    sub_division: "جوہر آباد",
  });

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=900,height=700");
    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ur"><head>
      <meta charset="UTF-8">
      <title>نوٹس وارشکنی</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
        @page { size: A4 portrait; margin: 12mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: ${URDU_FONT}; color: #1e293b; padding: 15px; direction: rtl; }
        .notice-title { text-align: center; font-size: 20px; font-weight: bold; color: #1e3a5f; border-bottom: 3px double #1e3a5f; padding-bottom: 8px; margin-bottom: 16px; }
        .field-row { display: flex; gap: 20px; margin-bottom: 10px; font-size: 13px; line-height: 2; }
        .field-row .field { flex: 1; }
        .field-label { font-weight: bold; color: #1e3a5f; }
        .field-value { border-bottom: 1px dotted #94a3b8; padding: 0 8px; min-width: 60px; display: inline-block; }
        .body-text { font-size: 13px; line-height: 2.4; text-align: justify; margin: 16px 0; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
        .clause { font-size: 12px; line-height: 2; margin: 6px 0; }
        .signatures { display: flex; justify-content: space-between; margin-top: 40px; gap: 30px; }
        .sig-box { text-align: center; min-width: 180px; }
        .sig-label { font-size: 12px; font-weight: bold; color: #1e3a5f; margin-bottom: 30px; }
        .sig-line { border-top: 1px solid #333; padding-top: 4px; font-size: 11px; color: #64748b; }
        .ref-box { position: absolute; left: 15px; top: 15px; border: 1.5px solid #1e3a5f; padding: 4px 10px; font-size: 10px; font-weight: bold; color: #1e3a5f; border-radius: 4px; }
      </style>
    </head><body>
      <div class="ref-box">ضلعداری<br/>ملفوظات</div>
      <div class="notice-title">نوٹس وارشکنی</div>

      <div class="field-row">
        <div class="field"><span class="field-label">نمبر:</span> <span class="field-value">${form.number || "—"}</span></div>
        <div class="field"><span class="field-label">تاریخ:</span> <span class="field-value">${form.date || "—"}</span></div>
      </div>

      <div class="field-row">
        <div class="field"><span class="field-label">منجانب:</span> دفتر ضلعداری سیکشن: <span class="field-value">${form.from_office || "—"}</span></div>
      </div>

      <div class="field-row">
        <div class="field"><span class="field-label">بمقدمہ:</span> ${form.subject || "—"} <span class="field-value">${form.mouza_airchi ? "موگہ ایڑ چی نمبر " + form.mouza_airchi : ""}</span></div>
      </div>

      <div class="field-row">
        <div class="field"><span class="field-label">موگہ ایڑ چی نمبر:</span> <span class="field-value">${form.mouza_airchi || "—"}</span></div>
        <div class="field"><span class="field-label">راجباہ:</span> <span class="field-value">${form.rajbaha || "—"}</span></div>
      </div>

      <div class="field-row">
        <div class="field"><span class="field-label">بنام منشی:</span> <span class="field-value">${form.to_munshi || "—"}</span></div>
      </div>

      <div class="body-text">${form.body}</div>

      <div class="field-row">
        <div class="field"><span class="field-label">مورخہ:</span> <span class="field-value">${form.footer_date || "—"}</span></div>
      </div>

      <div class="clause">گی۔ اور بعد ازاں کوئی مقدر قابل قبول نہ ہوگا۔</div>
      <div class="clause">بعد از تحریل اصل ہذا واپس کریں۔</div>

      <div class="signatures">
        <div class="sig-box">
          <div class="sig-label">دستخط ضلعدار</div>
          <div class="sig-line">ضلعداری سیکشن ${form.section || "—"}</div>
        </div>
        <div class="sig-box">
          <div class="sig-label">سیکشن</div>
          <div class="sig-line">ملحمہ ٹوانہ سب ڈویژن ${form.sub_division || "—"}</div>
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Title bar */}
          <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 text-center">
            <h2 className="text-lg font-bold text-blue-900" style={{ fontFamily: URDU_FONT, lineHeight: 2 }}>
              نوٹس وارشکنی
            </h2>
          </div>

          {/* Form fields */}
          <div className="p-5 space-y-4">
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

            {/* From office */}
            <div>
              <label className={labelCls} style={{ fontFamily: URDU_FONT }}>منجانب — دفتر ضلعداری سیکشن</label>
              <input value={form.from_office} onChange={e => update("from_office", e.target.value)}
                className={inputCls} dir="rtl" style={{ fontFamily: URDU_FONT }} />
            </div>

            {/* Subject */}
            <div>
              <label className={labelCls} style={{ fontFamily: URDU_FONT }}>بمقدمہ — دارہ شکنی پر درخواست</label>
              <input value={form.subject} onChange={e => update("subject", e.target.value)}
                className={inputCls} dir="rtl" style={{ fontFamily: URDU_FONT }} />
            </div>

            {/* Mouza + Rajbaha */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ fontFamily: URDU_FONT }}>موگہ ایڑ چی نمبر</label>
                <input value={form.mouza_airchi} onChange={e => update("mouza_airchi", e.target.value)}
                  className={inputCls} placeholder="—" dir="ltr" />
              </div>
              <div>
                <label className={labelCls} style={{ fontFamily: URDU_FONT }}>راجباہ</label>
                <input value={form.rajbaha} onChange={e => update("rajbaha", e.target.value)}
                  className={inputCls} placeholder="—" dir="rtl" style={{ fontFamily: URDU_FONT }} />
              </div>
            </div>

            {/* To Munshi */}
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

            {/* Footer date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ fontFamily: URDU_FONT }}>مورخہ</label>
                <input value={form.footer_date} onChange={e => update("footer_date", e.target.value)}
                  className={inputCls} placeholder="—" dir="rtl" />
              </div>
              <div>
                <label className={labelCls} style={{ fontFamily: URDU_FONT }}>سیکشن</label>
                <input value={form.section} onChange={e => update("section", e.target.value)}
                  className={inputCls} placeholder="—" dir="rtl" style={{ fontFamily: URDU_FONT }} />
              </div>
            </div>

            {/* Clauses */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
              <p className="text-xs text-slate-700" style={{ fontFamily: URDU_FONT, lineHeight: 2 }}>
                گی۔ اور بعد ازاں کوئی مقدر قابل قبول نہ ہوگا۔
              </p>
              <p className="text-xs text-slate-700" style={{ fontFamily: URDU_FONT, lineHeight: 2 }}>
                بعد از تحریل اصل ہذا واپس کریں۔
              </p>
            </div>

            {/* Signatures */}
            <div className="flex justify-between items-end pt-8 gap-6">
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

            {/* Ref box */}
            <div className="flex justify-start">
              <div className="border-2 border-blue-900 px-3 py-1.5 rounded text-center">
                <div className="text-[10px] font-bold text-blue-900" style={{ fontFamily: URDU_FONT }}>ضلعداری</div>
                <div className="text-[10px] font-bold text-blue-900" style={{ fontFamily: URDU_FONT }}>ملفوظات</div>
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