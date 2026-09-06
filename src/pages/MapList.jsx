import React, { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Search, Map, Calendar, MapPin, Layers, Trash2, Upload, Download, Pencil, Printer, Check, Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import MapDetailsDialog from "@/components/editor/MapDetailsDialog";
import BulkPrintDialog from "@/components/editor/BulkPrintDialog";
import { buildSVG, getObjectsBounds } from "@/lib/svgMapBuilder";
import { DIMENSIONS, calculateChakbandiGCA, calculateChakbandiLoopGCA, buildPrintFooterHTML } from "@/lib/gisEngine";
import { svgCCAGCAFractionBox, getChakbandiLabelPos, getCCAGCAText, buildLegendSVG } from "@/lib/printRenderHelpers";

const STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-600 border-slate-300",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  review: "bg-purple-50 text-purple-700 border-purple-200",
  approved: "bg-blue-50 text-blue-700 border-blue-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATUS_LABELS = {
  draft: "Draft",
  in_progress: "In Progress",
  review: "Under Review",
  approved: "Approved",
  published: "Published",
};

const PRINT_COLORS = {
  acreStroke: "#eab308",
  acreFill: "rgba(234,179,8,0.08)",
  mustateelStroke: "#ef4444",
  mustateelFill: "rgba(245,158,11,0.10)",
  murabaStroke: "#ef4444",
  murabaFill: "rgba(249,115,22,0.08)",
  canalStroke: "#0284c7",
  canalFill: "rgba(14,165,233,0.35)",
  khalStroke: "#2563eb",
  roadStroke: "#b45309",
  chakbandiStroke: "#22c55e",
  mouzaStroke: "#000000",
  labelColor: "#000000",
  outletStroke: "#06b6d4",
};

export default function MapList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newMap, setNewMap] = useState({ title: "", village: "", district: "", tehsil: "", section: "", zilladar_section: "", rajbah: "", moga_number: "", mogha_side: "" });
  // مواضعات — 2..4 village boxes, joined with "و" into newMap.village
  const [villages, setVillages] = useState(["", ""]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkPrinting, setIsBulkPrinting] = useState(false);
  const [showBulkPrint, setShowBulkPrint] = useState(false);
  const fileInputRef = useRef(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [importing, setImporting] = useState(false);
  const titleTouched = useRef(false);

  // Auto-build the map title from Moga number/side + Rajbah + Village. Stops
  // overwriting once the user manually edits the title field (titleTouched ref).
  const buildAutoTitle = (m) => {
    const parts = [];
    if (m.moga_number) parts.push(`${m.moga_number}${m.mogha_side ? `/${m.mogha_side}` : ""}`);
    if (m.rajbah) parts.push(`راجباہ ${m.rajbah}`);
    if (m.village) {
      const plural = String(m.village).split(/\s+و\s+/).filter(Boolean).length > 1;
      parts.push(`${plural ? "مواضعات" : "موضع"} ${m.village}`);
    }
    return parts.join(" - ");
  };
  const setField = (key, value) => {
    setNewMap(prev => {
      const next = { ...prev, [key]: value };
      if (!titleTouched.current) next.title = buildAutoTitle(next);
      return next;
    });
  };
  const setVillageAt = (i, val) => {
    const next = [...villages]; next[i] = val;
    setVillages(next);
    const joined = next.map(s => s.trim()).filter(Boolean).join(" و ");
    setNewMap(prev => {
      const nm = { ...prev, village: joined };
      if (!titleTouched.current) nm.title = buildAutoTitle(nm);
      return nm;
    });
  };

  // Field labels in English + Urdu. Each label switches to Urdu automatically when
  // the user types Urdu text into that field; otherwise it stays English.
  const FIELD_LABELS = {
    en: { moga: "Moga Number", side: "Side (L/R)", rajbah: "Rajbah / Canal Minor", village: "Village", section: "Section", tehsil: "Sub Division", district: "Canal Division", title: "Map Title *" },
    ur: { moga: "موگہ نمبری", side: "سائیڈ (L/R)", rajbah: "راجباہ", village: "موضع", section: "سیکشن", tehsil: "سب ڈویژن", district: "کینال ڈویژن", title: "نقشہ ٹائٹل *" },
  };
  const isUrduText = (s) => /[\u0600-\u06FF]/.test(s || "");
  const fieldLabel = (key, value) => isUrduText(value) ? FIELD_LABELS.ur[key] : FIELD_LABELS.en[key];

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LandMap.delete(id),
    onSuccess: (_data, deletedId) => {
      // Clear every cache reference to the deleted map so it truly disappears
      // (the list refetch alone can leave a stale ["map", id] entry).
      queryClient.removeQueries({ queryKey: ["map", deletedId] });
      queryClient.removeQueries({ queryKey: ["geomap-map", deletedId] });
      queryClient.invalidateQueries({ queryKey: ["maps"] });
      // Refresh GeoMap's map list so the deleted moga disappears from the
      // overlay and the moga cascade (placedMogas / filterMogas) instantly.
      queryClient.invalidateQueries({ queryKey: ["geomap-maps"] });
      try { sessionStorage.removeItem(`chakbandi_backup_${deletedId}`); } catch {}
      setDeleteTarget(null);
      toast.success("نقشہ حذف ہو گیا");
    },
    onError: (err) => {
      const msg = String(err?.message || err || "");
      const denied = /403|forbidden|permission|unauthor/i.test(msg);
      toast.error(denied ? "حذف کرنے کی اجازت نہیں — صرف ایڈمن یا مالک حذف کر سکتا ہے" : "حذف ناکام — دوبارہ کوشش کریں");
    },
  });

  const handleUploadMap = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onerror = () => { toast.error("Could not read file"); setImporting(false); };
    reader.onload = async (ev) => {
      try {
        let data;
        try { data = JSON.parse(ev.target.result); }
        catch { throw new Error("File is not valid JSON"); }
        const objs = data.objects || data;
        if (!Array.isArray(objs)) throw new Error("File must contain a map objects array");
        if (objs.length === 0) throw new Error("Map file contains no objects");
        const title = data.mapData?.title || file.name.replace(/\.chakbandi\.json$|\.json$/i, "") || "Imported Map";
        const side = data.mapData?.mogha_side || data.mapData?.moghaSide;
        const mapFields = {
          title,
          village: data.mapData?.village || "",
          tehsil: data.mapData?.tehsil || "",
          district: data.mapData?.district || "",
          section: data.mapData?.section || "",
          rajbah: data.mapData?.rajbah || "",
          moga_number: data.mapData?.moga_number || data.mapData?.mogaNumber || "",
          zilladar_section: data.mapData?.zilladar_section || data.mapData?.section || "",
          status: data.mapData?.status || "draft",
          drawing_data: JSON.stringify(objs),
          total_parcels: objs.filter(o => ["mustateel","muraba"].includes(o.type)).length,
        };
        if (side === "L" || side === "R") mapFields.mogha_side = side;
        if (data.viewport) mapFields.viewport = JSON.stringify(data.viewport);
        const created = await base44.entities.LandMap.create(mapFields);
        queryClient.invalidateQueries({ queryKey: ["maps"] });
        toast.success(`Map imported: ${title}`);
        navigate(`/editor?id=${created.id}`);
      } catch (err) {
        toast.error("Import failed: " + (err.message || "unknown error"));
      }
      setImporting(false);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const { data: maps = [], isLoading } = useQuery({
    queryKey: ["maps"],
    queryFn: () => base44.entities.LandMap.list("-created_date", 50),
  });

  // Sub Division + Canal Division names previously entered in existing moga files —
  // shown as dropdown suggestions so users pick instead of re-typing.
  const subDivisions = useMemo(() => [...new Set(maps.map(m => m.tehsil).filter(Boolean))].sort(), [maps]);
  const canalDivisions = useMemo(() => [...new Set(maps.map(m => m.district).filter(Boolean))].sort(), [maps]);
  const rajbahOptions = useMemo(() => [...new Set(maps.map(m => m.rajbah).filter(Boolean))].sort(), [maps]);
  const villageOptions = useMemo(() => [...new Set(maps.map(m => m.village).filter(Boolean))].sort(), [maps]);
  const sectionOptions = useMemo(() => [...new Set(maps.map(m => m.section).filter(Boolean))].sort(), [maps]);

  const updateMapMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LandMap.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maps"] });
      setEditTarget(null);
      toast.success("Map details updated");
    },
    onError: () => toast.error("Update failed"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LandMap.create({ ...data }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["maps"] });
      setShowCreate(false);
      setNewMap({ title: "", village: "", district: "", tehsil: "", section: "", zilladar_section: "", rajbah: "", moga_number: "", mogha_side: "" });
      setVillages(["", ""]);
      toast.success("Map created");
      navigate(`/editor?id=${created.id}`);
    },
  });

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkPrint = async (options = {}) => {
    const selected = maps.filter(m => selectedIds.has(m.id));
    if (selected.length === 0) { toast.warning("Select at least one map"); return; }

    const { pageSize = "A4", orientation = "landscape", bwMode = false, showLegend = true } = options;
    setIsBulkPrinting(true);

    const baseColors = PRINT_COLORS;
    const C = bwMode ? {
      mustateelStroke: "#000000", mustateelFill: "none",
      murabaStroke: "#000000", murabaFill: "none",
      acreStroke: "#555555", acreFill: "none",
      canalStroke: "#333333", canalFill: "rgba(0,0,0,0.08)",
      khalStroke: "#444444", roadStroke: "#222222",
      chakbandiStroke: "#000000", mouzaStroke: "#000000",
      labelColor: "#000000", outletStroke: "#333333",
    } : baseColors;

    let pagesHTML = "";
    let count = 0;

    for (const map of selected) {
      let objects = [];
      try { objects = JSON.parse(map.drawing_data || "[]"); } catch { continue; }
      if (objects.length === 0) continue;

      const svgData = buildSVG(objects, C, null, { mustateel: true, muraba: true });
      if (!svgData) continue;

      const parcels = objects.filter(o => ["acre", "mustateel", "muraba"].includes(o.type));
      const canals = objects.filter(o => o.type === "canal");
      const roads = objects.filter(o => o.type === "road");
      const chakbandis = objects.filter(o => o.type === "chakbandi");
      const lblFont = Math.min(DIMENSIONS.MUSTATEEL.width, DIMENSIONS.MUSTATEEL.height) * 0.30;
      let gcaLabels = "";
      for (const ch of chakbandis) {
        if (ch.points?.length >= 3) {
          const gca = calculateChakbandiLoopGCA(ch, parcels, canals, roads);
          if (gca > 0 || ch.centerLabel) {
            const lp = getChakbandiLabelPos(ch, objects);
            if (!lp) continue;
            const { cca, gca: gcaTxt } = getCCAGCAText(ch, gca);
            if (cca || gcaTxt) {
              gcaLabels += svgCCAGCAFractionBox(cca, gcaTxt, lp.x, lp.y, lblFont, "rgba(255,255,255,0.94)", C.chakbandiStroke || "#166534");
            }
          }
        }
      }

      const bounds = getObjectsBounds(objects);
      const legendSVG = showLegend ? buildLegendSVG(svgData.viewX, svgData.viewY, svgData.viewW, svgData.viewH, C, bounds, null, [], objects) : "";
      const footerHTML = buildPrintFooterHTML(map);

      pagesHTML += `<div class="map-page">
        <div class="map-wrap">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="${svgData.viewX} ${svgData.viewY} ${svgData.viewW} ${svgData.viewH}" preserveAspectRatio="xMidYMid meet" style="max-width:100%;max-height:100%;display:block;">
            <rect x="${svgData.viewX}" y="${svgData.viewY}" width="${svgData.viewW}" height="${svgData.viewH}" fill="white"/>
            ${svgData.svgBody}
            ${gcaLabels}
            ${legendSVG}
          </svg>
        </div>
        ${footerHTML}
      </div>`;
      count++;
    }

    setIsBulkPrinting(false);

    if (count === 0) { toast.error("No printable maps found — selected maps may be empty"); return; }

    const win = window.open("", "_blank");
    if (!win) { toast.error("Popup blocked — allow popups for this site"); return; }
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Bulk Print — ${count} Maps</title>
      <style>
        @font-face { font-family: 'Jameel Noori Nastaleeq'; src: url('https://cdn.jsdelivr.net/gh/tariq-abdullah/urdu-web-font-CDN/JameelNooriNastaleeq.woff') format('woff'); font-display: swap; }
        @page { margin: 6mm; size: ${pageSize} ${orientation}; }
        * { margin:0; padding:0; box-sizing:border-box; }
        html, body { background:#fff; font-family: Rajdhani, Arial, sans-serif; }
        .map-page { width:100%; height:100vh; page-break-after: always; display:flex; flex-direction:column; overflow:hidden; }
        .map-page:last-child { page-break-after: auto; }
        .map-wrap { flex:1; min-height:0; overflow:hidden; display:flex; align-items:center; justify-content:center; }
        @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
      </style>
    </head><body>
      ${pagesHTML}
    </body></html>`);
    win.document.close();
    win.onload = () => { setTimeout(() => win.print(), 500); };
    setSelectedIds(new Set());
    toast.success(`Generating PDF with ${count} map(s)…`);
  };

  const filtered = maps.filter(m =>
    (m.title || "").toLowerCase().includes(search.toLowerCase()) ||
    (m.village || "").toLowerCase().includes(search.toLowerCase()) ||
    (m.district || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-sm font-bold font-heading text-slate-800">Map Editor</h1>
              <p className="text-[9px] text-slate-400 font-mono uppercase tracking-widest">Cadastral Maps</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {selectedIds.size > 0 && (
              <Button onClick={() => setShowBulkPrint(true)} disabled={isBulkPrinting} size="sm" className="bg-green-600 hover:bg-green-500 text-white gap-1.5 text-xs">
                {isBulkPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />} Print PDF ({selectedIds.size})
              </Button>
            )}
            <Button onClick={() => fileInputRef.current?.click()} size="sm" variant="outline" className="text-xs gap-1.5 border-slate-300" disabled={importing}>
              {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Import
            </Button>
            <input ref={fileInputRef} type="file" accept=".json,.chakbandi.json,application/json" onChange={handleUploadMap} className="sr-only" tabIndex={-1} />
            <Button onClick={() => { titleTouched.current = false; setVillages(["", ""]); setShowCreate(true); }} size="sm" className="bg-blue-600 hover:bg-blue-500 text-white gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" /> New
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search maps…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200 text-sm placeholder:text-slate-400 focus:border-blue-500 shadow-sm"
          />
        </div>

        {/* Selection Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3">
            <span className="text-xs text-blue-700 font-medium">{selectedIds.size} map(s) selected</span>
            <div className="flex gap-1.5">
              <Button size="sm" variant="ghost" className="text-xs h-7 text-slate-500" onClick={() => {
                if (selectedIds.size === filtered.length) setSelectedIds(new Set());
                else setSelectedIds(new Set(filtered.map(m => m.id)));
              }}>
                {selectedIds.size === filtered.length ? "Deselect All" : "Select All"}
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-7 text-slate-500" onClick={() => setSelectedIds(new Set())}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Map List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white rounded-xl border border-slate-200 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Map className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm mb-4">
              {maps.length === 0 ? "No maps yet." : "No maps match your search."}
            </p>
            {maps.length === 0 && (
              <Button onClick={() => { titleTouched.current = false; setVillages(["", ""]); setShowCreate(true); }} className="bg-blue-600 hover:bg-blue-500 gap-2">
                <Plus className="w-4 h-4" /> Create Map
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(map => (
              <div key={map.id} className={`bg-white border rounded-xl p-3 hover:border-blue-300 hover:shadow-md transition-all shadow-sm ${selectedIds.has(map.id) ? "border-blue-500 ring-2 ring-blue-200" : "border-slate-200"}`}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleSelect(map.id)}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${selectedIds.has(map.id) ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300 hover:border-blue-400"}`}
                    title="Select for bulk print"
                  >
                    {selectedIds.has(map.id) && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center shrink-0">
                    <Map className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-800 truncate">{map.title || "Untitled Map"}</h3>
                    {(map.village || map.district) && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-500 truncate">{[map.village, map.tehsil, map.district].filter(Boolean).join(", ")}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] text-slate-500">{map.total_parcels || 0} parcels</span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${STATUS_COLORS[map.status || "draft"]}`}>
                        {STATUS_LABELS[map.status || "draft"]}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-2.5">
                  <Link to={`/editor?id=${map.id}`} className="flex-1">
                    <button className="w-full py-1.5 text-[10px] font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors">
                      Map Editor
                    </button>
                  </Link>

                  <button
                    onClick={() => setEditTarget(map)}
                    className="px-2.5 py-1.5 text-[10px] font-semibold rounded-lg bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors"
                    title="Edit Moga details"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(map)}
                    className="px-2.5 py-1.5 text-[10px] font-semibold rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                    title="Delete this map"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">New Cadastral Map</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* 1. Moga Number + Side (top) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{fieldLabel('moga', newMap.moga_number)}</label>
                <Input
                  placeholder="e.g. 13223"
                  value={newMap.moga_number}
                  onChange={e => setField("moga_number", e.target.value)}
                  className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{fieldLabel('side', newMap.mogha_side)}</label>
                <select
                  value={newMap.mogha_side}
                  onChange={e => setField("mogha_side", e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">—</option>
                  <option value="L">L</option>
                  <option value="R">R</option>
                  <option value="T.L">T.L</option>
                  <option value="T.R">T.R</option>
                  <option value="T-F.R">T-F.R</option>
                  <option value="T-F.L">T-F.L</option>
                </select>
              </div>
            </div>
            {/* 2. Rajbah / Canal Minor */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{fieldLabel('rajbah', newMap.rajbah)}</label>
              <Input
                list="rajbah-options"
                placeholder="e.g. Gunjial Distributry"
                value={newMap.rajbah}
                onChange={e => setField("rajbah", e.target.value)}
                className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-blue-500"
              />
              <datalist id="rajbah-options">
                {rajbahOptions.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            {/* 3. Village / مواضعات — 2..4 boxes joined with و */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">
                {villages.filter(v => v.trim()).length > 1 ? "مواضعات" : fieldLabel('village', villages.join(" و "))}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {villages.map((v, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <span className="text-sm font-bold text-slate-700" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>و</span>
                    )}
                    <Input
                      list="village-options"
                      placeholder="Village / Mozah"
                      value={v}
                      onChange={e => setVillageAt(i, e.target.value)}
                      className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 flex-1 min-w-[120px]"
                    />
                  </React.Fragment>
                ))}
                {villages.length < 4 && (
                  <button type="button" onClick={() => setVillages(prev => [...prev, ""])} title="مزید موضع شامل کریں"
                    className="h-9 w-9 shrink-0 border border-dashed border-slate-300 rounded-md text-slate-500 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
              <datalist id="village-options">
                {villageOptions.flatMap(s => String(s).split(/\s+و\s+/)).filter(Boolean).map((s, i) => <option key={i} value={s} />)}
              </datalist>
            </div>
            {/* 4. Section (سیکشن) */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{fieldLabel('section', newMap.section)}</label>
              <Input
                list="section-options"
                placeholder="e.g. Roda"
                value={newMap.section}
                onChange={e => setField("section", e.target.value)}
                className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-blue-500"
              />
              <datalist id="section-options">
                {sectionOptions.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            {/* 5. Sub Division — dropdown from existing moga files */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{fieldLabel('tehsil', newMap.tehsil)}</label>
              <Input
                list="subdiv-options"
                placeholder="e.g. Qaidabad"
                value={newMap.tehsil}
                onChange={e => setField("tehsil", e.target.value)}
                className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-blue-500"
              />
              <datalist id="subdiv-options">
                {subDivisions.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            {/* 5. Canal Division — dropdown from existing moga files (renamed from Division) */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{fieldLabel('district', newMap.district)}</label>
              <Input
                list="canaldiv-options"
                placeholder="e.g. Khushab"
                value={newMap.district}
                onChange={e => setField("district", e.target.value)}
                className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-blue-500"
              />
              <datalist id="canaldiv-options">
                {canalDivisions.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            {/* 6. Map Title — auto-filled from Moga / Rajbah / Village (manual edit stops auto-fill) */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{fieldLabel('title', newMap.title)}</label>
              <Input
                placeholder="Auto-filled from Moga / Rajbah / Village"
                value={newMap.title}
                onChange={e => { titleTouched.current = true; setNewMap(p => ({ ...p, title: e.target.value })); }}
                className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-blue-500"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-slate-500">Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(newMap)}
              disabled={!newMap.title || createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-500 gap-2"
            >
              <Plus className="w-4 h-4" /> Create & Open
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog — Yes / No */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-base text-red-600 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> نقشہ حذف کریں؟
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
            کیا آپ واقعی <b>{deleteTarget?.title || "Untitled Map"}</b> کو مستقل طور پر حذف کرنا چاہتے ہیں؟ یہ واپس نہیں ہو گا۔
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="text-slate-600 gap-1.5">
              نہیں (No)
            </Button>
            <Button
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-500 gap-2"
            >
              <Trash2 className="w-4 h-4" /> {deleteMutation.isPending ? "حذف ہو رہا ہے…" : "ہاں (Yes)"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Map Details Dialog */}
      <MapDetailsDialog
        open={!!editTarget}
        mapData={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={(data) => updateMapMutation.mutate({ id: editTarget.id, data })}
      />

      {/* Bulk Print Dialog */}
      <BulkPrintDialog
        open={showBulkPrint}
        onClose={() => setShowBulkPrint(false)}
        onPrint={async (opts) => {
          setShowBulkPrint(false);
          await handleBulkPrint(opts);
        }}
        selectedCount={selectedIds.size}
      />

      <BottomNav />
    </div>
  );
}