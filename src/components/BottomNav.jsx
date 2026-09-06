import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Map, FileText, User } from "lucide-react";

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home, path: "/" },
  { id: "maps", label: "Maps", icon: Map, path: "/map-list" },
  { id: "forms", label: "Forms", icon: FileText, path: "/canal-forms" },
  { id: "account", label: "Account", icon: User, path: "/account" },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] safe-bottom">
      <div className="flex items-stretch justify-around h-[60px] px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors tap-target"
            >
              {/* Active indicator pill behind icon */}
              <div className={`relative flex items-center justify-center w-10 h-7 rounded-full transition-all duration-300 ${active ? "bg-blue-100" : ""}`}>
                <Icon className={`w-[22px] h-[22px] transition-all duration-300 ${active ? "text-blue-600 scale-110" : "text-slate-400"}`} strokeWidth={active ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-semibold transition-colors ${active ? "text-blue-600" : "text-slate-400"}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}