import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Mail,
  Shield,
  Trash2,
  Loader2,
  CheckCircle2,
  Gift,
  Copy,
  Share2,
  Check,
  MessageCircle,
  Facebook,
} from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

// User-owned data entities purged on account deletion
const USER_DATA_ENTITIES = [
  "LandMap",
  "MapSnapshot",
  "Form1Register",
  "ParatWarabandi",
  "Form33CRecord",
  "Naqsha27B",
  "Subscription",
];

export default function Account() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { data: subscription } = useSubscription();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const isAdmin = user?.role === "admin";
  const canDelete = confirmText.trim().toUpperCase() === "DELETE";

  // Referral progress — invited count + paid count toward the 3-paid free plan
  const { data: myReferrals = [] } = useQuery({
    queryKey: ["referrals-out", user?.id],
    queryFn: () => base44.entities.Referral.filter({ referrer_user_id: user.id }, "-created_date", 50),
    enabled: !!user?.id,
  });
  const qualifiedCount = myReferrals.filter((r) => r.status === "qualified").length;

  const handleDelete = async () => {
    if (!canDelete || deleting) return;
    setDeleting(true);
    try {
      const uid = user?.id;
      if (uid) {
        // Delete all user-owned records across data entities
        await Promise.allSettled(
          USER_DATA_ENTITIES.map((e) =>
            base44.entities[e].deleteMany({ created_by_id: uid })
          )
        );
        // Attempt to delete the user record itself (admin/service role only; ignored otherwise)
        await Promise.allSettled([base44.entities.User.delete(uid)]);
      }
      toast.success("Account data deleted");
      setConfirmOpen(false);
      setConfirmText("");
      logout(false);
      window.location.href = "/login";
    } catch (e) {
      toast.error("Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-24 antialiased">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-sm safe-top">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2">
          <button
            onClick={() => navigate("/")}
            className="w-11 h-11 -ml-1 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold font-heading tracking-wide">
            Account &amp; Settings
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Profile card */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white text-xl font-bold shadow-md shadow-blue-500/30">
              {user?.full_name?.[0] || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold truncate">
                {user?.full_name || "User"}
              </p>
              <p className="text-sm text-slate-500 truncate flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> {user?.email || "—"}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Role
              </p>
              <p className="text-sm font-semibold flex items-center gap-1.5 mt-0.5">
                <Shield className="w-3.5 h-3.5 text-blue-600" />{" "}
                {isAdmin ? "Admin" : "User"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Subscription
              </p>
              <p className="text-sm font-semibold flex items-center gap-1.5 mt-0.5">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    subscription ? "text-emerald-600" : "text-slate-400"
                  }`}
                />
                {subscription ? "Active" : "None"}
              </p>
            </div>
          </div>
        </section>

        {/* Subscription & Invite */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-800">سبسکرپشن اور ریفرل</h2>

          <button
            onClick={() => navigate("/subscription")}
            className="w-full flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-blue-300 hover:bg-blue-50/40 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800">Subscription</p>
              <p className="text-[11px] text-slate-500">
                {subscription ? "فعال" : "ابھی سبسکرائب نہیں — پلانز دیکھیں"}
              </p>
            </div>
            <ArrowLeft className="w-4 h-4 text-slate-400 rotate-180" />
          </button>

          <InviteRow user={user} qualifiedCount={qualifiedCount} totalReferred={myReferrals.length} />

          <a
            href={`https://wa.me/923023538711?text=${encodeURIComponent("السلام علیکم، مجھے E-canal Map app کی معلومات چاہیے۔")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 hover:bg-emerald-100 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-emerald-800">WhatsApp Help</p>
              <p className="text-[11px] text-emerald-600">مدد کے لیے واٹس ایپ پر رابطہ کریں</p>
            </div>
            <ArrowLeft className="w-4 h-4 text-emerald-500 rotate-180" />
          </a>
        </section>

        {/* Danger zone */}
        <section className="bg-white rounded-2xl border border-red-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-red-600 flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Delete Account
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Permanently delete your account and all associated data (maps,
            registers, warabandi records). This action cannot be undone.
          </p>
          <Button
            variant="destructive"
            className="w-full mt-4 h-11 text-sm"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="w-4 h-4" /> Delete My Account
          </Button>
        </section>
      </main>

      <BottomNav />

      {/* Confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              Delete Account?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently erase all your maps, registers and records.
              To confirm, type <b>DELETE</b> below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE"
            className="mt-2"
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting}
              onClick={() => setConfirmText("")}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={!canDelete || deleting}
              onClick={handleDelete}
              className="h-10"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Delete Forever"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InviteRow({ user, qualifiedCount = 0, totalReferred = 0 }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/register?ref=${user?.id || ""}`;
  const remaining = Math.max(0, 3 - qualifiedCount);
  const shareData = {
    title: "E-canal Map",
    text: "E-canal Map app میں شامل ہوں — لینڈ ریکارڈز اور وارابندی ڈیجیٹل کریں:",
    url: link,
  };
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share(shareData); } catch {}
      return;
    }
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      toast.success("ریفرل لنک کاپی ہو گیا");
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const waLink = `https://wa.me/?text=${encodeURIComponent(shareData.text + " " + link)}`;
  const fbLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <Gift className="w-4 h-4 text-violet-600" />
        <p className="text-xs font-bold text-violet-800">دوستوں کو مدعو کریں</p>
      </div>
      <p className="text-[10px] text-violet-600 mb-2">3 دوست جوائن کر کے ادائیگی کریں → پلان مفت!</p>
      <div className="mt-2 mb-2">
        <div className="flex justify-between text-[10px] text-violet-700 mb-0.5">
          <span>{qualifiedCount} / 3 ادائیگی مکمل</span>
          <span>{totalReferred} کل مدعو</span>
        </div>
        <div className="h-2 rounded-full bg-violet-100 overflow-hidden">
          <div className="h-full bg-violet-600 rounded-full transition-all" style={{ width: `${Math.min(100, (qualifiedCount / 3) * 100)}%` }} />
        </div>
        <p className="text-[9px] text-violet-500 mt-1">{remaining > 0 ? `${remaining} اور ادائیگی مکمل کرنے باقی` : "مکمل! پلان مفت فعال ہو گیا"}</p>
      </div>
      <div className="flex items-center gap-1.5 bg-white rounded-lg border border-violet-200 p-1.5 mb-2">
        <input readOnly value={link} className="flex-1 text-[10px] text-slate-600 bg-transparent outline-none font-mono truncate" />
        <Button size="sm" onClick={share} className="h-7 bg-violet-600 hover:bg-violet-700 text-[10px] gap-1">
          {copied ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
          {copied ? "ہو گیا" : "شیئر"}
        </Button>
      </div>
      <div className="flex items-center gap-1.5">
        <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1 h-7 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold">
          <MessageCircle className="w-3 h-3" /> WhatsApp
        </a>
        <a href={fbLink} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1 h-7 rounded-md bg-blue-700 hover:bg-blue-800 text-white text-[10px] font-bold">
          <Facebook className="w-3 h-3" /> Facebook
        </a>
      </div>
    </div>
  );
}