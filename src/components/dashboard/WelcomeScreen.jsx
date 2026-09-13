import React, { useState } from "react";
import {
  X,
  Sparkles,
  Map,
  FileText,
  Globe,
  FileSpreadsheet,
  FolderOpen,
  Calculator,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: Map,
    title: "پرانے نقشے ڈیجیٹل کریں",
    desc: "اپنے پرانے کنال نقشے آسانی سے ڈیجیٹل بنائیں",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: FileText,
    title: "وارابندی پرت نئی اور ڈیجیٹل",
    desc: "پرانی وارابندی پرت کو نئی اور ڈیجیٹل شکل میں تبدیل کریں",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Globe,
    title: "ایک کلک پر گوگل ارتھ پر اوورلے",
    desc: "نقشہ جیو میپ پر اوورلے کر کے مقام پر کھال اور لوکیشن تلاش کریں",
    color: "from-sky-500 to-indigo-500",
  },
  {
    icon: FileSpreadsheet,
    title: "خودکار فارم 1",
    desc: "نقشے پر پیچز الاٹ کر کے فارم 1 خودکار بنائیں",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: FolderOpen,
    title: "تمام دستاویزات ڈیجیٹل",
    desc: "تاوان کیس، فرد مسروبہ، 33C اور باقی تمام دستاویزات موبائل پر",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: Calculator,
    title: "وارابندی کیلکولیشن آسان",
    desc: "ایپ سب کچھ خود حساب کرے گی — آسان اور تیز",
    color: "from-rose-500 to-pink-500",
  },
];

export default function WelcomeScreen() {
  const [show, setShow] = useState(() => !sessionStorage.getItem("welcome_shown"));

  const dismiss = () => {
    sessionStorage.setItem("welcome_shown", "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[1400] flex items-stretch sm:items-center justify-center bg-slate-900/70 backdrop-blur-sm overflow-auto">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl shadow-2xl flex flex-col min-h-full sm:min-h-0 sm:max-h-[92vh] overflow-auto">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-500 px-5 py-7 sm:rounded-t-2xl text-white overflow-hidden">
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -left-10 -bottom-12 w-40 h-40 rounded-full bg-white/10" />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3 h-3" /> Canal E Record
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading leading-tight">
              Welcome to the world of Digitization
            </h1>
            <p className="text-sm text-blue-50 mt-1.5" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
              ڈیجیٹلائزیشن کی دنیا میں خوش آمدید
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="flex-1 px-4 sm:px-5 py-4 space-y-2.5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:bg-slate-50 transition-colors">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${f.color} flex items-center justify-center text-white shrink-0 shadow-sm`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>{f.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer CTA */}
        <div className="px-4 sm:px-5 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
          <button
            onClick={dismiss}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/30 transition-colors"
          >
            شروع کریں <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}