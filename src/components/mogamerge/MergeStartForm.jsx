// ============================================================
// MOGA MERGE START FORM — the "start page" of the merge module.
// Captures the new mouza map's metadata (Mouza, Section,
// Subdivision, Division) and the FIRST (anchor) moga to place.
// After "Start", MogaMerge switches to an editor canvas where
// additional mogas attach one-by-one via dummy mustateel cells.
// ============================================================

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Network, Loader2, AlertCircle, CheckCircle2, Circle, Wand2, ArrowLeft,
} from "lucide-react";

export default function MergeStartForm({
  villages, mouza, onMouzaChange,
  villageMogas, anchorMapId, onPickAnchor,
  section, subdivision, division, onFieldChange,
  onStart, busy, error, isLoading, onBack,
}) {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Heading */}
      <header className="bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-2 sticky top-0 z-20">
        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onBack} title="Back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Network className="w-5 h-5 text-violet-600" />
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-bold text-slate-800 truncate">Mouza Map</h1>
          <p className="text-[10px] text-slate-500" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>موگے کو ایک نقشے میں ملائیں</p>
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-700 font-heading">
            موضع نقشے کی تفصیل درج کریں
          </h2>

          {/* Metadata fields */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="موضع / Mouza">
              <select
                value={mouza}
                onChange={(e) => onMouzaChange(e.target.value)}
                className="w-full h-9 text-sm rounded-md border border-slate-200 bg-slate-50 px-2 text-slate-700"
              >
                <option value="">— منتخب کریں —</option>
                {villages.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="سیکشن / Section">
              <Input
                value={section}
                onChange={(e) => onFieldChange("section", e.target.value)}
                dir="auto"
                className="h-9 text-sm bg-slate-50 border-slate-200"
                placeholder="سیکشن"
              />
            </Field>
            <Field label="سب ڈویژن / Subdivision">
              <Input
                value={subdivision}
                onChange={(e) => onFieldChange("subdivision", e.target.value)}
                dir="auto"
                className="h-9 text-sm bg-slate-50 border-slate-200"
                placeholder="سب ڈویژن"
              />
            </Field>
            <Field label="ڈویژن / Division">
              <Input
                value={division}
                onChange={(e) => onFieldChange("division", e.target.value)}
                dir="auto"
                className="h-9 text-sm bg-slate-50 border-slate-200"
                placeholder="ڈویژن"
              />
            </Field>
          </div>

          {mouza && (
            <>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                  Mogas ({villageMogas.length})
                </span>
                <span className="text-[10px] text-violet-600 font-bold" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
                  پہلا موگہ چنیں
                </span>
              </div>

              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {villageMogas.map((m) => {
                  const isAnchor = m.id === anchorMapId;
                  return (
                    <button
                      key={m.id}
                      onClick={() => onPickAnchor(m.id)}
                      className={`w-full flex items-center gap-2 border rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                        isAnchor ? "bg-violet-50 border-violet-400 ring-1 ring-violet-300" : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {isAnchor ? (
                        <CheckCircle2 className="w-4 h-4 text-violet-600 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-700 truncate">{m.title || "Untitled"}</p>
                        <p className="text-[10px] text-slate-400">موگہ {m.moga_number || "—"}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">{m.total_parcels || 0}</span>
                    </button>
                  );
                })}
                {!villageMogas.length && !isLoading && (
                  <p
                    className="text-xs text-slate-400 text-center py-3"
                    style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}
                  >
                    اس گاؤں کا کوئی موگہ نقشہ نہیں ملا۔
                  </p>
                )}
              </div>
              {anchorMapId && (
                <p className="text-[10px] text-slate-400 leading-relaxed" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
                  شروع کرنے کے بعد خالی (dummy) خانوں میں مستطیل نمبر درج کر کے باقی موگے ایک ایک کر کے جوڑیں۔
                </p>
              )}
            </>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-600" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
                {error}
              </p>
            </div>
          )}

          <Button
            size="sm"
            onClick={onStart}
            disabled={busy || !anchorMapId}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white gap-1.5"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            شروع کریں
          </Button>

          {isLoading && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">{label}</label>
      {children}
    </div>
  );
}