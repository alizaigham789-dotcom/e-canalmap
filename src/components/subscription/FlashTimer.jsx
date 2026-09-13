import React, { useState, useEffect } from "react";
import { Flame } from "lucide-react";
import { formatCountdown } from "@/lib/referralSystem";

// 48-hour flash-sale countdown banner for newly joined users.
export default function FlashTimer({ msLeft }) {
  const [left, setLeft] = useState(msLeft);

  useEffect(() => {
    setLeft(msLeft);
    const t = setInterval(() => setLeft((v) => Math.max(0, v - 1000)), 1000);
    return () => clearInterval(t);
  }, [msLeft]);

  if (left <= 0) return null;

  return (
    <div className="rounded-2xl border-2 border-red-300 bg-gradient-to-r from-red-50 to-orange-50 p-3 flex items-center gap-3">
      <Flame className="w-6 h-6 text-red-500 shrink-0 animate-pulse" />
      <div className="min-w-0">
        <p className="text-xs font-bold text-red-700">خصوصی رعایت — نئے یوزرز کے لیے</p>
        <p className="text-[10px] text-red-600">رعایت ختم ہونے میں باقی</p>
      </div>
      <div className="ml-auto font-mono font-bold text-lg text-red-700 tabular-nums">
        {formatCountdown(left)}
      </div>
    </div>
  );
}