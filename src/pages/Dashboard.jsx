import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Shield, LogOut, Globe } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const MODULES = [
  { id: "map-editor", label: "MAP EDITOR", labelUrdu: "نقشہ ایڈیٹر", icon: "🗺️", path: "/map-list", gradient: "from-blue-500 to-cyan-400" },
  { id: "warabandi", label: "WARABANDI PARAT", labelUrdu: "وارابندی پرت", icon: "📄", path: "/parat-warabandi", gradient: "from-emerald-500 to-teal-400" },
  { id: "khal-mismari", label: "KHAL MISMARI", labelUrdu: "خال مسماری", icon: "⛏️", path: "/khal-mismari", gradient: "from-amber-500 to-orange-400" },
  { id: "warashikni", label: "WARASHIKNI", labelUrdu: "وارشکنی", icon: "🌊", path: "/warashikni", gradient: "from-sky-500 to-blue-400" },
  { id: "tawan-case", label: "TAWAN CASE DOCUMENT", labelUrdu: "تاوان کیس دستاویز", icon: "⚖️", path: "/tawan-case", gradient: "from-purple-500 to-violet-400" },
  { id: "ta-form", label: "TA FORM", labelUrdu: "ٹی اے فارم", icon: "📝", path: "/ta-form", gradient: "from-rose-500 to-pink-400" },
];

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
        <div className="max-w-md mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-md">
              <Globe className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold font-heading tracking-wide text-slate-800">CHAKBANDI GIS</h1>
              <p className="text-[9px] text-slate-400 font-mono uppercase tracking-widest">Irrigation & Canal System</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentUser?.role === "admin" && (
              <button onClick={() => navigate("/admin")} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors">
                <Shield className="w-4 h-4" />
              </button>
            )}
            <div className="w-7 h-7 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 text-[10px] font-bold">
              {currentUser?.full_name?.[0] || "U"}
            </div>
            <button onClick={() => base44.auth.logout()} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-slate-100 transition-colors">
              <LogOut className="w-3.5 h-3.5" />
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
              className={`group relative rounded-[28px] bg-gradient-to-br ${mod.gradient} p-5 shadow-lg hover:shadow-xl hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 text-center min-h-[140px] flex flex-col items-center justify-center`}
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200">
                {mod.icon}
              </div>
              <div>
                <p className="text-xs font-bold text-white tracking-wide leading-tight">{mod.label}</p>
                <p className="text-[10px] text-white/70 mt-1" style={{ fontFamily: "serif" }}>{mod.labelUrdu}</p>
              </div>
            </button>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}