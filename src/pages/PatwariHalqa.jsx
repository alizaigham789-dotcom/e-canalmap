import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, UserCheck } from "lucide-react";
import HalqaForm from "@/components/patwari/HalqaForm";
import HalqaApprovalList from "@/components/patwari/HalqaApprovalList";

const URDU = "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif";

// PatwariHalqa page — patwaris register their halqa (jurisdiction + villages);
// Deputy Collectors approve registrations. Tasks auto-route to the approved
// patwari of a mouza when the DC creates a task in Task Assignment.
export default function PatwariHalqa() {
  const navigate = useNavigate();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: halqaList = [] } = useQuery({
    queryKey: ["patwari-halqa"],
    queryFn: () => base44.entities.PatwariHalqa.list("-created_date", 200),
  });

  const isDC = me?.role === "deputy_collector" || me?.role === "admin";
  const myHalqa = useMemo(
    () => halqaList.find((h) => h.user_id === me?.id),
    [halqaList, me]
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2">
          <button onClick={() => navigate("/canal-patwari")} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-cyan-600 hover:bg-slate-100">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm font-bold font-heading text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-500" /> Halqa Registration
            </h1>
            <p className="text-[10px] text-slate-400" style={{ fontFamily: URDU }}>پٹواری حلقہ رجسٹریشن</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {isDC ? (
          <>
            <div className="bg-cyan-50 rounded-xl p-3 flex items-start gap-2">
              <UserCheck className="w-4 h-4 text-cyan-600 mt-0.5 shrink-0" />
              <p className="text-[11px] text-cyan-800" style={{ fontFamily: URDU }}>
                ڈپٹی کلکٹر پینل — پٹواریوں کی حلقہ رجسٹریشن کی منظوری۔ منظور شدہ پٹواری کو خود بخود متعلقہ موضع کے ٹاسکس مقرر ہوں گے۔
              </p>
            </div>
            <HalqaApprovalList />
          </>
        ) : (
          <>
            <div className="bg-cyan-50 rounded-xl p-3 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-600 mt-0.5 shrink-0" />
              <p className="text-[11px] text-cyan-800" style={{ fontFamily: URDU }}>
                اپنا حلقہ (Halqa) اور موضع درج کریں — ڈپٹی کلکٹر کی منظوری کے بعد آپ کو متعلقہ موضع کے ٹاسکس خود بخود مقرر ہوں گے۔
              </p>
            </div>
            {me ? <HalqaForm existing={myHalqa} currentUser={me} /> : <p className="text-center text-slate-400 text-sm py-6">Loading…</p>}
          </>
        )}
      </main>
    </div>
  );
}