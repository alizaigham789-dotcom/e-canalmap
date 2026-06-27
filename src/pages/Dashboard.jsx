import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Shield, LogOut, Globe, Lock } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const MODULES = [
  { id: "map-editor", label: "MAP EDITOR", labelUrdu: "نقشہ ایڈیٹر", icon: "https://media.base44.com/images/public/6a3c9964ecf8b3a6cde6f09b/b98e0885c_generated_image.png", path: "/map-list", bg: "from-blue-50 to-blue-100", locked: true },
  { id: "warabandi", label: "WARABANDI PARAT", labelUrdu: "وارہ بندی پرت", icon: "https://media.base44.com/images/public/6a3c9964ecf8b3a6cde6f09b/ddf8bc723_generated_image.png", path: "/parat-warabandi", bg: "from-green-50 to-green-100", locked: true },
  { id: "khal-mismari", label: "KHAL MISMARI", labelUrdu: "کھال مسماری", icon: "https://media.base44.com/images/public/6a3c9964ecf8b3a6cde6f09b/5e2f34f0a_generated_image.png", path: "/khal-mismari", bg: "from-orange-50 to-orange-100", locked: true },
  { id: "warashikni", label: "WARASHIKNI", labelUrdu: "واراشکنی", icon: "https://media.base44.com/images/public/6a3c9964ecf8b3a6cde6f09b/187981eaa_generated_image.png", path: "/warashikni", bg: "from-sky-50 to-sky-100", locked: true },
  { id: "tawan-case", label: "TAWAN CASE DOCUMENT", labelUrdu: "تاوان کیس دستاویز", icon: "https://media.base44.com/images/public/6a3c9964ecf8b3a6cde6f09b/d5b3c8e48_generated_image.png", path: "/tawan-case", bg: "from-purple-50 to-purple-100", locked: true },
  { id: "ta-form", label: "TA FORM", labelUrdu: "ٹی اے فارم", icon: "https://media.base44.com/images/public/6a3c9964ecf8b3a6cde6f09b/887265e12_generated_image.png", path: "/ta-form", bg: "from-pink-50 to-pink-100", locked: true },
  { id: "geo-map", label: "GEO MAP", labelUrdu: "جیو میپ", icon: "https://media.base44.com/images/public/6a3c9964ecf8b3a6cde6f09b/96bc463c2_generated_image.png", path: "/geo-map", bg: "from-blue-50 to-cyan-100", locked: true },
  { id: "deputy-collector", label: "DEPUTY COLLECTOR DOCUMENTS", labelUrdu: "ڈپٹی کلکٹر دستاویزات", icon: "https://media.base44.com/images/public/6a3c9964ecf8b3a6cde6f09b/40a685ff8_generated_image.png", path: "/deputy-collector", bg: "from-green-50 to-emerald-100", locked: false },
  { id: "zilladar", label: "ZILLADAR DOCUMENTS", labelUrdu: "ضلعدار دستاویزات", icon: "https://media.base44.com/images/public/6a3c9964ecf8b3a6cde6f09b/28c493acc_generated_image.png", path: "/zilladar", bg: "from-orange-50 to-amber-100", locked: true },
  { id: "group-chat", label: "GROUP CHAT", labelUrdu: "گروپ چیٹ", icon: "https://media.base44.com/images/public/6a3c9964ecf8b3a6cde6f09b/61b0a5032_generated_image.png", path: "/group-chat", bg: "from-violet-50 to-purple-100", locked: true },
];

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 antialiased">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
        <div className="max-w-md mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/30 ring-1 ring-white/30">
              <Globe className="w-4.5 h-4.5 text-white" strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-sm font-bold font-heading tracking-wide text-slate-800">CHAKBANDI GIS</h1>
              <p className="text-[9px] text-slate-400 font-mono uppercase tracking-widest">Irrigation & Canal System</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentUser?.role === "admin" && (
              <button onClick={() => navigate("/admin")} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors">
                <Shield className="w-4 h-4" strokeWidth={2} />
              </button>
            )}
            <div className="w-7 h-7 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 text-[10px] font-bold">
              {currentUser?.full_name?.[0] || "U"}
            </div>
            <button onClick={() => base44.auth.logout()} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-slate-100 transition-colors">
              <LogOut className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-5 py-6">
        {/* Greeting */}
        <div className="mb-6">
          <h2 className="text-lg font-bold font-heading text-slate-800">
            Welcome, {currentUser?.full_name?.split(" ")[0] || "User"}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Select a module to continue</p>
        </div>

        {/* Module Cards — 2-column grid */}
        <div className="grid grid-cols-2 gap-4">
          {MODULES.map((mod) => {
            const isLocked = !isAdmin && mod.locked;
            return (
              <button
                key={mod.id}
                onClick={() => !isLocked && navigate(mod.path)}
                disabled={isLocked}
                className={`group relative rounded-[24px] bg-gradient-to-br ${mod.bg} p-4 shadow-md shadow-slate-200/60 ring-1 ring-slate-200/50 transition-all duration-200 text-center min-h-[150px] flex flex-col items-center justify-center
                  ${isLocked ? "opacity-50 cursor-not-allowed grayscale" : "hover:shadow-lg hover:scale-[1.03] active:scale-[0.98] cursor-pointer"}`}
              >
                {isLocked && (
                  <div className="absolute top-2 right-2 bg-slate-600/80 rounded-full p-1">
                    <Lock className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="mb-2 w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <img src={mod.icon} alt={mod.label} className="w-16 h-16 object-contain drop-shadow-sm" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-800 tracking-wide leading-tight">{mod.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>{mod.labelUrdu}</p>
                </div>
              </button>
            );
          })}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}