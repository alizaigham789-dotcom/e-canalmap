import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle2, Clock, ArrowLeft, Receipt } from "lucide-react";
import { toast } from "sonner";
import FlashTimer from "@/components/subscription/FlashTimer";
import ReferralCard from "@/components/subscription/ReferralCard";
import PlanPricingCard from "@/components/subscription/PlanPricingCard";
import {
  PLANS,
  getPlan,
  getPlanPrice,
  getFlashState,
  markReferralQualified,
  maybeGrantReferralReward,
} from "@/lib/referralSystem";

export default function Subscription() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: activeSub, isLoading } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [pendingManual, setPendingManual] = useState(null);
  const rewardCheckedRef = useRef(false);

  const flash = getFlashState(currentUser);

  // Referrals where I am the inviter (progress toward free plan)
  const { data: myReferrals = [] } = useQuery({
    queryKey: ["referrals-out", currentUser?.id],
    queryFn: () => base44.entities.Referral.filter({ referrer_user_id: currentUser.id }, "-created_date", 50),
    enabled: !!currentUser?.id,
  });
  const qualifiedCount = myReferrals.filter((r) => r.status === "qualified").length;

  // Referrals where I am the invited user (to qualify when I pay)
  const { data: myInvitedBy = [] } = useQuery({
    queryKey: ["referrals-in", currentUser?.id],
    queryFn: () => base44.entities.Referral.filter({ referred_user_id: currentUser.id }, "-created_date", 5),
    enabled: !!currentUser?.id,
  });

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

  // Qualify my referral when my subscription becomes active
  useEffect(() => {
    if (activeSub && currentUser && myInvitedBy.some((r) => r.status === "pending")) {
      markReferralQualified(currentUser.id, activeSub.plan_code).then(() => {
        queryClient.invalidateQueries({ queryKey: ["referrals-in", currentUser.id] });
      });
    }
  }, [activeSub, currentUser, myInvitedBy]); // eslint-disable-line react-hooks/exhaustive-deps

  // Grant referral reward (one-time) when 3+ qualified and no active access
  useEffect(() => {
    if (!currentUser || rewardCheckedRef.current) return;
    if (activeSub) return;
    if (qualifiedCount < 3) return;
    rewardCheckedRef.current = true;
    maybeGrantReferralReward(currentUser).then((reward) => {
      if (reward) {
        toast.success("🎁 ریفرل ریوارڈ — پلان مفت فعال ہو گیا!");
        queryClient.invalidateQueries({ queryKey: ["subscription", currentUser.id] });
      }
    });
  }, [currentUser, qualifiedCount, activeSub]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleManual = async () => {
    if (!receiptFile) {
      toast.error("پہلے رسید اپلوڈ کریں");
      return;
    }
    if (!selectedPlan) {
      toast.error("پہلے پلان منتخب کریں");
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: receiptFile });
      const price = getPlanPrice(selectedPlan, flash.active);
      await base44.entities.Subscription.create({
        user_id: currentUser.id,
        user_email: currentUser.email,
        user_name: currentUser.full_name || "",
        amount: price,
        method: "manual",
        status: "pending",
        plan_code: selectedPlan,
        receipt_url: file_url,
      });
      toast.success("رسید جمع ہو گئی — ایڈمن تصدیق کے بعد ایکسیس مل جائے گی");
      setReceiptFile(null);
      setSelectedPlan(null);
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
  const activePlan = activeSub ? getPlan(activeSub.plan_code) : null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2">
          <button
            onClick={() => navigate("/")}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold font-heading tracking-wide text-slate-800">Subscribe</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Active status */}
        {activeSub ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <p className="text-sm font-bold text-emerald-800">
                سبسکرپشن فعال{activeSub.is_referral_reward ? " (ریفرل ریوارڈ 🎁)" : ""}
                {activePlan ? ` — ${activePlan.labelUr}` : ""}
              </p>
            </div>
            <p className="text-xs text-emerald-700 mt-1">
              میعاد ختم: <span className="font-bold">{expiry.toLocaleDateString("ur-PK")}</span> ({daysLeft} دن باقی)
            </p>
          </div>
        ) : (
          <>
            {isAdmin && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                <p className="text-sm text-blue-800 font-medium">آپ ایڈمن ہیں — تمام فیچرز مفت دستیاب ہیں۔ یہ پلانز صرف پیشنمائش کے لیے ہیں۔</p>
              </div>
            )}
            {flash.active && <FlashTimer msLeft={flash.msLeft} />}

            {/* Referral card */}
            <ReferralCard user={currentUser} qualifiedCount={qualifiedCount} totalReferred={myReferrals.length} />

            {/* Plans — pricing cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {PLANS.map((p) => (
                <PlanPricingCard
                  key={p.code}
                  plan={p}
                  flashActive={flash.active}
                  msLeft={flash.msLeft}
                  selected={selectedPlan === p.code}
                  onSelect={setSelectedPlan}
                />
              ))}
            </div>

            {/* Payment for selected plan */}
            {selectedPlan && (
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="bg-gradient-to-br from-blue-600 to-cyan-500 p-4 text-white">
                  <p className="text-xs uppercase tracking-widest opacity-90 font-heading">
                    {getPlan(selectedPlan).labelUr} Plan
                  </p>
                  <p className="text-2xl font-bold font-heading mt-0.5">
                    Rs {getPlanPrice(selectedPlan, flash.active)}
                  </p>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-emerald-600" /> ادائیگی کے طریقے
                    </p>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1.5">
                      <p><span className="font-bold">JazzCash:</span> 03023538711</p>
                      <p><span className="font-bold">نام:</span> Munsib Ali</p>
                      <p className="text-[10px] text-slate-400 mt-1">Easypaisa / بینک — جلد دستیاب</p>
                      <p className="text-[10px] text-slate-400 mt-1.5 pt-1.5 border-t border-slate-200">
                        Rs {getPlanPrice(selectedPlan, flash.active)} جمع کر کے رسید اپلوڈ کریں — ایڈمن تصدیق کے بعد{" "}
                        {getPlan(selectedPlan).labelUr} کی ایکسیس مل جائے گی۔
                      </p>
                    </div>
                  </div>
                  <div>
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
                      disabled={uploading || !receiptFile}
                      className="w-full mt-3 bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploading ? "اپلوڈ ہو رہا ہے…" : "رسید جمع کریں"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {pendingManual && !selectedPlan && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-[11px] text-amber-700">آپ کی رسید ایڈمن کی تصدیق کے انتظار میں ہے۔</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}