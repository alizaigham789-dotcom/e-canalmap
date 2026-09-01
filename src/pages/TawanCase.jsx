import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import FardMasroobaForm from "@/components/tawan/FardMasroobaForm";

export default function TawanCase() {
  const [view, setView] = useState("list");
  const [records, setRecords] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setRecords(await base44.entities.FardMasrooba.list("-created_date", 50)); }
    catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const newRecord = () => { setCurrent(null); setView("edit"); };
  const openRecord = (r) => { setCurrent(r); setView("edit"); };

  const handleSave = async (rec) => {
    try {
      if (current?.id) await base44.entities.FardMasrooba.update(current.id, rec);
      else await base44.entities.FardMasrooba.create(rec);
      await load();
      setView("list");
    } catch (e) {
      console.error(e);
      alert("محفوظ نہیں ہوا: " + (e?.message || e));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this record?")) return;
    try { await base44.entities.FardMasrooba.delete(id); await load(); } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
          <Link to="/">
            <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-sm font-bold font-heading text-slate-800">Tawan Case · Fard Masrooba</h1>
            <p className="text-[9px] text-slate-400 font-mono uppercase tracking-widest">فرد مسروبہ — ناجائز آبپاشی</p>
          </div>
          {view === "list" ? (
            <Button onClick={newRecord} size="sm" className="ml-auto gap-1 text-xs"><Plus className="w-3.5 h-3.5" /> نیا</Button>
          ) : (
            <Button onClick={() => setView("list")} size="sm" variant="outline" className="ml-auto text-xs">فہرست</Button>
          )}
        </div>
      </header>

      {view === "list" ? (
        <main className="max-w-4xl mx-auto px-4 py-5">
          {loading ? (
            <p className="text-center text-slate-400 text-sm py-10">Loading…</p>
          ) : records.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-slate-500 mb-3">کوئی ریکارڈ نہیں۔</p>
              <Button onClick={newRecord} size="sm" className="gap-1 text-xs"><Plus className="w-3.5 h-3.5" /> نیا فرد مسروبہ</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {records.map(r => (
                <div key={r.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">موگہ نمبری {r.mogha_number || "—"} · موضع {r.village || "—"}</p>
                    <p className="text-[11px] text-slate-400">راجباہ {r.rajbah || "—"} · آبیانہ {r.total_abiana || 0}/-</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button onClick={() => openRecord(r)} size="icon" variant="ghost" className="w-8 h-8 text-slate-500"><Pencil className="w-4 h-4" /></Button>
                    <Button onClick={() => handleDelete(r.id)} size="icon" variant="ghost" className="w-8 h-8 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      ) : (
        <FardMasroobaForm initial={current} onSave={handleSave} />
      )}
    </div>
  );
}