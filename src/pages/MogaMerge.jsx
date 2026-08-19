// ============================================================
// MOGA MERGE TO ONE MAP — dedicated module.
// Select mogas of a village → build one big mouza map where each
// moga is an indivisible group (whole-moga move, grid-snapped).
// Auto-arrange (consecutive Khasra numbering) + manual drag +
// auto-fit. Save → a normal LandMap that shows up & overlays in
// Geo Map like any moga map.
// ============================================================

import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Network, Loader2, AlertCircle, CheckSquare, Square, Layers, Maximize2,
  Wand2, Save, ArrowLeft, Eye,
} from "lucide-react";
import MogaMergeCanvas from "@/components/mogamerge/MogaMergeCanvas";
import { buildMouzaMerge } from "@/lib/mogaMerge";
import { loadDrawingData, storeDrawingData } from "@/lib/drawingDataStorage";
import { toast } from "sonner";

// Apply a world offset to one object's geometry (commit a group move)
function offsetObj(o, dx, dy) {
  const copy = { ...o };
  if (["acre", "mustateel", "muraba", "damageMarker"].includes(o.type)) {
    copy.x = (o.x || 0) + dx; copy.y = (o.y || 0) + dy;
  }
  if (o.points) copy.points = o.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
  if (o.start && o.end) {
    copy.start = { x: o.start.x + dx, y: o.start.y + dy };
    copy.end = { x: o.end.x + dx, y: o.end.y + dy };
  }
  return copy;
}

export default function MogaMerge() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [village, setVillage] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [objects, setObjects] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [fitSignal, setFitSignal] = useState(0);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false); // building / saving
  const [error, setError] = useState(null);

  const { data: maps, isLoading } = useQuery({
    queryKey: ["landmaps-all"],
    queryFn: () => base44.entities.LandMap.list("-updated_date", 500),
  });

  // Single-moga maps (have a moga_number) grouped by village
  const villages = useMemo(
    () => [...new Set((maps || []).filter(m => m.village && m.moga_number).map(m => m.village))].sort(),
    [maps]
  );
  const villageMogas = useMemo(
    () => (maps || []).filter(m => m.village === village && m.moga_number && m.drawing_data)
      .sort((a, b) => (parseInt(a.moga_number) || 0) - (parseInt(b.moga_number) || 0)),
    [maps, village]
  );

  const selectedSet = selected.size ? selected : new Set(villageMogas.map(m => m.id));
  const allSelected = villageMogas.length > 0 && selectedSet.size === villageMogas.length;

  const toggle = (id) => {
    setError(null);
    setSelected(prev => {
      const base = prev.size ? prev : new Set(villageMogas.map(m => m.id));
      const next = new Set(base);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(villageMogas.map(m => m.id)));

  // Resolve drawing_data (handles URL-stored large maps) → inline JSON map records
  const resolveMaps = async (ids) => {
    const chosen = villageMogas.filter(m => ids.has(m.id));
    return Promise.all(chosen.map(async m => {
      const objs = await loadDrawingData(m.drawing_data);
      return { ...m, drawing_data: JSON.stringify(objs) };
    }));
  };

  // Build / rebuild the merged mouza map (auto-arrange by consecutive Khasra numbering)
  const handleBuild = async () => {
    const ids = selectedSet;
    if (!ids.size) { setError("کم از کم ایک موگہ منتخب کریں۔"); return; }
    setBusy(true); setError(null);
    try {
      const resolved = await resolveMaps(ids);
      const { objects: merged } = buildMouzaMerge(resolved);
      if (!merged.length) { setError("مرج کرنے کے لیے کوئی ڈیٹا نہیں ملا۔"); return; }
      setObjects(merged);
      setSelectedGroup(null);
      setFitSignal(s => s + 1);
      if (!title) setTitle(`موضع نقشہ - ${village}`);
    } catch (e) {
      setError("مرج میں مسئلہ: " + (e?.message || "unknown"));
    } finally {
      setBusy(false);
    }
  };

  // Manual commit of a whole-moga drag (canvas → state)
  const handleCommitMove = useCallback((groupId, dx, dy) => {
    setObjects(prev => prev.map(o => (o.mogaGroup === groupId ? offsetObj(o, dx, dy) : o)));
  }, []);

  const handleAutoFit = () => setFitSignal(s => s + 1);

  // Save the merged map as a normal LandMap → appears in Geo Map list
  const handleSave = async () => {
    if (!objects.length) { setError("پہلے مرج کریں۔"); return; }
    setBusy(true); setError(null);
    try {
      const parcels = objects.filter(o => ["mustateel", "muraba"].includes(o.type)).length;
      const saved = await base44.entities.LandMap.create({
        title: title || `موضع نقشہ - ${village}`,
        village, status: "draft",
        drawing_data: await storeDrawingData(objects),
        total_parcels: parcels,
      });
      queryClient.invalidateQueries({ queryKey: ["landmaps-all"] });
      queryClient.invalidateQueries({ queryKey: ["geomap-maps"] });
      toast.success("موضع نقشہ محفوظ ہو گیا — Geo Map میں دکھائی دے گا");
      navigate(`/geo-map`);
      return saved;
    } catch (e) {
      setError("محفوظ کرنے میں مسئلہ: " + (e?.message || "unknown"));
    } finally {
      setBusy(false);
    }
  };

  const groupCount = useMemo(() => new Set(objects.map(o => o.mogaGroup)).size, [objects]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-2 sticky top-0 z-20">
        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => navigate("/")} title="Back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Network className="w-5 h-5 text-violet-600" />
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-bold text-slate-800 truncate">Moga Merge to One Map</h1>
          <p className="text-[10px] text-slate-500" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>موجے کو ایک نقشے میں ملائیں</p>
        </div>
        <Button variant="outline" size="sm" disabled={!objects.length} onClick={() => navigate("/geo-map")} className="gap-1.5">
          <Eye className="w-3.5 h-3.5" /> Geo Map
        </Button>
      </header>

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Controls panel */}
        <aside className="md:w-80 md:max-h-[calc(100vh-49px)] md:overflow-y-auto bg-white border-b md:border-b-0 md:border-r border-slate-200 p-3 space-y-3">
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">گاؤں / Village</label>
            <select value={village} onChange={e => { setVillage(e.target.value); setSelected(new Set()); setObjects([]); }}
              className="w-full h-8 text-xs rounded-md border border-slate-200 bg-slate-50 px-2 text-slate-700">
              <option value="">— منتخب کریں —</option>
              {villages.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {village && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                  Mogas ({villageMogas.length}) · {selectedSet.size} selected
                </span>
                <button onClick={toggleAll} className="flex items-center gap-1 text-[10px] font-bold text-violet-600 hover:text-violet-700">
                  {allSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  {allSelected ? "سب ہٹائیں" : "سب چنیں"}
                </button>
              </div>
              <div className="space-y-1 max-h-48 md:max-h-72 overflow-y-auto pr-1">
                {villageMogas.map(m => {
                  const isSel = selectedSet.has(m.id);
                  return (
                    <button key={m.id} onClick={() => toggle(m.id)}
                      className={`w-full flex items-center gap-2 border rounded-lg px-2.5 py-1.5 text-left transition-colors ${isSel ? "bg-violet-50 border-violet-300" : "bg-slate-50 border-slate-200 hover:bg-slate-100"}`}>
                      {isSel ? <CheckSquare className="w-4 h-4 text-violet-600 shrink-0" /> : <Square className="w-4 h-4 text-slate-300 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-700 truncate">{m.title || "Untitled"}</p>
                        <p className="text-[10px] text-slate-400">موگہ {m.moga_number || "—"}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">{m.total_parcels || 0}</span>
                    </button>
                  );
                })}
                {!villageMogas.length && (
                  <p className="text-xs text-slate-400 text-center py-3" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
                    اس گاؤں کا کوئی موگہ نقشہ نہیں ملا۔
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button size="sm" onClick={handleBuild} disabled={busy || !selectedSet.size} className="bg-violet-600 hover:bg-violet-500 text-white gap-1.5">
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  {objects.length ? "دوبارہ مرج" : "مرج کریں"}
                </Button>
                <Button size="sm" variant="outline" onClick={handleAutoFit} disabled={!objects.length} className="gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5" /> Auto Fit
                </Button>
              </div>
            </>
          )}

          {objects.length > 0 && (
            <>
              <div className="border-t border-slate-200 pt-3 space-y-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">نقشہ کا نام</label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} dir="auto"
                    className="h-8 text-xs bg-slate-50 border-slate-200" />
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                  <Layers className="w-3 h-3" /> {groupCount} mogas · {objects.length} objects
                </div>
                <Button size="sm" onClick={handleSave} disabled={busy} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5">
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  محفوظ کریں
                </Button>
              </div>
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-2.5">
                <p className="text-[10px] text-violet-700 leading-relaxed" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
                  ہر موگہ ایک لےئر کی طرح ہے — پورا موگہ ایک ساتھ move ہوتا ہے، سنگل آبجیکٹ الگ نہیں ہو سکتا۔ گریڈ لائنز خود بہ خود ایک دوسرے کے ساتھ align رہتی ہیں۔
                </p>
              </div>
            </>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-600" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>{error}</p>
            </div>
          )}
          {isLoading && (
            <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-violet-500" /></div>
          )}
        </aside>

        {/* Canvas */}
        <main className="flex-1 min-h-[420px] md:min-h-0 relative">
          {objects.length ? (
            <MogaMergeCanvas
              objects={objects}
              selectedGroup={selectedGroup}
              onSelectGroup={setSelectedGroup}
              onCommitMove={handleCommitMove}
              fitSignal={fitSignal}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-[#0f1923]">
              <Network className="w-12 h-12 text-violet-400/40 mb-3" />
              <p className="text-sm text-slate-400" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
                گاؤں منتخب کریں، موگہ جات چنیں، پھر "مرج کریں" دبائیں
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Select a village → choose mogas → Merge</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}