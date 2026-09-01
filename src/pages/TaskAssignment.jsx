import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Trash2, Search, Calendar, User, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { DIVISIONS, SUBDIVISIONS, sectionsFor } from "@/lib/jurisdiction";

const URDU = "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif";

const EMPTY = {
  division: "Khushab",
  subdivision: "",
  section: "",
  mouza: "",
  officer_role: "zilladar",
  officer_name: "",
  title: "",
  description: "",
  due_date: "",
};

export default function TaskAssignment() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY });
  const [search, setSearch] = useState("");

  const { data: currentUser } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["task-assignments"],
    queryFn: () => base44.entities.TaskAssignment.list("-created_date", 100),
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.TaskAssignment.create({ ...data, status: "pending", assigned_by_name: currentUser?.full_name || "" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["task-assignments"] }); setForm({ ...EMPTY }); toast.success("آفیسر کو ٹاسک مقرر ہو گیا"); },
    onError: () => toast.error("محفوظ نہیں ہوا"),
  });
  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.TaskAssignment.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["task-assignments"] }); toast.success("حذف ہو گیا"); },
    onError: () => toast.error("حذف نہیں ہوا"),
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Cascade: when subdivision changes, reset section
  const onSubdivision = (v) => setForm((p) => ({ ...p, subdivision: v, section: "" }));

  const submit = () => {
    if (!form.subdivision || !form.section || !form.title || !form.officer_name) {
      toast.error("تقسیم، سیکشن، ٹاسک اور افسر کا نام ضروری ہے");
      return;
    }
    createMut.mutate(form);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => `${t.title || ""} ${t.officer_name || ""} ${t.section || ""} ${t.mouza || ""} ${t.subdivision || ""}`.toLowerCase().includes(q));
  }, [tasks, search]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-2">
          <button onClick={() => navigate("/deputy-collector")} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-100">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm font-bold font-heading text-slate-800">Task Assignment</h1>
            <p className="text-[10px] text-slate-400" style={{ fontFamily: URDU }}>آفیسر کو ٹاسک مقرر کریں</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-5 space-y-5">
        {/* Assignment form */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-500" /> علاقہ منتخب کریں</p>

          {/* Division */}
          <div>
            <Label className="text-[11px] text-slate-500">Division (ڈویژن)</Label>
            <Select value={form.division} onValueChange={(v) => setForm((p) => ({ ...p, division: v, subdivision: "", section: "" }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* Subdivision */}
          <div>
            <Label className="text-[11px] text-slate-500">Sub Division (سب ڈویژن)</Label>
            <Select value={form.subdivision} onValueChange={onSubdivision}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="منتخب کریں" /></SelectTrigger>
              <SelectContent>
                {(SUBDIVISIONS[form.division] || []).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Section — cascading */}
          <div>
            <Label className="text-[11px] text-slate-500">Section (ضلعداری سیکشن)</Label>
            <Select value={form.section} onValueChange={(v) => set("section", v)} disabled={!form.subdivision}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={form.subdivision ? "منتخب کریں" : "پہلے سب ڈویژن"} /></SelectTrigger>
              <SelectContent>
                {sectionsFor(form.subdivision).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Mouza */}
          <div>
            <Label className="text-[11px] text-slate-500">Mouza (موضع)</Label>
            <Input value={form.mouza} onChange={(e) => set("mouza", e.target.value)} dir="auto" placeholder="موضع کا نام" className="h-9 text-sm" style={{ fontFamily: URDU }} />
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-3">
            <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-emerald-500" /> افسر اور ٹاسک</p>

            {/* Officer role */}
            <div className="grid grid-cols-2 gap-2">
              {[{ v: "zilladar", l: "Zilladar" }, { v: "patwari", l: "Patwari" }].map((o) => (
                <button key={o.v} onClick={() => set("officer_role", o.v)}
                  className={`h-9 rounded-lg text-sm font-medium border transition ${form.officer_role === o.v ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"}`}>
                  {o.l}
                </button>
              ))}
            </div>

            {/* Officer name */}
            <div>
              <Label className="text-[11px] text-slate-500">Officer Name (افسر کا نام)</Label>
              <Input value={form.officer_name} onChange={(e) => set("officer_name", e.target.value)} dir="auto" placeholder="نام" className="h-9 text-sm" style={{ fontFamily: URDU }} />
            </div>

            {/* Title */}
            <div>
              <Label className="text-[11px] text-slate-500">Task / Application (ٹاسک یا دستاویز)</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} dir="auto" placeholder="موضوع" className="h-9 text-sm" style={{ fontFamily: URDU }} />
            </div>

            {/* Description */}
            <div>
              <Label className="text-[11px] text-slate-500">Description (تفصیل)</Label>
              <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} dir="auto" rows={2} placeholder="تفصیل یا دستاویز حوالہ" className="text-sm" style={{ fontFamily: URDU }} />
            </div>

            {/* Due date */}
            <div>
              <Label className="text-[11px] text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> Date (تاریخ)</Label>
              <Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} className="h-9 text-sm" />
            </div>

            <Button onClick={submit} disabled={createMut.isPending} className="w-full gap-1.5">
              <Send className="w-4 h-4" /> {createMut.isPending ? "بھیجا جا رہا ہے…" : "آفیسر کو مقرر کریں"}
            </Button>
          </div>
        </div>

        {/* Assigned tasks list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-600">مقرر کردہ ٹاسکس</p>
            <div className="relative w-40">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="تلاش" className="h-8 text-xs pl-7" dir="rtl" />
            </div>
          </div>
          {isLoading ? (
            <p className="text-center text-slate-400 text-sm py-6">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-6" style={{ fontFamily: URDU }}>کوئی ٹاسک مقرر نہیں</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((t) => (
                <div key={t.id} className="bg-white rounded-xl ring-1 ring-slate-200/70 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{t.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5" style={{ fontFamily: URDU }}>
                        {t.officer_role === "zilladar" ? "ضلعدار" : "پٹواری"}: {t.officer_name}
                      </p>
                    </div>
                    <button onClick={() => { if (confirm("حذف کریں؟")) deleteMut.mutate(t.id); }} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2 text-[10px] text-slate-500">
                    <span className="bg-slate-100 rounded px-1.5 py-0.5">{t.division}</span>
                    <span className="bg-slate-100 rounded px-1.5 py-0.5">{t.subdivision}</span>
                    <span className="bg-slate-100 rounded px-1.5 py-0.5">{t.section}</span>
                    {t.mouza && <span className="bg-slate-100 rounded px-1.5 py-0.5" style={{ fontFamily: URDU }}>{t.mouza}</span>}
                    {t.due_date && <span className="bg-amber-50 text-amber-700 rounded px-1.5 py-0.5">{t.due_date}</span>}
                    <span className={`rounded px-1.5 py-0.5 ${t.status === "pending" ? "bg-blue-50 text-blue-600" : t.status === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>{t.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}