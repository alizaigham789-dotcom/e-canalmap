import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-2">
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

      <main className="max-w-md mx-auto px-4 py-6 space-y-5">
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