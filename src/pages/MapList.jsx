import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Search, Map, Calendar, MapPin, Layers } from "lucide-react";
import BottomNav from "@/components/BottomNav";

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

export default function MapList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newMap, setNewMap] = useState({ title: "", village: "", district: "", tehsil: "" });

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
        <div className="max-w-md mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-sm font-bold font-heading text-slate-800">Map Editor</h1>
              <p className="text-[9px] text-slate-400 font-mono uppercase tracking-widest">Cadastral Maps</p>
            </div>
          </div>
          <Button onClick={() => setShowCreate(true)} size="sm" className="bg-blue-600 hover:bg-blue-500 text-white gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> New
          </Button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 py-5">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search maps…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200 text-sm placeholder:text-slate-400 focus:border-blue-500 shadow-sm"
          />
        </div>

        {/* Map List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white rounded-xl border border-slate-200 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Map className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm mb-4">
              {maps.length === 0 ? "No maps yet." : "No maps match your search."}
            </p>
            {maps.length === 0 && (
              <Button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-500 gap-2">
                <Plus className="w-4 h-4" /> Create Map
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(map => (
              <Link key={map.id} to={`/editor?id=${map.id}`}>
                <div className="group flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 hover:border-blue-300 hover:shadow-md transition-all shadow-sm">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center shrink-0">
                    <Map className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 truncate">
                      {map.title || "Untitled Map"}
                    </h3>
                    {(map.village || map.district) && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-500 truncate">
                          {[map.village, map.tehsil, map.district].filter(Boolean).join(", ")}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] text-slate-500">{map.total_parcels || 0} parcels</span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${STATUS_COLORS[map.status || "draft"]}`}>
                        {STATUS_LABELS[map.status || "draft"]}
                      </span>
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
            <DialogTitle className="font-heading text-lg">New Cadastral Map</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {[
              { key: "title", label: "Map Title *", placeholder: "e.g., Nurpur Canal Survey 2024" },
              { key: "village", label: "Village", placeholder: "Village name" },
              { key: "tehsil", label: "Sub Division", placeholder: "Sub Division name" },
              { key: "district", label: "Division", placeholder: "Division name" },
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
              <Plus className="w-4 h-4" /> Create & Open
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}