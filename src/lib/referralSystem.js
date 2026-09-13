import { base44 } from "@/api/base44Client";

// ============================================================
// Plans, flash-sale (48h for new users), and referral reward
// logic. Shared between Subscription page, AuthContext, and the
// admin approvals tab.
// ============================================================

export const PLANS = [
  {
    code: "2m", label: "Starter", labelUr: "اسٹارٹر", months: 2, durationDays: 60,
    price: 1500, discountPrice: 1300, popular: false,
    features: ["پرت وارابندی پرنٹ/PDF", "فارم 1 رجسٹر", "میپ ایڈیٹر استعمال", "2 ماہ مکمل رسائی"],
  },
  {
    code: "6m", label: "Professional", labelUr: "پروفیشنل", months: 6, durationDays: 180,
    price: 3000, discountPrice: 2500, popular: true,
    features: ["اسٹارٹر کی تمام سہولیات", "جیو میپ ملٹی موگہ اوورلے", "موگہ مارج", "6 ماہ رسائی", "ترجیحی سپورٹ"],
  },
  {
    code: "y", label: "Annual", labelUr: "سالانہ", months: 12, durationDays: 365,
    price: 5000, discountPrice: 4000, popular: false,
    features: ["پروفیشنل کی تمام سہولیات", "1000 روپے بچت", "سال بھر رسائی", "ریفرل پروگرام"],
  },
];

export const FLASH_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours

export function getPlan(code) {
  return PLANS.find((p) => p.code === code) || PLANS[0];
}

export function getPlanPrice(code, flashActive) {
  const p = getPlan(code);
  return flashActive ? p.discountPrice : p.price;
}

// Flash sale is active for 48h after the user's account creation date.
// Flash sale is active for 48h after the user's first login (or account
// creation date as fallback). Accepts the full user object so new users who
// don't yet have a created_date still see the discount window.
export function getFlashState(user) {
  const createdDate = user?.first_login_at || user?.created_date;
  if (!createdDate) return { active: false, end: 0, msLeft: 0 };
  const start = new Date(createdDate).getTime();
  const end = start + FLASH_WINDOW_MS;
  const now = Date.now();
  const active = now < end;
  return { active, end, msLeft: active ? end - now : 0 };
}

export function formatCountdown(ms) {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function expiryForPlan(code, from = new Date()) {
  const p = getPlan(code);
  return new Date(from.getTime() + p.durationDays * 24 * 60 * 60 * 1000);
}

// Lowest-priced plan among the given codes (used for the referral reward).
export function lowestPlanCode(codes) {
  const sorted = codes.map(getPlan).sort((a, b) => a.price - b.price);
  return sorted[0]?.code;
}

const PENDING_KEY = "pending_referral";

// Capture ?ref=<inviter_user_id> from the signup URL into localStorage so it
// survives the Google OAuth redirect and the email-OTP flow.
export function captureReferralFromUrl() {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      window.localStorage.setItem(PENDING_KEY, ref);
      params.delete("ref");
      const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash}`;
      window.history.replaceState({}, document.title, newUrl);
    }
  } catch (e) {
    // ignore
  }
}

function getPendingReferral() {
  try { return window.localStorage.getItem(PENDING_KEY); } catch { return null; }
}

function clearPendingReferral() {
  try { window.localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
}

// After login, link the pending referral to this user (create a Referral
// record where they are the invited party). Idempotent + non-blocking.
export async function processPendingReferral(user) {
  if (!user?.id) return;
  const ref = getPendingReferral();
  if (!ref || ref === user.id) {
    clearPendingReferral();
    return;
  }
  const existing = await base44.entities.Referral.filter(
    { referred_user_id: user.id },
    "-created_date",
    5
  ).catch(() => []);
  if (existing && existing.length) {
    clearPendingReferral();
    return;
  }
  try {
    await base44.entities.Referral.create({
      referrer_user_id: ref,
      referred_user_id: user.id,
      referred_email: user.email || "",
      status: "pending",
    });
    await base44.auth.updateMe({ referred_by_user_id: ref }).catch(() => {});
  } catch (e) {
    // non-critical
  }
  clearPendingReferral();
}

// Called when the referred user's subscription becomes active: marks their
// referral record(s) as qualified with their paid plan.
export async function markReferralQualified(userId, planCode) {
  if (!userId) return;
  try {
    const mine = await base44.entities.Referral.filter(
      { referred_user_id: userId, status: "pending" },
      "-created_date",
      10
    );
    for (const r of mine) {
      await base44.entities.Referral.update(r.id, {
        status: "qualified",
        plan_code: planCode || "2m",
      });
    }
  } catch (e) {
    // non-critical
  }
}

// Called on the inviter's subscription page: if they have 3+ qualified
// referrals and no existing referral-reward subscription, grant a free
// subscription on the lowest priced paid plan. One-time.
export async function maybeGrantReferralReward(user) {
  if (!user?.id) return null;
  const refs = await base44.entities.Referral.filter(
    { referrer_user_id: user.id },
    "-created_date",
    50
  ).catch(() => []);
  const qualified = refs.filter((r) => r.status === "qualified");
  if (qualified.length < 3) return null;

  const myRewards = await base44.entities.Subscription.filter(
    { user_id: user.id, is_referral_reward: true },
    "-created_date",
    10
  ).catch(() => []);
  if (myRewards && myRewards.length) return null;

  const lowestCode = lowestPlanCode(qualified.map((r) => r.plan_code).filter(Boolean));
  if (!lowestCode) return null;

  const now = new Date();
  const expiry = expiryForPlan(lowestCode, now);
  try {
    return await base44.entities.Subscription.create({
      user_id: user.id,
      user_email: user.email || "",
      user_name: user.full_name || "",
      amount: 0,
      method: "referral",
      status: "active",
      plan_code: lowestCode,
      is_referral_reward: true,
      payment_date: now.toISOString(),
      expiry_date: expiry.toISOString(),
      notes: "Referral reward — 3 paid referrals",
    });
  } catch (e) {
    return null;
  }
}