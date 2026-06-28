import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, X, Upload } from "lucide-react";

// AI-powered map scan: upload a photo of a hand-drawn cadastral map,
// detect parcels / infrastructure and convert to digital objects.
export default function MapScanDialog({ onClose, onAddObjects }) {
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(file);

    setScanning(true);
    setResult(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `This is a scanned cadastral / land-record map (Khasra / Chakbandi / Parat). 
Identify all recognizable land parcels, canals, roads, and boundaries.
Return a JSON object with an array "objects" where each item has:
- type: "mustateel" | "muraba" | "acre" | "canal" | "khal" | "road"
- label: string (parcel number or name, if visible)
- notes: string (any extra info)

Return ONLY the JSON, no extra text.`,
        file_urls: [file_url],
        model: "claude_sonnet_4_6",
        response_json_schema: {
          type: "object",
          properties: {
            objects: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  label: { type: "string" },
                  notes: { type: "string" },
                },
              },
            },
            summary: { type: "string" },
          },
        },
      });
      setResult(res);
    } catch (e) {
      setResult({ error: "اسکین ناکام — دوبارہ کوشش کریں" });
    }
    setScanning(false);
  };

  const handleImport = () => {
    if (!result?.objects?.length) return;
    // Place objects in a grid layout starting at (200, 200)
    const { createMustateel, createMuraba, createAcre, createCanal, createKhal, createRoad } = window.__gisEngine || {};
    // We'll just notify with the extracted label list for now since we don't have
    // exact coordinates from image analysis — user can place manually
    const summary = result.objects.map((o, i) => `${o.type}: ${o.label || "—"}`).join("\n");
    alert(`AI نے یہ عناصر پہچانے:\n\n${summary}\n\nمیپ پر دستی پلیس کریں یا ٹول سے کھینچیں۔`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-5 w-96 max-w-[90vw] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 font-heading">AI Map Scanner</h3>
            <p className="text-[10px] text-slate-400">کیمرہ یا فائل سے نقشہ اسکین کریں</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Upload area */}
        <div
          className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          {preview ? (
            <img src={preview} alt="preview" className="max-h-40 mx-auto rounded-lg object-contain" />
          ) : (
            <div className="space-y-2">
              <Camera className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">کلک کریں یا تصویر کھینچیں</p>
              <p className="text-[10px] text-slate-400">Camera / Gallery / File</p>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={e => handleFile(e.target.files[0])} />

        {scanning && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
            <span className="text-xs text-amber-700">AI نقشہ تجزیہ کر رہا ہے…</span>
          </div>
        )}

        {result && !result.error && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
            <p className="text-[11px] font-bold text-green-800">✓ اسکین مکمل</p>
            <p className="text-[10px] text-green-700">{result.summary || `${result.objects?.length || 0} عناصر پہچانے گئے`}</p>
            <div className="max-h-24 overflow-y-auto space-y-0.5">
              {result.objects?.map((o, i) => (
                <div key={i} className="text-[10px] text-slate-600 font-mono">{o.type}: {o.label || "—"} {o.notes ? `(${o.notes})` : ""}</div>
              ))}
            </div>
          </div>
        )}

        {result?.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
            {result.error}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs h-8">بند کریں</Button>
          {result?.objects?.length > 0 && (
            <Button size="sm" className="text-xs h-8 bg-amber-500 hover:bg-amber-600 text-white gap-1" onClick={handleImport}>
              <Upload className="w-3 h-3" /> نتائج دیکھیں
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}