import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Printer, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Form1_NaqshDaroghgi from "@/components/forms/Form1_NaqshDaroghgi";
import Form2_Parwana from "@/components/forms/Form2_Parwana";
import Form3_NaqshRegister from "@/components/forms/Form3_NaqshRegister";
import Form4_Naqshbandi57 from "@/components/forms/Form4_Naqshbandi57";
import Form5_Naqshbandi47 from "@/components/forms/Form5_Naqshbandi47";
import Form6_CanalEngineer from "@/components/forms/Form6_CanalEngineer";

const FORMS = [
  { id: 1, title: "نقش داروغگی", titleEn: "Naqsh Daroghgi", desc: "نوٹس داروغہ دفتر ملہداری سیکشن", component: Form1_NaqshDaroghgi, color: "bg-blue-50 border-blue-200 text-blue-700" },
  { id: 2, title: "پروانہ پٹواری ملقہ", titleEn: "Parwana Patwari", desc: "از دفتر ملہداری صاحب سیکشن – سب ڈویژن جوہرآباد", component: Form2_Parwana, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  { id: 3, title: "نقش رجسٹر", titleEn: "Naqsh Register", desc: "نقش نمبر 27 – نام گاؤں، تحصیل، ضلع", component: Form3_NaqshRegister, color: "bg-amber-50 border-amber-200 text-amber-700" },
  { id: 4, title: "نوٹس دفعہ 57 – کینال ریونیو ایکٹ 2023", titleEn: "Notice u/s 57 Canal Revenue Act", desc: "نوٹس الاعلام یابی اجرا پرانہ بابت دارہ بندی – دفعہ 57", component: Form4_Naqshbandi57, color: "bg-purple-50 border-purple-200 text-purple-700" },
  { id: 5, title: "نوٹس دفعہ 47 – کینال ریونیو ایکٹ 2023", titleEn: "Notice u/s 47 Canal Revenue Act", desc: "نوٹس الاعلام یابی بابت مسارشدہ کمال – دفعہ 47", component: Form5_Naqshbandi47, color: "bg-rose-50 border-rose-200 text-rose-700" },
  { id: 6, title: "رپورٹ کینال انجینئر", titleEn: "Canal Engineer Report", desc: "بخدمت سب ڈویژنل کینال آفیسر صاحب – موقع کیس بابت", component: Form6_CanalEngineer, color: "bg-cyan-50 border-cyan-200 text-cyan-700" },
];

export default function CanalForms() {
  const [activeForm, setActiveForm] = useState(null);
  const ActiveComponent = activeForm ? FORMS.find(f => f.id === activeForm)?.component : null;

  if (activeForm && ActiveComponent) {
    const formMeta = FORMS.find(f => f.id === activeForm);
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-10 print:hidden shadow-sm">
          <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                onClick={() => setActiveForm(null)}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <p className="text-xs text-slate-400 font-mono">Form {activeForm} / 6</p>
                <h1 className="text-sm font-bold text-slate-800 font-heading">{formMeta.titleEn}</h1>
              </div>
            </div>
            <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 gap-1.5 text-xs text-white shadow-sm"
              onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </Button>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <ActiveComponent />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-base font-bold font-heading tracking-wide text-slate-800">Canal Patwari Forms</h1>
            <p className="text-[10px] text-slate-500 font-mono">کینال پٹواری سرکاری فارمز</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <p className="text-xs text-slate-500 mb-6 font-mono" style={{ direction: "rtl" }}>
          ملہداری کینال سب ڈویژن جوہرآباد — تمام سرکاری فارمز
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FORMS.map((form) => (
            <button
              key={form.id}
              onClick={() => setActiveForm(form.id)}
              className="group text-left rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md transition-all duration-200 p-5 flex items-start gap-4 shadow-sm"
            >
              <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${form.color}`}>
                <span className="font-bold font-heading text-sm">{form.id}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-slate-400 font-mono mb-0.5">{form.titleEn}</p>
                <h3 className="text-base font-bold text-slate-800 group-hover:text-blue-600 transition-colors" style={{ direction: "rtl", fontFamily: "serif" }}>
                  {form.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed" style={{ direction: "rtl", fontFamily: "serif" }}>
                  {form.desc}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0 mt-3" />
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}