import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, MapPin, User } from "lucide-react";

const URDU = "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif";

// DC panel — lists all patwari halqa registrations with approve / reject actions.
// Shown to deputy_collector + admin roles on the PatwariHalqa page.
export default function HalqaApprovalList() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("pending");

  const { data: all = [], isLoading } = useQuery({
    queryKey: ["patwari-halqa"],
    queryFn: () => base44.entities.PatwariHalqa.list("-created_date", 200),
  });

  const list = useMemo(() => {
    if (filter === "all") return all;
    return all.filter((h) => h.status === filter);
  }, [all, filter]);

  const approveMut = useMutation({
    mutationFn: ({ id, approved_by }) => base44.entities.PatwariHalqa.update(id, { status: "approved", approved_by }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["patwari-halqa"] }); toast.success("حلقہ منظور ہو گیا"); },
    onError: () => toast.error("ناکام"),
  });
  const rejectMut = useMutation({
    mutationFn: ({ id, reason }) => base44.entities.PatwariHalqa.update(id, { status: "rejected", rejection_reason: reason }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["patwari-halqa"] }); toast.success("مسترد کر دیا"); },
    onError: () => toast.error("ناکام"),
  });

  const onApprove = (h, dcName) => {
    approveMut.mutate({ id: h.id, approved_by: dcName || "Deputy Collector" });
  };
  const onReject = (h) => {
    const reason = prompt("مسترد کرنے کی وجہ؟") || "";
    rejectMut.mutate({ id: h.id, reason });
  };

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex gap-1.5">
        {[{ v: "pending", l: "زیرِ التواء" }, { v: "approved", l: "منظور شدہ" }, { v: "rejected", l: "مسترد" }, { v: "all", l: "تمام" }].map((t) => (
          <button key={t.v} onClick={() => setFilter(t.v)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${filter === t.v ? "bg-cyan-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}
            style={{ fontFamily: URDU }}>
            {t.l}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-center text-slate-400 text-sm py-6">Loading…</p>
      ) : list.length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-6" style={{ fontFamily: URDU }}>کوئی رجسٹریشن نہیں</p>
      ) : (
        list.map((h) => {
          let villages = [];
          try { villages = JSON.parse(h.villages_json || "[]"); } catch {}
          return (
            <div key={h.id} className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" /> {h.user_name || "—"}
                  </p>
                  <p className="text-[10px] text-slate-400">{h.user_email || ""}</p>
                </div>
                {h.status === "approved" ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> :
                  h.status === "rejected" ? <XCircle className="w-5 h-5 text-red-500" /> :
                  <Clock className="w-5 h-5 text-amber-500" />}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <MapPin className="w-3 h-3 text-cyan-500" />
                <span>{h.subdivision} · {h.section}</span>
              </div>
              {villages.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {villages.map((v) => (
                    <span key={v} className="bg-cyan-50 text-cyan-700 text-[10px] rounded px-1.5 py-0.5" style={{ fontFamily: URDU }}>{v}</span>
                  ))}
                </div>
              )}
              {h.status === "rejected" && h.rejection_reason && (
                <p className="text-[10px] text-red-600" style={{ fontFamily: URDU }}>وجہ: {h.rejection_reason}</p>
              )}
              {h.status === "pending" && (
                <div className="flex gap-2 pt-1">
                  <Button onClick={() => onApprove(h)} disabled={approveMut.isPending} className="flex-1 h-8 gap-1 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" /> منظور
                  </Button>
                  <Button onClick={() => onReject(h)} variant="outline" disabled={rejectMut.isPending} className="flex-1 h-8 gap-1 text-xs text-red-600 border-red-200 hover:bg-red-50">
                    <XCircle className="w-3.5 h-3.5" /> مسترد
                  </Button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}