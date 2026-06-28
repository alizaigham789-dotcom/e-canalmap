import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Save, Printer, Plus, FileText, ChevronRight, Trash2 } from "lucide-react";
import WarabandiForm from "@/components/warabandi/WarabandiForm";
import WarabandiHeaderBar from "@/components/warabandi/WarabandiHeaderBar";
import ShareholderTable from "@/components/warabandi/ShareholderTable";
import WarabandiPrint from "@/components/warabandi/WarabandiPrint";
import WarabandiParatForm from "@/components/warabandi/WarabandiParatForm";
import WarabandiTimeSchedule from "@/components/warabandi/WarabandiTimeSchedule";
import BottomNav from "@/components/BottomNav";

const emptyRow = (sr) => ({
  sr_no: String(sr), owner_name: "", father_name: "", khewat_no: "", khatoni_no: "",
  khasra_no: "", area_acre: "", area_kanal: "", area_marla: "", water_share: "",
  duration_hours: "", duration_minutes: "", remarks: "",
});

const EMPTY_DATA = {
  warabandi_type: "", canal_name: "", mogha_name: "", mogha_number: "", mogha_side: "",
  village_name: "", sub_division: "", division: "", warabandi_date: "",
  applicant_name: "", applicant_father: "", applicant_cnic: "",
};

export default function ParatWarabandi() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get("id");

  const [mode, setMode] = useState(editId ? "edit" : "list");
  const [activeTab, setActiveTab] = useState("list"); // "list" | "new-parat"
  const [formData, setFormData] = useState({ ...EMPTY_DATA });
  const [shareholders, setShareholders] = useState([emptyRow(1), emptyRow(2), emptyRow(3)]);
  const [showPrint, setShowPrint] = useState(false);
  const [currentId, setCurrentId] = useState(editId || null);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["parat-warabandi"],
    queryFn: () => base44.entities.ParatWarabandi.list("-created_date", 50),
    enabled: mode === "list",
  });

  const { data: existing } = useQuery({
    queryKey: ["parat-warabandi", currentId],
    queryFn: () => base44.entities.ParatWarabandi.filter({ id: currentId }).then(r => r[0]),
    enabled: !!currentId && mode === "edit",
  });

  useEffect(() => {
    if (existing) {
      const { shareholders: sh, ...rest } = existing;
      setFormData(rest);
      if (sh) {
        try { setShareholders(JSON.parse(sh)); } catch { setShareholders([emptyRow(1)]); }
      }
    }
  }, [existing?.id]);

  const saveMutation = useMutation({
    mutationFn: (payload) => {
      if (currentId) return base44.entities.ParatWarabandi.update(currentId, payload);
      return base44.entities.ParatWarabandi.create(payload);
    },
    onSuccess: (result) => {
      toast.success("Saved successfully");
      queryClient.invalidateQueries({ queryKey: ["parat-warabandi"] });
      if (!currentId && result?.id) setCurrentId(result.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ParatWarabandi.delete(id),
    onSuccess: () => {
      toast.success("Deleted");
      queryClient.invalidateQueries({ queryKey: ["parat-warabandi"] });
    },
  });

  const handleSave = (status = "draft") => {
    saveMutation.mutate({
      ...formData,
      shareholders: JSON.stringify(shareholders),
      status,
    });
  };

  const handleNew = () => {
    setFormData({ ...EMPTY_DATA });
    setShareholders([emptyRow(1), emptyRow(2), emptyRow(3)]);
    setCurrentId(null);
    setMode("edit");
  };

  const handleOpen = (record) => {
    setCurrentId(record.id);
    setMode("edit");
  };

  const handleBack = () => {
    setMode("list");
    setCurrentId(null);
  };

  const moghaDisplay = [formData.mogha_number, formData.mogha_side].filter(Boolean).join(" / ");

  // LIST MODE
  if (mode === "list") {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
          <div className="max-w-md mx-auto px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link to="/">
                <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-sm font-bold font-heading text-slate-800">Warabandi Parat</h1>
                <p className="text-[9px] text-slate-400 font-mono" style={{ fontFamily: "serif" }}>پرت وارابندی</p>
              </div>
            </div>
            <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" /> New
            </Button>
          </div>
          {/* Tabs */}
          <div className="max-w-md mx-auto px-5 flex gap-1 pb-2">
            <button onClick={() => setActiveTab("list")}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${activeTab === "list" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
              ریکارڈ فہرست
            </button>
            <button onClick={() => setActiveTab("new-parat")}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${activeTab === "new-parat" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
              پرت وارہ بندی (نیا)
            </button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-5">
          {activeTab === "new-parat" ? (
            <WarabandiParatForm />
          ) : isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white rounded-xl border border-slate-200 animate-pulse" />)}
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm mb-4">No records yet.</p>
              <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                <Plus className="w-4 h-4" /> Create First Record
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map(rec => {
                const recMogha = [rec.mogha_number, rec.mogha_side].filter(Boolean).join(" / ");
                return (
                  <button key={rec.id} onClick={() => handleOpen(rec)}
                    className="w-full text-left flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 hover:border-blue-300 hover:shadow-md transition-all shadow-sm group">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${rec.status === "completed" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-amber-50 border border-amber-200 text-amber-700"}`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 truncate">
                        {rec.village_name || "Untitled"} — Mogha {recMogha || "—"}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {[rec.warabandi_type, rec.canal_name, rec.sub_division].filter(Boolean).join(" • ") || "No details"}
                      </p>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium shrink-0 ${rec.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                      {rec.status === "completed" ? "Done" : "Draft"}
                    </span>
                    <Trash2 className="w-4 h-4 text-slate-300 hover:text-red-500 shrink-0"
                      onClick={e => { e.stopPropagation(); deleteMutation.mutate(rec.id); }} />
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </main>

        <BottomNav />
      </div>
    );
  }

  // EDIT / NEW MODE
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
        <div className="max-w-md mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500 hover:text-slate-800" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-sm font-bold font-heading text-slate-800">
                {currentId ? "Edit" : "New"} Parat Warabandi
              </h1>
              <p className="text-[10px] text-slate-400">
                {formData.village_name || "Untitled"} {moghaDisplay ? `— Mogha ${moghaDisplay}` : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={() => handleSave("draft")}
              disabled={saveMutation.isPending}
              className="h-8 text-xs gap-1 border-slate-200 text-slate-600 hover:bg-slate-100">
              <Save className="w-3 h-3" /> Draft
            </Button>
            <Button size="sm" onClick={() => handleSave("completed")}
              disabled={saveMutation.isPending}
              className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Save className="w-3 h-3" /> Complete
            </Button>
            <Button size="sm" onClick={() => setShowPrint(true)}
              className="h-8 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white">
              <Printer className="w-3 h-3" /> Print
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 py-5 space-y-4">
        <WarabandiHeaderBar data={formData} />
        <WarabandiForm data={formData} onChange={setFormData} />
        <ShareholderTable rows={shareholders} onChange={setShareholders} />
        <WarabandiTimeSchedule rows={shareholders} />
      </main>

      {showPrint && (
        <WarabandiPrint data={formData} rows={shareholders} onClose={() => setShowPrint(false)} />
      )}

      <BottomNav />
    </div>
  );
}