import React, { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { SUBDIVISIONS, sectionsFor, mouzasFor } from "@/lib/jurisdiction";
import { MapPin, Plus, X, CheckCircle2, Clock, XCircle } from "lucide-react";

const URDU = "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif";

// Patwari halqa registration form — patwari enters their subdivision, section,
// and the villages (mouzas) in their halqa. Submitted as "pending" for DC approval.
export default function HalqaForm({ existing, currentUser }) {
  const queryClient = useQueryClient();
  const [subdivision, setSubdivision] = useState(existing?.subdivision || "");
  const [section, setSection] = useState(existing?.section || "");
  const [villages, setVillages] = useState(() => {
    try { return existing?.villages_json ? JSON.parse(existing.villages_json) : []; }
    catch { return []; }
  });
  const [villageInput, setVillageInput] = useState("");

  const sectionOptions = useMemo(() => sectionsFor(subdivision), [subdivision]);
  const mouzaOptions = useMemo(() => (subdivision && section ? mouzasFor(subdivision, section) : []), [subdivision, section]);

  const isPending = existing?.status === "pending";
  const isApproved = existing?.status === "approved";
  const isRejected = existing?.status === "rejected";

  const saveMut = useMutation({
    mutationFn: async (data) => {
      if (existing?.id) {
        return base44.entities.PatwariHalqa.update(existing.id, data);
      }
      return base44.entities.PatwariHalqa.create({
        ...data,
        user_id: currentUser.id,
        user_name: currentUser.full_name || "",
        user_email: currentUser.email || "",
        status: "pending",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patwari-halqa"] });
      toast.success("حلقہ رجسٹریشن محفوظ ہو گئی — DC کی منظوری کا انتظار");
    },
    onError: () => toast.error("محفوظ نہیں ہوا"),
  });

  const submit = () => {
    if (!subdivision || !section) { toast.error("تقسیم اور سیکشن ضروری ہیں"); return; }
    if (villages.length === 0) { toast.error("کم از کم ایک موضع شامل کریں"); return; }
    saveMut.mutate({
      division: "Khushab",
      subdivision,
      section,
      villages_json: JSON.stringify(villages),
    });
  };

  const addVillage = (v) => {
    const name = (v || villageInput).trim();
    if (!name) return;
    if (villages.includes(name)) { toast.error("یہ موضع پہلے شامل ہے"); return; }
    setVillages((p) => [...p, name]);
    setVillageInput("");
  };
  const removeVillage = (v) => setVillages((p) => p.filter((x) => x !== v));

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-4 space-y-4">
      {/* Status banner */}
      {existing && (
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${
          isApproved ? "bg-emerald-50 text-emerald-700" :
          isPending ? "bg-amber-50 text-amber-700" :
          isRejected ? "bg-red-50 text-red-700" : "bg-slate-50 text-slate-600"
        }`}>
          {isApproved ? <CheckCircle2 className="w-4 h-4" /> : isPending ? <Clock className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span style={{ fontFamily: URDU }}>
            {isApproved ? "منظور شدہ — آپ کو ٹاسکس مقرر ہوں گے" :
             isPending ? "DC کی منظوری کا انتظار" :
             isRejected ? `مسترد: ${existing.rejection_reason || "—"}` : "رجسٹرڈ"}
          </span>
        </div>
      )}

      <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5 text-cyan-500" /> اپنا حلقہ (Halqa) درج کریں
      </p>

      {/* Subdivision */}
      <div>
        <Label className="text-[11px] text-slate-500">Sub Division (سب ڈویژن) ★</Label>
        <Select value={subdivision} onValueChange={(v) => { setSubdivision(v); setSection(""); }}>
          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="منتخب کریں" /></SelectTrigger>
          <SelectContent>
            {SUBDIVISIONS.Khushab.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Section */}
      <div>
        <Label className="text-[11px] text-slate-500">Zilladar Section (ضلعداری سیکشن) ★</Label>
        <Select value={section} onValueChange={setSection} disabled={!subdivision}>
          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="منتخب کریں" /></SelectTrigger>
          <SelectContent>
            {sectionOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Villages (mouzas) in this halqa */}
      <div>
        <Label className="text-[11px] text-slate-500">Villages / Mouzas in your Halqa (آپ کے حلقہ کے موضع) ★</Label>
        {mouzaOptions.length > 0 ? (
          <Select value="" onValueChange={addVillage}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="+ موضع شامل کریں" /></SelectTrigger>
            <SelectContent>
              {mouzaOptions.filter((m) => !villages.includes(m)).map((m) => (
                <SelectItem key={m} value={m} style={{ fontFamily: URDU }}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex gap-2">
            <Input value={villageInput} onChange={(e) => setVillageInput(e.target.value)} dir="auto" placeholder="موضع کا نام" className="h-9 text-sm" style={{ fontFamily: URDU }} />
            <Button onClick={() => addVillage()} variant="outline" className="h-9 shrink-0"><Plus className="w-4 h-4" /></Button>
          </div>
        )}
        {villages.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {villages.map((v) => (
              <span key={v} className="inline-flex items-center gap-1 bg-cyan-50 text-cyan-700 text-[11px] rounded-full px-2 py-1" style={{ fontFamily: URDU }}>
                {v}
                <button onClick={() => removeVillage(v)} className="text-cyan-400 hover:text-red-500"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      <Button onClick={submit} disabled={saveMut.isPending || isApproved} className="w-full gap-1.5">
        <CheckCircle2 className="w-4 h-4" />
        {existing ? "رجسٹریشن اپ ڈیٹ کریں" : "حلقہ رجسٹر کریں"}
      </Button>
      {isApproved && (
        <p className="text-[10px] text-center text-emerald-600" style={{ fontFamily: URDU }}>
          آپ کا حلقہ منظور ہو چکا ہے — تبدیلی کے لیے DC سے رابطہ کریں
        </p>
      )}
    </div>
  );
}