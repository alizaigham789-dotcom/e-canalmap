import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, FileText, Trash2, Loader2, MapPin, Pencil, Check, AlertTriangle, Printer, Search } from "lucide-react";
import WarabandiParatForm from "@/components/warabandi/WarabandiParatForm";
import MogaSearchSelect from "@/components/warabandi/MogaSearchSelect";
import BottomNav from "@/components/BottomNav";
import BatchPrintModal from "@/components/warabandi/BatchPrintModal";
import { loadDrawingData } from "@/lib/drawingDataStorage";

const EMPTY_HEADER = {
  mogha_number: "", mogha_side: "R", rajbaha: "",
  mouza: "", section: "", sub_division: "", canal_division: "", map_id: "",
  doc_type: "پرت وارہ بندی", cca: "",
};

function parseHeader(rec) {
  try { return JSON.parse(rec.data_json || "{}").header || {}; } catch { return {}; }
}

// میپ کی chakbandi آبجیکٹس سے CCA خود بخود نکالیں (مoga منتخب کرتے وقت)
async function extractCCAFromMap(map) {
  if (!map?.drawing_data) return "";
  try {
    const objects = await loadDrawingData(map.drawing_data);
    if (!Array.isArray(objects)) return "";
    let total = 0, found = false;
    for (const o of objects) {
      if (o.type === "chakbandi" && o.cca != null && o.cca !== "") {
        const n = parseFloat(o.cca);
        if (!isNaN(n)) { total += n; found = true; }
      }
    }
    return found ? String(Math.round(total)) : "";
  } catch { return ""; }
}

export default function ParatWarabandi() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState("list");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [newHeader, setNewHeader] = useState({ ...EMPTY_HEADER });
  const [editTarget, setEditTarget] = useState(null);
  const [editHeader, setEditHeader] = useState({ ...EMPTY_HEADER });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBatchPrint, setShowBatchPrint] = useState(false);
  const [batchRecords, setBatchRecords] = useState([]);
  const [search, setSearch] = useState("");

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["parat-records"],
    queryFn: () => base44.entities.ParatWarabandiRecord.list("-updated_date", 50),
  });

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((rec) => {
      const hdr = parseHeader(rec);
      const hay = `${rec.mogha_number || ""} ${rec.mouza || hdr.mouza || ""} ${hdr.rajbaha || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [records, search]);

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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ParatWarabandiRecord.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parat-records"] });
      setEditTarget(null);
      toast.success("ہیڈر اپڈیٹ ہو گیا");
    },
    onError: () => toast.error("اپڈیٹ نہیں ہوا"),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) await base44.entities.ParatWarabandiRecord.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parat-records"] });
      setSelectedIds(new Set());
      toast.success("منتخب پرت حذف ہو گئے");
    },
    onError: () => toast.error("حذف نہیں ہوئے"),
  });

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleEditOpen = (rec) => {
    let data = {};
    try { data = JSON.parse(rec.data_json || "{}"); } catch {}
    const h = data.header || {};
    setEditHeader({
      mogha_number: rec.mogha_number || h.mogha_number || "",
      mogha_side: rec.mogha_side || h.mogha_side || "R",
      rajbaha: h.rajbaha || "",
      mouza: rec.mouza || h.mouza || "",
      section: h.section || "",
      sub_division: h.sub_division || "",
      canal_division: h.canal_division || "",
      map_id: h.map_id || "",
      doc_type: rec.doc_type || "پرت وارہ بندی",
      cca: data.cca || "",
    });
    setEditTarget(rec);
  };

  const handleEditSelect = (map) => {
    if (!map) return;
    if (map._sideOnly) { setEditHeader(prev => ({ ...prev, mogha_side: map.mogha_side })); return; }
    setEditHeader(prev => ({
      ...prev,
      mogha_number: String(map.moga_number || ""),
      mogha_side: map.mogha_side || prev.mogha_side,
      rajbaha: map.rajbah || "",
      mouza: map.village || "",
      section: map.zilladar_section || map.section || "",
      sub_division: map.tehsil || "",
      canal_division: map.district || "",
      map_id: map.id || "",
    }));
    extractCCAFromMap(map).then(cca => { setEditHeader(prev => ({ ...prev, cca })); });
  };

  const handleEditSave = () => {
    if (!editHeader.mogha_number) { toast.error("موگہ نمبری درج کریں"); return; }
    const { doc_type, cca, ...headerFields } = editHeader;
    let existing = {};
    try { existing = JSON.parse(editTarget.data_json || "{}"); } catch {}
    const data_json = JSON.stringify({ ...existing, header: headerFields, cca });
    updateMutation.mutate({
      id: editTarget.id,
      data: {
        mogha_number: editHeader.mogha_number,
        mogha_side: editHeader.mogha_side,
        mouza: editHeader.mouza,
        doc_type,
        data_json,
      },
    });
  };

  const handleMogaSelect = (map) => {
    if (!map) return;
    if (map._sideOnly) { setNewHeader(prev => ({ ...prev, mogha_side: map.mogha_side })); return; }
    setNewHeader(prev => ({
      ...prev,
      mogha_number: String(map.moga_number || ""),
      mogha_side: map.mogha_side || prev.mogha_side,
      rajbaha: map.rajbah || "",
      mouza: map.village || "",
      section: map.zilladar_section || map.section || "",
      sub_division: map.tehsil || "",
      canal_division: map.district || "",
      map_id: map.id || "",
    }));
    extractCCAFromMap(map).then(cca => { if (cca) setNewHeader(prev => ({ ...prev, cca })); });
  };

  const handleCreate = () => {
    if (!newHeader.mogha_number) { toast.error("موگہ نمبری درج کریں"); return; }
    const { doc_type, cca, ...headerFields } = newHeader;
    const data_json = JSON.stringify({ header: headerFields, cca });
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
          <div className="mb-3 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="موگہ نمبر، موضع یا راجباہ تلاش کریں"
              dir="rtl"
              className="w-full h-10 pr-9 pl-3 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:border-blue-400 shadow-sm"
              style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}
            />
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3">
              <span className="text-xs text-blue-700 font-medium">{selectedIds.size} پرت منتخب</span>
              <div className="flex gap-1.5 items-center">
                <Button size="sm" variant="ghost" className="text-xs h-7 text-slate-500" onClick={() => {
                  if (selectedIds.size === filteredRecords.length) setSelectedIds(new Set());
                  else setSelectedIds(new Set(filteredRecords.map(r => r.id)));
                }}>
                  {selectedIds.size === filteredRecords.length ? "غیر منتخب" : "سب منتخب کریں"}
                </Button>
                <Button size="sm" variant="ghost" className="text-xs h-7 text-blue-700 hover:bg-blue-100 gap-1 font-semibold" onClick={() => { setBatchRecords(records.filter(r => selectedIds.has(r.id))); setShowBatchPrint(true); }}>
                  <Printer className="w-3 h-3" /> PDF & Print
                </Button>
                <Button size="sm" variant="ghost" className="text-xs h-7 text-red-600 hover:bg-red-50 gap-1" onClick={() => bulkDeleteMutation.mutate([...selectedIds])} disabled={bulkDeleteMutation.isPending}>
                  {bulkDeleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} حذف
                </Button>
                <Button size="sm" variant="ghost" className="text-xs h-7 text-slate-500" onClick={() => setSelectedIds(new Set())}>
                  منسوخ
                </Button>
              </div>
            </div>
          )}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white rounded-xl border border-slate-200 animate-pulse" />)}
            </div>
          ) : filteredRecords.length === 0 ? (
            search ? (
              <div className="text-center py-16">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm mb-4" style={{ fontFamily: "serif" }}>تلاش کے مطابق کوئی پرت نہیں ملی</p>
                <Button onClick={() => setSearch("")} variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" /> تلاش صاف کریں
                </Button>
              </div>
            ) : (
              <div className="text-center py-16">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm mb-4" style={{ fontFamily: "serif" }}>کوئی پرت وارابندی محفوظ نہیں</p>
                <Button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-500 gap-2">
                  <Plus className="w-4 h-4" /> نیا پرت وارابندی
                </Button>
              </div>
            )
          ) : (
            <div className="space-y-3">
              {filteredRecords.map(rec => {
                const moghaDisplay = `${rec.mogha_number || ""}/${rec.mogha_side || "R"}`;
                const hdr = parseHeader(rec);
                return (
                  <div key={rec.id} className={`bg-white border rounded-xl p-3 hover:border-blue-300 hover:shadow-md transition-all shadow-sm ${selectedIds.has(rec.id) ? "border-blue-500 ring-2 ring-blue-200" : "border-slate-200"}`}>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleSelect(rec.id)}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${selectedIds.has(rec.id) ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300 hover:border-blue-400"}`}
                        title="منتخب کریں"
                      >
                        {selectedIds.has(rec.id) && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-base font-bold text-blue-700 font-mono tracking-tight leading-none" dir="ltr">{moghaDisplay}</span>
                          <span className="text-[9px] px-2 py-0.5 rounded-full border font-medium bg-slate-100 text-slate-600 border-slate-300 shrink-0" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
                            {rec.doc_type || "پرت وارہ بندی"}
                          </span>
                        </div>
                        <div className="mt-1 flex items-start justify-between gap-2">
                          <div className="text-[13px] font-semibold text-slate-700 truncate" dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
                            موضع {hdr.mouza || rec.mouza || "—"}
                          </div>
                          <div className="text-[12px] text-slate-600 truncate text-right" dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
                            {hdr.rajbaha || "—"}
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${rec.status === "completed" ? "bg-emerald-500" : "bg-amber-400"}`}></span>
                          <span className="text-[10px] text-slate-400" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>{rec.status === "completed" ? "مکمل" : "ڈرافٹ"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2.5">
                      <button onClick={() => handleOpen(rec)} className="flex-1 py-1.5 text-[10px] font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
                        پرت کھولیں
                      </button>
                      <button onClick={() => handleEditOpen(rec)} className="px-2.5 py-1.5 text-[10px] font-semibold rounded-lg bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors" title="ہیڈر ایڈٹ کریں">
                        <Pencil className="w-3.5 h-3.5" />
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
              کیا آپ واقعی موگہ {deleteTarget?.mogha_number}/{deleteTarget?.mogha_side} کا پرت وارابندی حذف کرنا چاہتے ہیں؟
            </p>
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2" dir="rtl">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 font-semibold leading-relaxed" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
                خبردار: یہ پرت اور اس کا تمام ڈیٹا (قطاراں، نوٹس، حساب) مستقل طور پر حذف ہو جائے گا۔ یہ واپس نہیں ہوگا۔
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="text-slate-500">منسوخ</Button>
              <Button onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-500 gap-2">
                <Trash2 className="w-4 h-4" /> حذف کریں
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Header Dialog */}
        <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
          <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading text-lg" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>ہیڈر ایڈٹ کریں</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2" dir="rtl">
              <div>
                <label className="text-xs text-slate-500 mb-1 block" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>موگہ نمبری</label>
                <MogaSearchSelect
                  value={editHeader.mogha_number}
                  sideValue={editHeader.mogha_side}
                  onSelect={handleEditSelect}
                  onTextChange={(val) => setEditHeader(prev => ({ ...prev, mogha_number: val }))}
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
                  <input value={editHeader[f.key]} onChange={e => setEditHeader(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} dir="rtl"
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:border-blue-500"
                    style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }} />
                </div>
              ))}
              <div>
                <label className="text-xs text-slate-500 mb-1 block" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>قسم</label>
                <select value={editHeader.doc_type} onChange={e => setEditHeader(p => ({ ...p, doc_type: e.target.value }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:border-blue-500"
                  style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
                  <option value="پرت وارہ بندی">پرت وارہ بندی</option>
                  <option value="کیس ترمیم وارہ بندی">کیس ترمیم وارہ بندی</option>
                </select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setEditTarget(null)} className="text-slate-500">منسوخ</Button>
              <Button onClick={handleEditSave} disabled={!editHeader.mogha_number || updateMutation.isPending}
                className="bg-blue-600 hover:bg-blue-500 gap-2">
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />} محفوظ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <BatchPrintModal open={showBatchPrint} records={batchRecords} onClose={() => setShowBatchPrint(false)} />

        <BottomNav />
      </div>
    );
  }

  // EDIT MODE
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2">
          <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500 hover:text-slate-800 shrink-0" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-sm font-bold text-slate-800 leading-relaxed" dir="rtl"
            style={{ fontFamily: "'Times New Roman', 'Noto Nastaliq Urdu', serif", lineHeight: 1.7 }}>
            <span style={{ unicodeBidi: "isolate" }}>{selectedRecord?.doc_type || "پرت وارابندی"}،</span>
            <span style={{ margin: "0 4px" }} />
            <span style={{ unicodeBidi: "isolate" }}>موگہ نمبر</span>
            <span style={{ margin: "0 4px" }} />
            <span style={{ unicodeBidi: "isolate" }}>{selectedRecord?.mogha_number || ""}</span>
          </h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5">
        {selectedRecord && <WarabandiParatForm record={selectedRecord} />}
      </main>

      <BottomNav />
    </div>
  );
}