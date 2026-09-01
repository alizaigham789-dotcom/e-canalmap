import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, Printer, Search, FileText } from "lucide-react";
import FardHeaderDialog from "@/components/tawan/FardHeaderDialog";
import FardMasroobaForm from "@/components/tawan/FardMasroobaForm";
import { printFardRecord } from "@/lib/fardPrint";

const URDU = "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif";

// Document-type folders inside Tawan Case. More document types can be added here later.
const DOC_TYPES = [
  { key: "fard-masrooba", name: "Fard Masrooba", urdu: "فرد مسروبہ", icon: FileText, color: "from-rose-500 to-red-500" },
];

export default function TawanCase() {
  const queryClient = useQueryClient();
  const [screen, setScreen] = useState("hub"); // hub | list | edit
  const [activeDoc, setActiveDoc] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editRec, setEditRec] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["fard-masrooba-records"],
    queryFn: () => base44.entities.FardMasrooba.list("-created_date", 100),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => `${r.mogha_number || ""} ${r.village || ""} ${r.rajbah || ""}`.toLowerCase().includes(q));
  }, [records, search]);

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.FardMasrooba.create({ ...data, rows_json: "[]", total_abiana: 0, total_area: 0, status: "draft" }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["fard-masrooba-records"] });
      setShowCreate(false);
      setEditRec(created);
      setScreen("edit");
      toast.success("فرد مسروبہ بن گیا");
    },
    onError: () => toast.error("محفوظ نہیں ہوا"),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FardMasrooba.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["fard-masrooba-records"] }); toast.success("محفوظ ہو گیا"); },
    onError: () => toast.error("محفوظ نہیں ہوا"),
  });
  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.FardMasrooba.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["fard-masrooba-records"] }); toast.success("حذف ہو گیا"); },
    onError: () => toast.error("حذف نہیں ہوا"),
  });

  const toggleSel = (id) => setSelectedIds((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSel = filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id));
  const toggleAll = () => setSelectedIds(allSel ? new Set() : new Set(filtered.map((r) => r.id)));
  const bulkDelete = async () => {
    if (!confirm("منتخب ریکارڈ حذف کریں؟")) return;
    for (const id of selectedIds) await deleteMut.mutateAsync(id);
    setSelectedIds(new Set());
  };

  const openDoc = (key) => { setActiveDoc(key); setScreen("list"); setSearch(""); setSelectedIds(new Set()); };
  const goBack = () => { setScreen((s) => (s === "edit" ? "list" : "hub")); setEditRec(null); };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
          {screen === "hub" ? (
            <Link to="/"><Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500"><ArrowLeft className="w-4 h-4" /></Button></Link>
          ) : (
            <Button onClick={goBack} variant="ghost" size="icon" className="w-8 h-8 text-slate-500"><ArrowLeft className="w-4 h-4" /></Button>
          )}
          <div>
            <h1 className="text-sm font-bold font-heading text-slate-800">Tawan Case Documents</h1>
            <p className="text-[9px] text-slate-400 font-mono uppercase tracking-widest">
              {screen === "hub" ? "تاوان کیس دستاویزات" : activeDoc === "fard-masrooba" ? "فرد مسروبہ" : ""}
            </p>
          </div>
          {screen === "list" && activeDoc === "fard-masrooba" && (
            <Button onClick={() => setShowCreate(true)} size="sm" className="ml-auto gap-1 text-xs"><Plus className="w-3.5 h-3.5" /> نیا</Button>
          )}
        </div>
      </header>

      {screen === "hub" && (
        <main className="max-w-4xl mx-auto px-4 py-6">
          <p className="text-xs text-slate-500 mb-3" style={{ fontFamily: URDU }}>تاوان کیس کی دستاویزات منتخب کریں</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {DOC_TYPES.map((d) => (
              <button key={d.key} onClick={() => openDoc(d.key)} className="flex flex-col items-center gap-2 bg-white border border-slate-200 rounded-xl p-4 hover:border-rose-300 hover:shadow-md transition">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${d.color} flex items-center justify-center shadow`}><d.icon className="w-6 h-6 text-white" /></div>
                <span className="text-sm font-bold text-slate-800">{d.name}</span>
                <span className="text-[11px] text-slate-500" style={{ fontFamily: URDU }}>{d.urdu}</span>
              </button>
            ))}
          </div>
        </main>
      )}

      {screen === "list" && activeDoc === "fard-masrooba" && (
        <main className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="relative flex-1 min-w-[140px] max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="موگہ / موضع تلاش کریں" className="h-8 text-xs pl-7" dir="rtl" />
            </div>
            <Button onClick={toggleAll} variant="outline" size="sm" className="text-xs">{allSel ? "سب ہٹا" : "سب منتخب"}</Button>
            {selectedIds.size > 0 && <Button onClick={bulkDelete} variant="outline" size="sm" className="text-xs text-red-500 gap-1"><Trash2 className="w-3.5 h-3.5" /> حذف</Button>}
          </div>
          {isLoading ? (
            <p className="text-center text-slate-400 text-sm py-10">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-10" style={{ fontFamily: URDU }}>کوئی ریکارڈ نہیں۔ "نیا" دبائیں</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => (
                <div key={r.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2.5">
                  <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSel(r.id)} className="w-4 h-4" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">موگہ نمبری {r.mogha_number || "—"} · موضع {r.village || "—"}</p>
                    <p className="text-[11px] text-slate-400">راجباہ {r.rajbah || "—"} · آبیانہ {r.total_abiana || 0}/-</p>
                  </div>
                  <Button onClick={() => { setEditRec(r); setScreen("edit"); }} size="icon" variant="ghost" className="w-8 h-8 text-slate-500"><Pencil className="w-4 h-4" /></Button>
                  <Button onClick={() => printFardRecord(r)} size="icon" variant="ghost" className="w-8 h-8 text-slate-500"><Printer className="w-4 h-4" /></Button>
                  <Button onClick={() => { if (confirm("حذف کریں؟")) deleteMut.mutate(r.id); }} size="icon" variant="ghost" className="w-8 h-8 text-red-400"><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {screen === "edit" && editRec && (
        <FardMasroobaForm
          record={editRec}
          onSave={(payload) => updateMut.mutate({ id: editRec.id, data: payload })}
          onBack={() => { setScreen("list"); setEditRec(null); }}
        />
      )}

      <FardHeaderDialog open={showCreate} onClose={() => setShowCreate(false)} onCreate={(h) => createMut.mutate(h)} />
    </div>
  );
}