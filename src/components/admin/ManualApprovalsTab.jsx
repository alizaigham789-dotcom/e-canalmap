import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Check, X, ExternalLink, Clock } from "lucide-react";
import { toast } from "sonner";
import { expiryForPlan, getPlan } from "@/lib/referralSystem";

const STATUS_STYLE = {
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  active: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  expired: "border-slate-500/40 bg-slate-500/10 text-slate-400",
  rejected: "border-red-500/40 bg-red-500/10 text-red-400",
};

export default function ManualApprovalsTab() {
  const queryClient = useQueryClient();

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ["all-subs"],
    queryFn: () => base44.entities.Subscription.list("-created_date", 200),
  });

  const actMutation = useMutation({
    mutationFn: async ({ id, action, planCode }) => {
      if (action === "approve") {
        const now = new Date();
        const expiry = expiryForPlan(planCode || "2m", now);
        return base44.entities.Subscription.update(id, {
          status: "active",
          payment_date: now.toISOString(),
          expiry_date: expiry.toISOString(),
        });
      }
      return base44.entities.Subscription.update(id, { status: "rejected" });
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["all-subs"] });
      toast.success(vars.action === "approve" ? "سبسکرپشن فعال کر دی" : "رد کر دیا");
    },
    onError: () => toast.error("اپڈیٹ نہیں ہوا"),
  });

  const pending = subs.filter((s) => s.status === "pending");
  const history = subs.filter((s) => s.status !== "pending").slice(0, 30);

  const Row = ({ s }) => (
    <TableRow className="border-slate-800 hover:bg-slate-800/40">
      <TableCell className="text-xs text-slate-300">
        <div className="font-medium text-white">{s.user_name || "—"}</div>
        <div className="text-[10px] text-slate-500">{s.user_email || ""}</div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={`text-[10px] ${s.method === "stripe" ? "border-blue-500/40 text-blue-400" : "border-emerald-500/40 text-emerald-400"}`}>
          {s.method}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-slate-300 font-mono">
        Rs {s.amount || 0}
        {s.plan_code ? <div className="text-[9px] text-slate-500">{getPlan(s.plan_code).labelUr}</div> : null}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={`text-[10px] ${STATUS_STYLE[s.status] || ""}`}>
          {s.status}
        </Badge>
      </TableCell>
      <TableCell className="text-[10px] text-slate-500 font-mono">
        {s.payment_date ? new Date(s.payment_date).toLocaleDateString() : "—"}
        {s.expiry_date ? <div className="text-slate-600">exp: {new Date(s.expiry_date).toLocaleDateString()}</div> : null}
      </TableCell>
      <TableCell>
        {s.receipt_url ? (
          <a href={s.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300">
            <ExternalLink className="w-3 h-3" /> رسید
          </a>
        ) : s.stripe_session_id ? (
          <span className="text-[10px] text-slate-500 font-mono">Stripe</span>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell>
        {s.status === "pending" && (
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="w-7 h-7 text-emerald-400 hover:bg-emerald-500/10"
              disabled={actMutation.isPending}
              onClick={() => actMutation.mutate({ id: s.id, action: "approve", planCode: s.plan_code })}
              title="منظور کریں"
            >
              <Check className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="w-7 h-7 text-red-400 hover:bg-red-500/10"
              disabled={actMutation.isPending}
              onClick={() => actMutation.mutate({ id: s.id, action: "reject" })}
              title="رد کریں"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      {/* Pending */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex items-center gap-2">
        <Clock className="w-4 h-4 text-amber-400" />
        <p className="text-xs text-amber-300 font-medium">{pending.length} منظوری کے انتظار میں</p>
      </div>

      {pending.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-xs text-slate-500">User</TableHead>
                <TableHead className="text-xs text-slate-500">Method</TableHead>
                <TableHead className="text-xs text-slate-500">Amount</TableHead>
                <TableHead className="text-xs text-slate-500">Status</TableHead>
                <TableHead className="text-xs text-slate-500">Dates</TableHead>
                <TableHead className="text-xs text-slate-500">Receipt</TableHead>
                <TableHead className="text-xs text-slate-500">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((s) => <Row key={s.id} s={s} />)}
            </TableBody>
          </Table>
        </div>
      )}

      {/* History */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2 font-mono">Recent History</p>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-xs text-slate-500">User</TableHead>
                <TableHead className="text-xs text-slate-500">Method</TableHead>
                <TableHead className="text-xs text-slate-500">Amount</TableHead>
                <TableHead className="text-xs text-slate-500">Status</TableHead>
                <TableHead className="text-xs text-slate-500">Dates</TableHead>
                <TableHead className="text-xs text-slate-500">Receipt</TableHead>
                <TableHead className="text-xs text-slate-500"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow className="border-slate-800">
                  <TableCell colSpan={7} className="text-center text-xs text-slate-600 py-6">کوئی ریکارڈ نہیں</TableCell>
                </TableRow>
              ) : (
                history.map((s) => <Row key={s.id} s={s} />)
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}