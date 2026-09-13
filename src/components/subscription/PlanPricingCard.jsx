import React from "react";
import { Check, Star } from "lucide-react";
import { getPlanPrice } from "@/lib/referralSystem";

// A single pricing-tier card (Base44-style plan layout): header, price, feature
// list with checkmarks, and a select CTA. The "popular" tier is highlighted.
export default function PlanPricingCard({ plan, flashActive, selected, onSelect }) {
  const price = getPlanPrice(plan.code, flashActive);
  const discounted = flashActive && price < plan.price;

  return (
    <div
      className={`relative rounded-2xl border-2 p-4 flex flex-col transition-all bg-white ${
        selected
          ? "border-blue-500 ring-2 ring-blue-200"
          : plan.popular
          ? "border-blue-300 shadow-md shadow-blue-100"
          : "border-slate-200"
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center gap-1 whitespace-nowrap">
          <Star className="w-2.5 h-2.5" /> مقبول
        </div>
      )}

      <div className="text-center pb-3 border-b border-slate-100">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{plan.label}</p>
        <p className="text-sm font-bold text-slate-800 mt-0.5" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
          {plan.labelUr}
        </p>
      </div>

      <div className="text-center py-3">
        {discounted && (
          <span className="block text-xs text-slate-400 line-through font-mono">Rs {plan.price}</span>
        )}
        <span className="text-2xl font-bold text-blue-700 font-mono">Rs {price}</span>
        <span className="block text-[10px] text-slate-400 mt-0.5">{plan.months} ماہ</span>
      </div>

      <ul className="space-y-1.5 pb-3 flex-1">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-600">
            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>{f}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(plan.code)}
        className={`w-full h-9 rounded-lg text-xs font-bold transition-colors ${
          selected
            ? "bg-blue-600 text-white"
            : plan.popular
            ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
            : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
        }`}
      >
        {selected ? "منتخب شدہ ✓" : "منتخب کریں"}
      </button>
    </div>
  );
}