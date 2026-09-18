import React, { useState } from "react";
import { Gift, Copy, Check, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PLANS, lowestPlanCode } from "@/lib/referralSystem";

// Referral share link + progress toward the free-plan reward (3 paid friends).
export default function ReferralCard({ user, qualifiedCount, totalReferred }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/register?ref=${user?.id || ""}`;
  const remaining = Math.max(0, 3 - qualifiedCount);
  const rewardCode = lowestPlanCode(PLANS.map((p) => p.code));
  const rewardPlan = PLANS.find((p) => p.code === rewardCode);

  const copy = () => {
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      toast.success("ریفرل لنک کاپی ہو گیا");
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => toast.error("کاپی نہیں ہوا"));
  };

  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Gift className="w-5 h-5 text-violet-600" />
        <p className="text-sm font-bold text-violet-800">دوستوں کو مدعو کریں — پلان مفت پائیں</p>
      </div>
      <p className="text-xs text-violet-700 mb-3 leading-relaxed">
        3 دوست اپنے ریفرل لنک سے جوائن کر کے ادائیگی کریں → آپ کو <b>{rewardPlan?.labelUr || "اسٹارٹر"} پلان</b> (Rs {rewardPlan?.discountPrice || 1500}) <b>مفت</b> مل جائے گی۔
      </p>

      <div className="flex items-center gap-2 bg-white rounded-lg border border-violet-200 p-2">
        <input
          readOnly
          value={link}
          className="flex-1 text-[11px] text-slate-600 bg-transparent outline-none font-mono truncate"
        />
        <Button size="sm" onClick={copy} className="bg-violet-600 hover:bg-violet-700 h-8">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "ہو گیا" : "کاپی"}
        </Button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Users className="w-4 h-4 text-violet-600 shrink-0" />
        <div className="flex-1">
          <div className="flex justify-between text-[10px] text-violet-700 mb-0.5">
            <span>{qualifiedCount} / 3 ادائیگی مکمل</span>
            <span>{totalReferred} کل مدعو</span>
          </div>
          <div className="h-2 rounded-full bg-violet-100 overflow-hidden">
            <div
              className="h-full bg-violet-600 rounded-full transition-all"
              style={{ width: `${Math.min(100, (qualifiedCount / 3) * 100)}%` }}
            />
          </div>
        </div>
        <span className="text-[11px] font-bold text-violet-700 whitespace-nowrap">
          {remaining > 0 ? `${remaining} باقی` : "مکمل!"}
        </span>
      </div>
    </div>
  );
}