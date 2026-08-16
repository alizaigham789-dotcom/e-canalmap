import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { CreditCard, Upload, Loader2, CheckCircle2, Clock, Lock, ArrowLeft, Receipt } from "lucide-react";
import { toast } from "sonner";

const PRICE = 2000;

export default function Subscription() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: activeSub, isLoading } = useSubscription();
  const [stripeLoading, setStripeLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [pendingManual, setPendingManual] = useState(null);

  // Load any pending manual request for this user
  useEffect(() => {
    if (!currentUser) return;
    base44.entities.Subscription.filter(
      { user_id: currentUser.id, status: "pending", method: "manual" },
      "-created_date",
      10
    )
      .then((res) => setPendingManual(res[0] || null))
      .catch(() => {});
  }, [currentUser]);

  // Stripe success redirect — verify the session and activate
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) return;
    setVerifying(true);
    base44.functions
      .invoke("verifyStripeSession", { session_id: sessionId })
      .then((res) => {
        const data = res.data || res;
        if (data.success) {
          toast.success("پیمنٹ کامیاب! 30 دن کی ایکسیس فعال ہو گئی");
          queryClient.invalidateQueries({ queryKey: ["subscription"] });
          window.history.replaceState({}, "", "/subscription");
        } else {
          toast.error(data.message || "پیمنٹ تصدیق نہیں ہوئی");
        }
      })
      .catch(() => toast.error("تصدیق میں مسئلہ"))
      .finally(() => setVerifying(false));
  }, []);

  const handleStripe = async () => {
    setStripeLoading(true);
    try {
      const res = await base44.functions.invoke("createStripeCheckout", {
        success_url: `${window.location.origin}/subscription`,
      });
      const data = res.data || res;
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Stripe سیشن نہیں بنا");
        setStripeLoading(false);
      }
    } catch (e) {
      toast.error("Stripe میں مسئلہ");
      setStripeLoading(false);
    }
  };

  const handleManual = async () => {
    if (!receiptFile) {
      toast.error("پہلے رسید اپلوڈ کریں");
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: receiptFile });
      await base44.entities.Subscription.create({
        user_id: currentUser.id,
        user_email: currentUser.email,
        user_name: currentUser.full_name || "",
        amount: PRICE,
        method: "manual",
        status: "pending",
        receipt_url: file_url,
      });
      toast.success("رسید جمع ہو گئی — ایڈمن تصدیق کے بعد ایکسیس مل جائے گی");
      setReceiptFile(null);
      setPendingManual({ status: "pending", receipt_url: file_url, created_date: new Date().toISOString() });
    } catch (e) {
      toast.error("اپلوڈ میں مسئلہ");
    }
    setUploading(false);
  };

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const isAdmin = currentUser.role === "admin";
  const expiry = activeSub?.expiry_date ? new Date(activeSub.expiry_date) : null;
  const daysLeft = expiry ? Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-2">
          <button
            onClick={() => navigate("/")}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold font-heading tracking-wide text-slate-800">Subscription</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-5">
        {/* Active status */}
        {isAdmin ? (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
            <p className="text-sm text-blue-800 font-medium">آپ ایڈمن ہیں — تمام فیچرز مفت دستیاب ہیں۔</p>
          </div>
        ) : activeSub ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <p className="text-sm font-bold text-emerald-800">سبسکرپشن فعال</p>
            </div>
            <p className="text-xs text-emerald-700 mt-1">
              میعاد ختم: <span className="font-bold">{expiry.toLocaleDateString("ur-PK")} </span>
              ({daysLeft} دن باقی)
            </p>
          </div>
        ) : verifying ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
            <p className="text-sm text-amber-800">پیمنٹ تصدیق ہو رہی ہے…</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
            <Lock className="w-5 h-5 text-slate-400 shrink-0" />
            <p className="text-sm text-slate-600">
              Map Editor اور Geo Map استعمال کرنے کے لیے 2000 روپے میں 1 ماہ کی سبسکرپشن لازمی ہے۔
            </p>
          </div>
        )}

        {/* Plan card */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="bg-gradient-to-br from-blue-600 to-cyan-500 p-5 text-white">
            <p className="text-xs uppercase tracking-widest opacity-90 font-heading">1 Month Plan</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-bold font-heading">Rs {PRICE}</span>
              <span className="text-sm opacity-90">/ ماہ</span>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Map Editor — مکمل رسائی</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Geo Map — مکمل رسائی</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> 30 دن غیر محدود استعمال</li>
            </ul>
          </div>

          <div className="p-5 space-y-4">
            {/* Stripe */}
            <div>
              <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-blue-600" /> طریقہ 1 — آن لائن کارڈ (Stripe)
              </p>
              <p className="text-[11px] text-slate-500 mb-2">ڈیبٹ/کریڈٹ کارڈ سے فوری ادائیگی — تصدیق کے ساتھ ایکسیس خود بخود کھل جائے گی۔</p>
              <Button
                onClick={handleStripe}
                disabled={stripeLoading || verifying || isAdmin || !!activeSub}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white gap-2"
              >
                {stripeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                {stripeLoading ? "Stripe کھل رہا ہے…" : `Rs ${PRICE} ادا کریں`}
              </Button>
            </div>

            <div className="border-t border-slate-100" />

            {/* Manual */}
            <div>
              <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-600" /> طریقہ 2 — مینوئل (JazzCash / Easypaisa / بینک)
              </p>
              <p className="text-[11px] text-slate-500 mb-2">رقم منتقل کر کے رسید اپلوڈ کریں — ایڈمن تصدیق کے بعد ایکسیس مل جائے گی۔</p>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 mb-3 text-xs text-slate-600 space-y-1">
                <p><span className="font-bold">JazzCash:</span> 0300-1234567</p>
                <p><span className="font-bold">Easypaisa:</span> 0345-1234567</p>
                <p><span className="font-bold">بینک:</span> HBL — اکاؤنٹ نمبر 1234-567890-001</p>
                <p className="text-[10px] text-slate-400 mt-1">ادائیگی کے بعد سلپ/رسید اپلوڈ کریں۔</p>
              </div>

              <label className="block">
                <span className="text-[11px] text-slate-500">رسید / سلپ منتخب کریں</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="mt-1 block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer"
                />
              </label>

              <Button
                onClick={handleManual}
                disabled={uploading || !receiptFile || isAdmin || !!activeSub}
                variant="outline"
                className="w-full mt-3 border-emerald-300 text-emerald-700 hover:bg-emerald-50 gap-2"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? "اپلوڈ ہو رہا ہے…" : "رسید جمع کریں"}
              </Button>

              {pendingManual && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-[11px] text-amber-700">آپ کی رسید ایڈمن کی تصدیق کے انتظار میں ہے۔</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-400">
          سوالات کے لیے اپنے ایڈمن سے رابطہ کریں۔
        </p>
      </main>
    </div>
  );
}