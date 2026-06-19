import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Map, Plus, Search, Shield, LogOut, Layers,
  Calendar, MapPin, FileText, ChevronRight, Globe, ClipboardList
} from "lucide-react";

const STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-600 border-slate-300",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  review: "bg-purple-50 text-purple-700 border-purple-200",
  approved: "bg-blue-50 text-blue-700 border-blue-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATUS_LABELS = {
  draft: "Draft",
  in_progress: "In Progress",
  review: "Under Review",
  approved: "Approved",
  published: "Published",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newMap, setNewMap] = useState({ title: "", village: "", district: "", tehsil: "" });

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: maps = [], isLoading } = useQuery({
    queryKey: ["maps"],
    queryFn: () => base44.entities.LandMap.list("-created_date", 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LandMap.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["maps"] });
      setShowCreate(false);
      setNewMap({ title: "", village: "", district: "", tehsil: "" });
      toast.success("Map created");
      navigate(`/editor?id=${created.id}`);
    },
  });

  const filtered = maps.filter(m =>
    (m.title || "").toLowerCase().includes(search.toLowerCase()) ||
    (m.village || "").toLowerCase().includes(search.toLowerCase()) ||
    (m.district || "").toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: maps.length,
    published: maps.filter(m => m.status === "published").length,
    inProgress: maps.filter(m => m.status === "in_progress").length,
    review: maps.filter(m => m.status === "review").length,
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold font-heading tracking-wide text-slate-800">CHAKBANDI GIS</h1>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">Cadastral Survey System</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/canal-forms">
              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-blue-600 gap-1.5 text-xs">
                <ClipboardList className="w-3.5 h-3.5" /> Canal Forms
              </Button>
            </Link>
            {currentUser?.role === "admin" && (
              <Link to="/admin">
                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-blue-600 gap-1.5 text-xs">
                  <Shield className="w-3.5 h-3.5" /> Admin
                </Button>
              </Link>
            )}
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <div className="w-6 h-6 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 text-[10px] font-bold">
                {currentUser?.full_name?.[0] || "U"}
              </div>
              <span className="hidden sm:inline">{currentUser?.full_name || currentUser?.email || "User"}</span>
            </div>
            <Button
              variant="ghost" size="sm"
              className="text-slate-400 hover:text-red-500 w-8 h-8 p-0"
              onClick={() => base44.auth.logout()}
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Maps", value: stats.total, borderCls: "border-blue-200", bgCls: "bg-blue-50", iconCls: "text-blue-600", textCls: "text-blue-700", icon: Map },
            { label: "Published", value: stats.published, borderCls: "border-emerald-200", bgCls: "bg-emerald-50", iconCls: "text-emerald-600", textCls: "text-emerald-700", icon: Globe },
            { label: "In Progress", value: stats.inProgress, borderCls: "border-amber-200", bgCls: "bg-amber-50", iconCls: "text-amber-600", textCls: "text-amber-700", icon: Layers },
            { label: "Under Review", value: stats.review, borderCls: "border-purple-200", bgCls: "bg-purple-50", iconCls: "text-purple-600", textCls: "text-purple-700", icon: FileText },
          ].map(({ label, value, borderCls, bgCls, iconCls, textCls, icon: Icon }) => (
            <div key={label} className={`rounded-xl border ${bgCls} ${borderCls} p-4 shadow-sm`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">{label}</span>
                <Icon className={`w-4 h-4 ${iconCls}`} />
              </div>
              <p className={`text-2xl font-bold font-heading ${textCls}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search maps by title, village, district…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 shadow-sm"
            />
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white gap-2 shrink-0 font-heading tracking-wide"
          >
            <Plus className="w-4 h-4" /> New Map
          </Button>
        </div>

        {/* Maps Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-44 rounded-xl bg-white border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Map className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              {maps.length === 0 ? "No maps yet. Create your first cadastral map." : "No maps match your search."}
            </p>
            {maps.length === 0 && (
              <Button onClick={() => setShowCreate(true)} className="mt-4 bg-blue-600 hover:bg-blue-500 gap-2">
                <Plus className="w-4 h-4" /> Create Map
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(map => (
              <Link key={map.id} to={`/editor?id=${map.id}`}>
                <div className="group rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md transition-all duration-200 overflow-hidden shadow-sm">
                  {/* Map preview header */}
                  <div className="h-24 bg-gradient-to-br from-blue-50 to-slate-100 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-30"
                      style={{
                        backgroundImage: "linear-gradient(rgba(59,130,246,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.2) 1px, transparent 1px)",
                        backgroundSize: "20px 20px"
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Map className="w-8 h-8 text-blue-200 group-hover:text-blue-400 transition-colors" />
                    </div>
                    <div className="absolute top-2 right-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[map.status || "draft"]}`}>
                        {STATUS_LABELS[map.status || "draft"]}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm text-slate-800 group-hover:text-blue-600 transition-colors truncate font-heading">
                      {map.title || "Untitled Map"}
                    </h3>
                    {(map.village || map.district) && (
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-500 truncate">
                          {[map.village, map.tehsil, map.district].filter(Boolean).join(", ")}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-500">{map.total_parcels || 0} parcels</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-500 font-mono">
                          {map.created_date ? new Date(map.created_date).toLocaleDateString() : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg text-slate-800">New Cadastral Map</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {[
              { key: "title", label: "Map Title *", placeholder: "e.g., Nurpur Canal Survey 2024" },
              { key: "village", label: "Village", placeholder: "Village name" },
              { key: "tehsil", label: "Tehsil", placeholder: "Tehsil name" },
              { key: "district", label: "District", placeholder: "District name" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-slate-500 mb-1 block">{label}</label>
                <Input
                  placeholder={placeholder}
                  value={newMap[key]}
                  onChange={e => setNewMap(p => ({ ...p, [key]: e.target.value }))}
                  className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-blue-500"
                />
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-slate-500">Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(newMap)}
              disabled={!newMap.title || createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-500 gap-2"
            >
              <Plus className="w-4 h-4" /> Create & Open Editor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}