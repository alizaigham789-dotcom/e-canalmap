import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, LayoutGrid, MoreHorizontal } from "lucide-react";

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home, path: "/" },
  { id: "categories", label: "Categories", icon: LayoutGrid, path: "/canal-forms" },
  { id: "more", label: "More", icon: MoreHorizontal, path: "/admin" },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-lg sm:max-w-md sm:mx-auto sm:rounded-t-2xl safe-bottom">
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                active ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}