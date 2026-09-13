import React from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// Reusable upgrade wall — shown when a non-subscriber tries to print / export /
// add a second moga overlay. Routes them to the subscription page.
export default function UpgradePrompt({ open, onClose, title = "Upgrade ضروری ہے" }) {
  const navigate = useNavigate();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
        >
          ✕
        </button>
        <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-3">
          <Lock className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1.5" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
          {title}
        </h3>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
          پرنٹ / PDF ڈاؤن لوڈ کے لیے سبسکرپشن ضروری ہے۔ سبسکرپشن لے کر مکمل رسائی حاصل کریں۔
        </p>
        <Button
          onClick={() => {
            onClose();
            navigate("/subscription");
          }}
          className="w-full bg-blue-600 hover:bg-blue-700 gap-2"
        >
          <Sparkles className="w-4 h-4" /> سبسکرپشن دیکھیں
        </Button>
        <button
          onClick={onClose}
          className="mt-2 text-xs text-slate-400 hover:text-slate-600"
          style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}
        >
          ابھی نہیں
        </button>
      </div>
    </div>
  );
}