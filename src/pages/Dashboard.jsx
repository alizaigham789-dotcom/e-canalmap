import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Shield, LogOut, Globe, Lock } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const MODULES = [
  {
    id: "map-editor",
    label: "MAP EDITOR",
    labelUrdu: "نقشہ ایڈیٹر",
    icon: "https://media.base44.com/images/public/6a3f2746a373ce99c9fd232b/b6f43b131_generated_image.png",
    path: "/map-list",
    bg: "from-[#1a8fe3] to-[#0ecad4]",
    shadow: "shadow-blue-400/40",
    locked: true,
  },
  {
    id: "warabandi",
    label: "WARABANDI PARAT",
    labelUrdu: "وارہ بندی پرت",
    icon: "https://media.base44.com/images/public/6a3f2746a373ce99c9fd232b/8253b208e_generated_image.png",
    path: "/parat-warabandi",
    bg: "from-[#11b98a] to-[#06d69a]",
    shadow: "shadow-emerald-400/40",
    locked: true,
  },
  {
    id: "khal-mismari",
    label: "KHAL MISMARI",
    labelUrdu: "کھال مسماری",
    icon: "https://media.base44.com/images/public/6a3f2746a373ce99c9fd232b/ef02ee646_generated_image.png",
    path: "/khal-mismari",
    bg: "from-[#f97316] to-[#f59e0b]",
    shadow: "shadow-orange-400/40",
    locked: true,
  },
  {
    id: "warashikni",
    label: "WARASHIKNI",
    labelUrdu: "واراشکنی",
    icon: "https://media.base44.com/images/public/6a3f2746a373ce99c9fd232b/47a9f055d_generated_image.png",
    path: "/warashikni",
    bg: "from-[#38b6f8] to-[#0ea5e9]",
    shadow: "shadow-sky-400/40",
    locked: true,
  },
  {
    id: "tawan-case",
    label: "TAWAN CASE DOCUMENT",
    labelUrdu: "تاوان کیس دستاویز",
    icon: "https://media.base44.com/images/public/6a3f2746a373ce99c9fd232b/39486b11f_generated_image.png",
    path: "/tawan-case",
    bg: "from-[#a855f7] to-[#d946ef]",
    shadow: "shadow-purple-400/40",
    locked: true,
  },
  {
    id: "ta-form",
    label: "TA FORM",
    labelUrdu: "ٹی اے فارم",
    icon: "https://media.base44.com/images/public/6a3f2746a373ce99c9fd232b/1614fa96e_generated_image.png",
    path: "/ta-form",
    bg: "from-[#f43f5e] to-[#fb7185]",
    shadow: "shadow-rose-400/40",
    locked: true,
  },
  {
    id: "geo-map",
    label: "GEO MAP",
    labelUrdu: "جیو میپ",
    icon: "https://media.base44.com/images/public/6a3f2746a373ce99c9fd232b/930109477_generated_image.png",
    path: "/geo-map",
    bg: "from-[#06b6d4] to-[#3b82f6]",
    shadow: "shadow-cyan-400/40",
    locked: true,
  },
  {
    id: "canal-patwari",
    label: "CANAL PATWARI",
    labelUrdu: "کنال پٹواری",
    icon: "https://media.base44.com/images/public/6a43d51df305887291122b25/bba6d3870_Capture655.PNG",
    path: "/canal-patwari",
    bg: "from-[#0ea5e9] to-[#06b6d4]",
    shadow: "shadow-cyan-400/40",
    locked: false,
  },
  {
    id: "chakbandi-ikhraj",
    label: "CHAKBANDI IKHRAJ",
    labelUrdu: "چکبندی اخراج کیس",
    icon: "https://media.base44.com/images/public/6a43d51df305887291122b25/bba6d3870_Capture655.PNG",
    path: "/chakbandi-ikhraj",
    bg: "from-[#6366f1] to-[#8b5cf6]",
    shadow: "shadow-indigo-400/40",
    locked: false,
  },
  {
    id: "deputy-collector",
    label: "DEPUTY COLLECTOR",
    labelUrdu: "ڈپٹی کلکٹر دستاویزات",
    icon: "https://media.base44.com/images/public/6a3f2746a373ce99c9fd232b/07b58d3d1_generated_image.png",
    path: "/deputy-collector",
    bg: "from-[#10b981] to-[#059669]",
    shadow: "shadow-emerald-400/40",
    locked: false,
  },
  {
    id: "zilladar",
    label: "ZILLADAR DOCUMENTS",
    labelUrdu: "ضلعدار دستاویزات",
    icon: "https://media.base44.com/images/public/6a3f2746a373ce99c9fd232b/79a49ba3d_generated_image.png",
    path: "/zilladar",
    bg: "from-[#f59e0b] to-[#d97706]",
    shadow: "shadow-amber-400/40",
    locked: true,
  },
  {
    id: "group-chat",
    label: "GROUP CHAT",
    labelUrdu: "گروپ چیٹ",
    icon: "https://media.base44.com/images/public/6a3f2746a373ce99c9fd232b/1e8a6e3b1_generated_image.png",
    path: "/group-chat",
    bg: "from-[#8b5cf6] to-[#6d28d9]",
    shadow: "shadow-violet-400/40",
    locked: true,
  },
];

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-20 antialiased">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
        <div className="max-w-md mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/30 ring-1 ring-white/30">
              <Globe className="w-5 h-5 text-white" strokeWidth={2.2} />
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
      <main className="max-w-md mx-auto px-4 py-6">
        {/* Greeting */}
        <div className="mb-5">
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
                className={`group relative rounded-[28px] bg-gradient-to-br ${mod.bg} p-4 shadow-lg ${mod.shadow} transition-all duration-200 text-center min-h-[155px] flex flex-col items-center justify-center overflow-hidden
                  ${isLocked ? "opacity-60 cursor-not-allowed" : "hover:shadow-xl hover:scale-[1.04] active:scale-[0.97] cursor-pointer"}`}
              >
                {/* Glossy top sheen */}
                <div className="absolute inset-x-0 top-0 h-1/2 bg-white/15 rounded-t-[22px] pointer-events-none" />

                {isLocked && (
                  <div className="absolute top-2.5 right-2.5 bg-black/30 backdrop-blur-sm rounded-full p-1 z-10">
                    <Lock className="w-3 h-3 text-white" />
                  </div>
                )}

                {/* Icon — no white box, just the icon with drop-shadow */}
                <div className="mb-3 w-[72px] h-[72px] flex items-center justify-center transition-all duration-200 group-hover:-translate-y-1.5 group-hover:scale-110">
                  <img
                    src={mod.icon}
                    alt={mod.label}
                    className="w-[68px] h-[68px] object-contain"
                    style={{ filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.45)) brightness(1.05) contrast(1.05)" }}
                  />
                </div>

                <div className="relative z-10">
                  <p className="text-[11px] font-bold text-white tracking-wide leading-tight drop-shadow-sm">{mod.label}</p>
                  <p className="text-[9px] text-white/80 mt-0.5 drop-shadow-sm" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>{mod.labelUrdu}</p>
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