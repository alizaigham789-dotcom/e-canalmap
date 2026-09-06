import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Shield, LogOut, Globe, Database, Search, X } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import ModuleCard from "@/components/dashboard/ModuleCard";
import BackupRecoveryDialog from "@/components/editor/BackupRecoveryDialog";
import { useSubscription } from "@/hooks/useSubscription";

const MODULES = [
  {
    id: "map-editor",
    label: "MAP EDITOR",
    labelUrdu: "نقشہ ایڈیٹر",
    icon: "https://media.base44.com/images/public/6a3f2746a373ce99c9fd232b/b6f43b131_generated_image.png",
    path: "/map-list",
    bg: "from-[#1a8fe3] to-[#0ecad4]",
    disc: "from-amber-300 to-orange-400",
    shadow: "shadow-blue-400/40",
    locked: false,
  },
  {
    id: "geo-map",
    label: "GEO MAP",
    labelUrdu: "جیو میپ",
    icon: "https://media.base44.com/images/public/6a3f2746a373ce99c9fd232b/930109477_generated_image.png",
    path: "/geo-map",
    bg: "from-[#06b6d4] to-[#3b82f6]",
    disc: "from-orange-300 to-rose-400",
    shadow: "shadow-cyan-400/40",
    locked: false,
  },
  {
    id: "moga-merge",
    label: "MOGA MERGE",
    labelUrdu: "موجے ملائیں",
    icon: "https://media.base44.com/images/public/6a3f2746a373ce99c9fd232b/930109477_generated_image.png",
    path: "/moga-merge",
    bg: "from-[#8b5cf6] to-[#6d28d9]",
    disc: "from-lime-300 to-emerald-400",
    shadow: "shadow-violet-400/40",
    locked: false,
  },
  {
    id: "form1-register",
    label: "FORM 1 REGISTER",
    labelUrdu: "فارم نمبر 1 رجسٹر",
    icon: "https://media.base44.com/images/public/6a3f2746a373ce99c9fd232b/07b58d3d1_generated_image.png",
    path: "/form1-register",
    bg: "from-[#d97706] to-[#b45309]",
    disc: "from-sky-300 to-blue-400",
    shadow: "shadow-amber-500/40",
    locked: false,
  },
  {
    id: "khal-mismari",
    label: "KHAL MISMARI",
    labelUrdu: "کھال مسماری",
    icon: "https://media.base44.com/images/public/6a3f2746a373ce99c9fd232b/ef02ee646_generated_image.png",
    path: "/khal-mismari",
    bg: "from-[#f97316] to-[#f59e0b]",
    disc: "from-indigo-300 to-blue-400",
    shadow: "shadow-orange-400/40",
    locked: false,
  },
  {
    id: "warashikni",
    label: "WARASHIKNI",
    labelUrdu: "واراشکنی",
    icon: "https://media.base44.com/images/public/6a3f2746a373ce99c9fd232b/47a9f055d_generated_image.png",
    path: "/warashikni",
    bg: "from-[#38b6f8] to-[#0ea5e9]",
    disc: "from-amber-300 to-yellow-400",
    shadow: "shadow-sky-400/40",
    locked: false,
  },
  {
    id: "tawan-case",
    label: "TAWAN CASE DOCUMENT",
    labelUrdu: "تاوان کیس دستاویز",
    icon: "https://media.base44.com/images/public/6a3f2746a373ce99c9fd232b/39486b11f_generated_image.png",
    path: "/tawan-case",
    bg: "from-[#a855f7] to-[#d946ef]",
    disc: "from-yellow-300 to-amber-400",
    shadow: "shadow-purple-400/40",
    locked: false,
  },
  {
    id: "ta-form",
    label: "TA FORM",
    labelUrdu: "ٹی اے فارم",
    icon: "https://media.base44.com/images/public/6a3f2746a373ce99c9fd232b/1614fa96e_generated_image.png",
    path: "/ta-form",
    bg: "from-[#f43f5e] to-[#fb7185]",
    disc: "from-teal-300 to-cyan-400",
    shadow: "shadow-rose-400/40",
    locked: false,
  },
  {
    id: "warabandi",
    label: "WARABANDI PARAT",
    labelUrdu: "وارہ بندی پرت",
    icon: "https://media.base44.com/images/public/6a3f2746a373ce99c9fd232b/8253b208e_generated_image.png",
    path: "/parat-warabandi",
    bg: "from-[#11b98a] to-[#06d69a]",
    disc: "from-rose-300 to-pink-400",
    shadow: "shadow-emerald-400/40",
    locked: false,
  },
  {
    id: "canal-patwari",
    label: "CANAL PATWARI",
    labelUrdu: "کنال پٹواری",
    icon: "https://media.base44.com/images/public/6a43d51df305887291122b25/bba6d3870_Capture655.PNG",
    path: "/canal-patwari",
    bg: "from-[#0ea5e9] to-[#06b6d4]",
    disc: "from-amber-300 to-orange-400",
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
    disc: "from-yellow-300 to-amber-400",
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
    disc: "from-rose-300 to-orange-400",
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
    disc: "from-blue-300 to-indigo-400",
    shadow: "shadow-amber-400/40",
    locked: false,
  },
  {
    id: "group-chat",
    label: "GROUP CHAT",
    labelUrdu: "گروپ چیٹ",
    icon: "https://media.base44.com/images/public/6a3f2746a373ce99c9fd232b/1e8a6e3b1_generated_image.png",
    path: "/group-chat",
    bg: "from-[#8b5cf6] to-[#6d28d9]",
    disc: "from-lime-300 to-green-400",
    shadow: "shadow-violet-400/40",
    locked: false,
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [showRecovery, setShowRecovery] = useState(false);
  const [search, setSearch] = useState("");

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === "admin";
  const isDeputyCollector = currentUser?.role === "deputy_collector";
  const { data: subscription } = useSubscription();
  const hasAccess = isAdmin || !!subscription;

  // Deputy Collector role: surface the Deputy Collector module at the top on login.
  const orderedModules = isDeputyCollector
    ? [...MODULES].sort((a, b) => (a.id === "deputy-collector" ? -1 : b.id === "deputy-collector" ? 1 : 0))
    : MODULES;

  // Filter modules by search query (matches English or Urdu label)
  const filteredModules = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orderedModules;
    return orderedModules.filter(
      (m) => m.label.toLowerCase().includes(q) || m.labelUrdu.includes(search.trim())
    );
  }, [orderedModules, search]);

  const recoveryMaps = [
    { id: "6a50caf149f33fc254601cbd", title: "21671R", moga_number: "21671" },
    { id: "6a50b6f0e3b0ded6529f78ac", title: "28000 R", moga_number: "28000" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-20 antialiased">
      {/* Header — compact, app-like on mobile */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-sm safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/30 ring-1 ring-white/30">
              <Globe className="w-5 h-5 text-white" strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-sm font-bold font-heading tracking-wide text-slate-800">Canal E Record</h1>
              <p className="hidden sm:block text-[9px] text-slate-400 font-mono uppercase tracking-widest">Irrigation & Canal System</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => setShowRecovery(true)}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-slate-100 transition-colors tap-target"
              title="Backup Recovery"
            >
              <Database className="w-5 h-5" strokeWidth={2} />
            </button>
            {currentUser?.role === "admin" && (
              <button onClick={() => navigate("/admin")} className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors tap-target">
                <Shield className="w-5 h-5" strokeWidth={2} />
              </button>
            )}
            <button onClick={() => navigate("/account")} className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 text-sm font-bold hover:bg-blue-200 transition-colors tap-target" title="Account & Settings">
              {currentUser?.full_name?.[0] || "U"}
            </button>
            <button onClick={() => base44.auth.logout()} className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-slate-100 transition-colors tap-target">
              <LogOut className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Greeting */}
        <div className="mb-4">
          <h2 className="text-lg font-bold font-heading text-slate-800">
            Welcome, {currentUser?.full_name?.split(" ")[0] || "User"}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>ایک ماڈیول منتخب کریں</p>
        </div>

        {/* Search bar — quick module access, app-like */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search modules..."
            className="w-full h-11 pl-10 pr-10 rounded-xl bg-white border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Module Cards — 2-column grid, responsive on all screens */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {filteredModules.map((mod) => {
            const needsSub = mod.id === "map-editor" || mod.id === "geo-map" || mod.id === "moga-merge";
            const subLocked = needsSub && !hasAccess;
            const isLocked = !isAdmin && mod.locked;
            return (
              <ModuleCard
                key={mod.id}
                mod={mod}
                locked={isLocked}
                subLocked={subLocked}
                onClick={() => {
                  if (subLocked) { navigate("/subscription"); return; }
                  if (isLocked) return;
                  navigate(mod.path);
                }}
              />
            );
          })}
        </div>
      </main>

      <BottomNav />

      {showRecovery && (
        <BackupRecoveryDialog mapIds={recoveryMaps} onClose={() => setShowRecovery(false)} />
      )}
    </div>
  );
}