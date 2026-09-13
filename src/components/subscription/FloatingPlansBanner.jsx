import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, Flame, Sparkles } from "lucide-react";
import { PLANS, getPlanPrice, getFlashState, formatCountdown } from "@/lib/referralSystem";
import { useHasSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/lib/AuthContext";

const DISMISS_KEY = "floating_plans_dismissed";
const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];

// Floating mini-summary of the 3 subscription plans that hovers over the app
// for non-subscribers (non-admin), driving them to /subscription. Shows the
// flash-sale discounted price + a live 48h countdown when active.
export default function FloatingPlansBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasAccess } = useHasSubscription();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    try { setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1"); } catch {}
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (dismissed) return null;
  if (hasAccess) return null;
  if (location.pathname === "/subscription") return null;
  if (AUTH_PAGES.includes(location.pathname)) return null;

  const flash = getFlashState(user);

  const close = () => {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch {}
  };

  return (
    <div className="fixed bottom-4 right-4 z-[1200] w-[280px] bg-white rounded-2xl shadow-2xl border-2 border-blue-200 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-[11px] font-bold">سبسکرپشن پلانز</span>
        </div>
        <button onClick={close} className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/20">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {flash.active && (
        <div className="px-3 py-1 bg-red-50 border-b border-red-100 flex items-center gap-1">
          <Flame className="w-3 h-3 text-red-500 animate-pulse" />
          <span className="text-[9px] font-bold text-red-600 font-mono">فلیش سیل — {formatCountdown(flash.msLeft)}</span>
        </div>
      )}
      <div className="p-2 space-y-1.5">
        {PLANS.map((p) => {
          const price = getPlanPrice(p.code, flash.active);
          const discounted = flash.active && price < p.price;
          return (
            <button
              key={p.code}
              onClick={() => navigate("/subscription")}
              className="w-full flex items-center justify-between rounded-lg border border-slate-200 px-2.5 py-1.5 hover:border-blue-400 hover:bg-blue-50/50 transition-colors text-right"
            >
              <span className="text-[11px] font-bold text-slate-700">
                {p.labelUr} <span className="text-[9px] text-slate-400">· {p.months} ماہ</span>
              </span>
              <span className="flex items-center gap-1.5">
                {discounted && <span className="text-[9px] text-slate-400 line-through font-mono">{p.price}</span>}
                <span className="text-[12px] font-bold text-blue-700 font-mono">Rs {price}</span>
              </span>
            </button>
          );
        })}
      </div>
      <button
        onClick={() => navigate("/subscription")}
        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold"
      >
        سبسکرائب کریں
      </button>
    </div>
  );
}