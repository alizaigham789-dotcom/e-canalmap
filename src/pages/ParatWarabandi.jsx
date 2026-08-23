import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, FileText, Trash2, Loader2, MapPin } from "lucide-react";
import WarabandiParatForm from "@/components/warabandi/WarabandiParatForm";
import MogaSearchSelect from "@/components/warabandi/MogaSearchSelect";
import BottomNav from "@/components/BottomNav";

const EMPTY_HEADER = {
  mogha_number: "", mogha_side: "R", rajbaha: "",
  mouza: "", section: "", sub_division: "", canal_division: "", map_id: "",
  doc_type: "پرت وارہ بندی",
};

export default function ParatWarabandi() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState("list");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [newHeader, setNewHeader] = useState({ ...EMPTY_HEADER });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["parat-records"],
    queryFn: () => base44.entities.ParatWarabandiRecord.list("-updated_date", 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ParatWarabandiRecord.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["parat-records"] });
      setShowCreate(false);
      setNewHeader({ ...EMPTY_HEADER });
      setSelectedRecord(created);
      setMode("edit");
      toast.success("پرت وارابندی بن گیا");
    },
    onError: () => toast.error("محفوظ نہیں ہوا"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ParatWarabandiRecord.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parat-records"] });
      setDeleteTarget(null);
      toast.success("حذف ہو گیا");
    },
  });

  const handleMogaSelect = (map) => {
    if (!map) return;
    if (map._sideOnly) { setNewHeader(prev => ({ ...prev, mogha_side: map.mogha_side })); return; }
    setNewHeader(prev => ({
      ...prev,
      mogha_number: String(map.moga_number || ""),
      mogha_side: map.mogha_side || prev.mogha_side,
      rajbaha: map.rajbah || "",
      mouza: map.village || "",
      section: map.section || "",
      sub_division: map.tehsil || "",
      canal_division: map.district || "",
      map_id: map.id || "",
    }));
  };

  const handleCreate = () => {
    if (!newHeader.mogha_number) { toast.error("موگہ نمبری درج کریں"); return; }
    const { doc_type, ...headerFields } = newHeader;
    const data_json = JSON.stringify({ header: headerFields });
    createMutation.mutate({
      mogha_number: newHeader.mogha_number,
      mogha_side: newHeader.mogha_side,
      mouza: newHeader.mouza,
      doc_type,
      data_json,
      status: "draft",
    });
  };

  const handleOpen = (rec) => {
    setSelectedRecord(rec);
    setMode("edit");
  };

  const handleBack = () => {
    setMode("list");
    setSelectedRecord(null);
  };

  // LIST MODE
  if (mode === "list") {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
          <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
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
            <Button onClick={() => setShowCreate(true)} size="sm" className="bg-blue-600 hover:bg-blue-500 text-white gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" /> New
            </Button>
          </div>
        </header>

        <main className="max-w-md mx-auto px-4 py-5">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white rounded-xl border border-slate-200 animate-pulse" />)}
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm mb-4" style={{ fontFamily: "serif" }}>کوئی پرت وارابندی محفوظ نہیں</p>
              <Button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-500 gap-2">
                <Plus className="w-4 h-4" /> نیا پرت وارابندی
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map(rec => {
                const moghaDisplay = `${rec.mogha_side || "R"}/${rec.mogha_number || ""}`;
                return (
                  <div key={rec.id} className="bg-white border border-slate-200 rounded-xl p-3 hover:border-blue-300 hover:shadow-md transition-all shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-slate-800 truncate" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>پرت وارابندی</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span className="text-xs text-slate-500 truncate" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
                            موگہ {moghaDisplay}{rec.mouza ? ` · ${rec.mouza}` : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full border font-medium bg-slate-100 text-slate-600 border-slate-300" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
                            {rec.doc_type || "پرت وارہ بندی"}
                          </span>
                          <span className="text-[10px] text-slate-400" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>{rec.status === "completed" ? "مکمل" : "ڈرافٹ"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2.5">
                      <button onClick={() => handleOpen(rec)} className="flex-1 py-1.5 text-[10px] font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
                        پرت کھولیں
                      </button>
                      <button onClick={() => setDeleteTarget(rec)} className="px-2.5 py-1.5 text-[10px] font-semibold rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors" title="حذف کریں">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Create Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading text-lg" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>نیا پرت وارابندی</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2" dir="rtl">
              <div>
                <label className="text-xs text-slate-500 mb-1 block" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>موگہ نمبری</label>
                <MogaSearchSelect
                  value={newHeader.mogha_number}
                  sideValue={newHeader.mogha_side}
                  onSelect={handleMogaSelect}
                  onTextChange={(val) => setNewHeader(prev => ({ ...prev, mogha_number: val }))}
                />
              </div>
              {[
                { key: "rajbaha", label: "راجباہ", placeholder: "پیلو مائنر" },
                { key: "mouza", label: "موضع", placeholder: "روڈہ" },
                { key: "section", label: "سیکشن", placeholder: "گنجیال" },
                { key: "sub_division", label: "سب ڈویژن", placeholder: "قائد آباد" },
                { key: "canal_division", label: "کینال ڈویژن", placeholder: "خوشاب" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-slate-500 mb-1 block" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>{f.label}</label>
                  <input value={newHeader[f.key]} onChange={e => setNewHeader(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} dir="rtl"
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:border-blue-500"
                    style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }} />
                </div>
              ))}
              <div>
                <label className="text-xs text-slate-500 mb-1 block" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>قسم</label>
                <select value={newHeader.doc_type} onChange={e => setNewHeader(p => ({ ...p, doc_type: e.target.value }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:border-blue-500"
                  style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
                  <option value="پرت وارہ بندی">پرت وارہ بندی</option>
                  <option value="کیس ترمیم وارہ بندی">کیس ترمیم وارہ بندی</option>
                </select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-slate-500">منسوخ</Button>
              <Button onClick={handleCreate} disabled={!newHeader.mogha_number || createMutation.isPending}
                className="bg-blue-600 hover:bg-blue-500 gap-2">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} بنائیں اور کھولیں
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-heading text-base text-red-600" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>پرت وارابندی حذف کریں؟</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-600 py-2" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
              کیا آپ واقعی موگہ {deleteTarget?.mogha_side}/{deleteTarget?.mogha_number} کا پرت وارابندی حذف کرنا چاہتے ہیں؟
            </p>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="text-slate-500">منسوخ</Button>
              <Button onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-500 gap-2">
                <Trash2 className="w-4 h-4" /> حذف کریں
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <BottomNav />
      </div>
    );
  }

  // EDIT MODE
  const moghaDisplay = selectedRecord ? `${selectedRecord.mogha_side || "R"}/${selectedRecord.mogha_number || ""}` : "";
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500 hover:text-slate-800 shrink-0" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold font-heading text-slate-800 truncate" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
                پرت وارابندی — موگہ {moghaDisplay}
              </h1>
              <p className="text-[10px] text-slate-400 truncate" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
                {selectedRecord?.doc_type || "پرت وارہ بندی"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5">
        {selectedRecord && <WarabandiParatForm record={selectedRecord} />}
      </main>

      <BottomNav />
    </div>
  );
}