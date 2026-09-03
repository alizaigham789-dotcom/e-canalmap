import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Paperclip, Camera, FileText, Send, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";

const URDU = "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif";

const STATUS_FLOW = {
  zilladar: [
    { v: "in_progress", label: "کام شروع", en: "Start Work" },
    { v: "review", label: "جائزہ کے لیے", en: "Send to Review" },
    { v: "forwarded", label: "پٹواری کو بھیجیں", en: "Forward to Patwari" },
    { v: "completed", label: "مکمل — DC کو", en: "Complete → DC" },
  ],
  patwari: [
    { v: "in_progress", label: "کام شروع", en: "Start Work" },
    { v: "review", label: "ضلعدار کو بھیجیں", en: "Send to Zilladar" },
    { v: "completed", label: "مکمل", en: "Completed" },
  ],
};

const STATUS_META = {
  pending: { label: "Pending", urdu: "زیرِ التواء", color: "bg-blue-50 text-blue-600" },
  in_progress: { label: "In Progress", urdu: "جاری", color: "bg-amber-50 text-amber-600" },
  review: { label: "Under Review", urdu: "جائزہ", color: "bg-purple-50 text-purple-600" },
  forwarded: { label: "Forwarded", urdu: "متعین", color: "bg-cyan-50 text-cyan-600" },
  approved: { label: "Approved", urdu: "منظور", color: "bg-emerald-50 text-emerald-600" },
  completed: { label: "Completed", urdu: "مکمل", color: "bg-emerald-50 text-emerald-600" },
  rejected: { label: "Rejected", urdu: "مسترد", color: "bg-red-50 text-red-600" },
};

export default function MyTasks() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ status: "", remarks: "", file_url: "", photo_url: "" });

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["task-assignments"],
    queryFn: () => base44.entities.TaskAssignment.list("-created_date", 200),
  });

  const uploadFile = async (file) => (await base44.integrations.Core.UploadFile({ file })).file_url;

  const updateMut = useMutation({
    mutationFn: ({ id, changes }) => base44.entities.TaskAssignment.update(id, changes),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["task-assignments"] }); setEditing(null); toast.success("اپ ڈیٹ ہو گیا"); },
    onError: () => toast.error("اپ ڈیٹ ناکام"),
  });

  const myRole = me?.role === "zilladar" ? "zilladar" : me?.role === "patwari" ? "patwari" : me?.role === "deputy_collector" ? "zilladar" : null;

  const myTasks = useMemo(() => {
    if (!me) return [];
    return tasks.filter((t) => {
      const nameMatch = me.full_name && t.officer_name && t.officer_name.trim() === me.full_name.trim();
      const roleMatch = myRole && t.officer_role === myRole;
      return nameMatch || roleMatch;
    });
  }, [tasks, me, myRole]);

  const startEdit = (t) => {
    setEditing(t.id);
    setDraft({ status: t.status || "", remarks: t.remarks || "", file_url: t.file_url || "", photo_url: t.photo_url || "" });
  };

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      toast.loading("اپ لوڈ…", { id: "u" });
      const url = await uploadFile(f);
      setDraft((p) => ({ ...p, file_url: url }));
      toast.success("منسلک ہوئی", { id: "u" });
    } catch { toast.error("ناکام", { id: "u" }); }
  };
  const onPhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      toast.loading("اپ لوڈ…", { id: "p" });
      const url = await uploadFile(f);
      setDraft((p) => ({ ...p, photo_url: url }));
      toast.success("منسلک ہوئی", { id: "p" });
    } catch { toast.error("ناکام", { id: "p" }); }
  };

  const saveUpdate = (t) => {
    if (!draft.status) { toast.error("اسٹیٹس منتخب کریں"); return; }
    const changes = { status: draft.status, remarks: draft.remarks };
    if (draft.file_url) changes.file_url = draft.file_url;
    if (draft.photo_url) changes.photo_url = draft.photo_url;
    if (t.officer_role === "zilladar" && draft.status === "forwarded") {
      changes.forwarded_to = "patwari";
      changes.forwarded_by = me?.full_name || "";
    }
    if (t.officer_role === "patwari" && draft.status === "review") {
      changes.forwarded_to = "zilladar";
    }
    updateMut.mutate({ id: t.id, changes });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2">
          <button onClick={() => navigate("/canal-patwari")} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-100">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm font-bold font-heading text-slate-800">My Assigned Tasks</h1>
            <p className="text-[10px] text-slate-400" style={{ fontFamily: URDU }}>میرے مقرر کردہ ٹاسکس</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-5 space-y-3">
        {!myRole && me && (
          <p className="text-center text-sm text-slate-400 py-6" style={{ fontFamily: URDU }}>
            آپ کا کردار zilladar یا patwari نہیں ہے۔
          </p>
        )}
        {isLoading ? (
          <p className="text-center text-slate-400 text-sm py-6">Loading…</p>
        ) : myTasks.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-6" style={{ fontFamily: URDU }}>کوئی ٹاسک مقرر نہیں</p>
        ) : (
          myTasks.map((t) => {
            const sm = STATUS_META[t.status] || STATUS_META.pending;
            const isEditing = editing === t.id;
            const flow = STATUS_FLOW[t.officer_role] || [];
            return (
              <div key={t.id} className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800">{t.title}</p>
                    <p className="text-[10px] text-slate-400" style={{ fontFamily: URDU }}>
                      {t.officer_role === "zilladar" ? "ضلعدار" : "پٹواری"} • {t.section}{t.mouza ? ` • ${t.mouza}` : ""}
                    </p>
                  </div>
                  <span className={`text-[10px] rounded px-1.5 py-0.5 ${sm.color}`} style={{ fontFamily: URDU }}>{sm.urdu}</span>
                </div>
                {t.description && <p className="text-[11px] text-slate-600" style={{ fontFamily: URDU }}>{t.description}</p>}
                {t.assigned_by_name && <p className="text-[10px] text-slate-400" style={{ fontFamily: URDU }}>از: {t.assigned_by_name}</p>}
                {t.due_date && <p className="text-[10px] text-amber-600">Due: {t.due_date}</p>}
                {(t.file_url || t.photo_url) && !isEditing && (
                  <div className="flex gap-2">
                    {t.file_url && <a href={t.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-blue-500"><FileText className="w-3 h-3" /> فائل</a>}
                    {t.photo_url && <a href={t.photo_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-blue-500"><ImageIcon className="w-3 h-3" /> تصویر</a>}
                  </div>
                )}
                {t.remarks && !isEditing && (
                  <div className="bg-amber-50 rounded-lg p-2"><p className="text-[10px] text-amber-700 font-semibold">Remarks:</p><p className="text-[11px] text-slate-600" style={{ fontFamily: URDU }}>{t.remarks}</p></div>
                )}

                {!isEditing ? (
                  <Button onClick={() => startEdit(t)} variant="outline" className="w-full h-8 text-xs">اپ ڈیٹ کریں</Button>
                ) : (
                  <div className="space-y-2 border-t border-slate-100 pt-2">
                    <Select value={draft.status} onValueChange={(v) => setDraft((p) => ({ ...p, status: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="اسٹیٹس" /></SelectTrigger>
                      <SelectContent>
                        {flow.map((s) => <SelectItem key={s.v} value={s.v} style={{ fontFamily: URDU }}>{s.label} ({s.en})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Textarea value={draft.remarks} onChange={(e) => setDraft((p) => ({ ...p, remarks: e.target.value }))} dir="auto" rows={2} placeholder="رائے / تفصیل" style={{ fontFamily: URDU }} className="text-sm" />
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex flex-col items-center justify-center gap-1 h-12 rounded-lg border-2 border-dashed border-slate-200 cursor-pointer">
                        <Paperclip className="w-4 h-4 text-slate-400" /><span className="text-[9px] text-slate-500">فائل</span>
                        <input type="file" className="hidden" onChange={onFile} />
                      </label>
                      <label className="flex flex-col items-center justify-center gap-1 h-12 rounded-lg border-2 border-dashed border-slate-200 cursor-pointer">
                        <Camera className="w-4 h-4 text-slate-400" /><span className="text-[9px] text-slate-500">کیمرہ</span>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />
                      </label>
                    </div>
                    {draft.photo_url && <img src={draft.photo_url} alt="proof" className="w-full h-24 object-cover rounded-lg" />}
                    <div className="flex gap-2">
                      <Button onClick={() => saveUpdate(t)} disabled={updateMut.isPending} className="flex-1 h-8 gap-1"><Send className="w-3 h-3" /> محفوظ</Button>
                      <Button onClick={() => setEditing(null)} variant="outline" className="h-8">منسوخ</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}