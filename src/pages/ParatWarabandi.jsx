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
  const [activeTab, setActiveTab] = useState("parat-jadeed"); // "parat-jadeed" | "tarmeem"
  const [formData, setFormData] = useState({ ...EMPTY_DATA });
  const [shareholders, setShareholders] = useState([emptyRow(1), emptyRow(2), emptyRow(3)]);
  const [showPrint, setShowPrint] = useState(false);
  const [currentId, setCurrentId] = useState(editId || null);

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
            <button onClick={() => setActiveTab("parat-jadeed")}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${activeTab === "parat-jadeed" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
              پرت وارابندی جدید
            </button>
            <button onClick={() => setActiveTab("tarmeem")}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${activeTab === "tarmeem" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
              ترمیم وارہ بندی
            </button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-5">
          {activeTab === "parat-jadeed" ? (
            <WarabandiParatForm key="jadeed" defaultDocType="پرت وارہ بندی" />
          ) : (
            <WarabandiParatForm key="tarmeem" defaultDocType="کیس ترمیم وارہ بندی" />
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
        <div className="max-w-md mx-auto px-4 sm:px-5 py-3 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500 hover:text-slate-800 shrink-0" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-sm font-bold font-heading text-slate-800 truncate">
                  {currentId ? "Edit" : "New"} Parat Warabandi
                </h1>
                <p className="text-[10px] text-slate-400 truncate">
                  {formData.village_name || "Untitled"} {moghaDisplay ? `— Mogha ${moghaDisplay}` : ""}
                </p>
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
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