import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Shield, LogOut, Globe } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const MODULES = [
  { id: "map-editor", label: "MAP EDITOR", labelUrdu: "نقشہ ایڈیٹر", icon: "https://media.base44.com/images/public/6a3c9964ecf8b3a6cde6f09b/95cfcc6b7_generated_image.png", path: "/map-list", bg: "from-blue-50 to-blue-100" },
  { id: "warabandi", label: "WARABANDI PARAT", labelUrdu: "وارابندی پرت", icon: "https://media.base44.com/images/public/6a3c9964ecf8b3a6cde6f09b/a72cdee99_generated_image.png", path: "/parat-warabandi", bg: "from-green-50 to-green-100" },
  { id: "khal-mismari", label: "KHAL MISMARI", labelUrdu: "خال مسماری", icon: "https://media.base44.com/images/public/6a3c9964ecf8b3a6cde6f09b/16b5f7025_generated_image.png", path: "/khal-mismari", bg: "from-orange-50 to-orange-100" },
  { id: "warashikni", label: "WARASHIKNI", labelUrdu: "وارشکنی", icon: "https://media.base44.com/images/public/6a3c9964ecf8b3a6cde6f09b/316f23d74_generated_image.png", path: "/warashikni", bg: "from-sky-50 to-sky-100" },
  { id: "tawan-case", label: "TAWAN CASE", labelUrdu: "تاوان کیس", icon: "https://media.base44.com/images/public/6a3c9964ecf8b3a6cde6f09b/f6a632e03_generated_image.png", path: "/tawan-case", bg: "from-purple-50 to-purple-100" },
  { id: "ta-form", label: "TA FORM", labelUrdu: "ٹی اے فارم", icon: "https://media.base44.com/images/public/6a3c9964ecf8b3a6cde6f09b/83d2ce503_generated_image.png", path: "/ta-form", bg: "from-pink-50 to-pink-100" },
  { id: "geo-map", label: "GEO MAP", labelUrdu: "جیو میپ", icon: "https://media.base44.com/images/public/6a3c9964ecf8b3a6cde6f09b/06d24a88b_generated_image.png", path: "/geo-map", bg: "from-blue-50 to-cyan-100" },
  { id: "deputy-collector", label: "DEPUTY COLLECTOR", labelUrdu: "ڈپٹی کلکٹر دستاویزات", icon: "https://media.base44.com/images/public/6a3c9964ecf8b3a6cde6f09b/bfe2c768f_generated_image.png", path: "/deputy-collector", bg: "from-green-50 to-emerald-100" },
  { id: "zilladar", label: "ZILLADAR DOCS", labelUrdu: "ذیلدار دستاویزات", icon: "https://media.base44.com/images/public/6a3c9964ecf8b3a6cde6f09b/2086f36ed_generated_image.png", path: "/zilladar", bg: "from-orange-50 to-amber-100" },
  { id: "group-chat", label: "GROUP CHAT", labelUrdu: "گروپ چیٹ", icon: "https://media.base44.com/images/public/6a3c9964ecf8b3a6cde6f09b/9566e5eca_generated_image.png", path: "/group-chat", bg: "from-violet-50 to-purple-100" },
];

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

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
          {MODULES.map((mod) => (
            <button
              key={mod.id}
              onClick={() => navigate(mod.path)}
              className={`group relative rounded-[24px] bg-gradient-to-br ${mod.bg} p-4 shadow-md shadow-slate-200/60 hover:shadow-lg hover:scale-[1.03] active:scale-[0.98] ring-1 ring-slate-200/50 transition-all duration-200 text-center min-h-[150px] flex flex-col items-center justify-center`}
            >
              <div className="mb-2 w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <img src={mod.icon} alt={mod.label} className="w-16 h-16 object-contain drop-shadow-sm" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-800 tracking-wide leading-tight">{mod.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>{mod.labelUrdu}</p>
              </div>
            </button>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}