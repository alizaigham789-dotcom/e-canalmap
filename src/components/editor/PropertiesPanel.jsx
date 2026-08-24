import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { X, Trash2, User, ArrowUpDown, Palette, Grid3x3, Lock, ChevronDown, ChevronUp, Calculator, Ban, MousePointerClick, RotateCcw } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { calculateChakbandiGCA, acresToAcreKanalMarla } from "@/lib/gisEngine";
import AcreUseControl from "@/components/editor/AcreUseControl";

const FILL_STYLES = ["solid", "diagonal", "crosshatch", "dots", "horizontal", "vertical"];
const KILLA_STROKE_STYLES = ["solid", "dashed", "dotted"];

export default function PropertiesPanel({ selectedObj, allObjects = [], onUpdate, onDelete, onClose, deleteVertexMode = false, onToggleDeleteVertexMode = null, onUpdateAllMustateels = null, onResetAllMustateels = null }) {
  const [local, setLocal] = useState({});
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    if (selectedObj) {
      setLocal({ ...selectedObj });
      setCollapsed(true); // auto-collapse on new selection so it doesn't block drawing
    }
  }, [selectedObj?.id]);

  if (!selectedObj) return null;

  const commit = (key, val) => {
    const next = { ...local, [key]: val };
    setLocal(next);
    onUpdate(selectedObj.id, { [key]: val });
  };

  // Commit multiple fields at once — used for CCA/GCA where centerLabel depends on both
  const commitMultiple = (changes) => {
    const next = { ...local, ...changes };
    setLocal(next);
    onUpdate(selectedObj.id, changes);
  };

  const typeLabel = {
    acre: "Acre Block", mustateel: "Mustateel Parcel", muraba: "Muraba Block",
    canal: "Canal", chakbandi: "Chakbandi Line", outlet: "Outlet / Moga",
    khal: "Watercourse", road: "Road", mouza: "Mouza Boundary",
    bridge: "Bridge (پل)", damageMarker: "Canal Damage Marker",
  }[selectedObj.type] || selectedObj.type;

  const typeColor = {
    acre: "text-amber-600", mustateel: "text-red-600", muraba: "text-red-700",
    canal: "text-blue-600", chakbandi: "text-green-600", outlet: "text-cyan-600",
    khal: "text-blue-500", road: "text-amber-500", mouza: "text-slate-700",
    bridge: "text-red-500", damageMarker: "text-red-600",
  }[selectedObj.type] || "text-slate-500";

  return (
    <div className="w-56 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
      {/* Header — always visible, click to toggle expand */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-slate-50 cursor-pointer select-none"
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {collapsed
            ? <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            : <ChevronUp className="w-3 h-3 text-slate-400 shrink-0" />
          }
          <span className={`text-[11px] font-bold font-heading tracking-wider uppercase truncate ${typeColor}`}>{typeLabel}</span>
        </div>
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {["canal", "khal", "road", "bridge", "chakbandi", "mouza"].includes(selectedObj.type) && onToggleDeleteVertexMode && (
            <Button variant="ghost" size="icon"
              className={`w-6 h-6 ${deleteVertexMode ? "bg-red-600 text-white hover:bg-red-500" : "text-red-400 hover:text-red-600 hover:bg-red-50"}`}
              onClick={() => onToggleDeleteVertexMode()}
              title="Delete Vertex Mode — click nodes on the map to remove them">
              <MousePointerClick className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="w-6 h-6 text-red-400 hover:text-red-600 hover:bg-red-50"
            onClick={() => onDelete(selectedObj.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="w-6 h-6 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Body — only visible when expanded */}
      {!collapsed && (
        <div className="p-3 space-y-3 max-h-[420px] overflow-y-auto border-t border-slate-200">
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Object ID</label>
            <p className="text-[10px] font-mono text-slate-400 truncate">{selectedObj.id}</p>
          </div>

          {selectedObj.type === "damageMarker" && (
            <>
              <Separator className="bg-slate-100" />
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs font-semibold text-red-700">{local.damage_category}</p>
                <p className="text-[10px] text-red-500 mt-0.5">Severity: <span className="font-bold">{local.severity}</span></p>
                {local.description && <p className="text-[10px] text-slate-500 mt-1">{local.description}</p>}
                {local.responsible_person && <p className="text-[10px] text-slate-500">Resp: {local.responsible_person}</p>}
                {local.date && <p className="text-[10px] text-slate-400 font-mono">{new Date(local.date).toLocaleDateString()}</p>}
              </div>
              <p className="text-[9px] text-blue-500">Double-click marker on map to edit details</p>
            </>
          )}

          {selectedObj.type === "acre" && (
            <>
              <Separator className="bg-slate-100" />
              <Field label="Label" value={local.label || ""} onChange={v => commit("label", v)} placeholder="Optional label" />
              <ExclusionToggle local={local} commit={commit} />
              <FillStyleControl local={local} commit={commit} />
              <div className="text-[10px] text-slate-400 font-mono">220 ft × 198 ft</div>
            </>
          )}

          {selectedObj.type === "mustateel" && (
            <>
              <Separator className="bg-slate-100" />
              <Field label="Label / Survey No." value={local.label || ""} onChange={v => commit("label", v)} placeholder="e.g. 1" hint="Double-click plot on map to edit label at centroid" />
              <Field label="Label 2 (below Mouza line)" value={local.label2 || ""} onChange={v => commit("label2", v)} placeholder="e.g. 1-A" hint="Shown only when a Mouza boundary splits this parcel into 2 mouzas" />
              <Field label="Owner Name" value={local.ownerName || ""} onChange={v => commit("ownerName", v)} placeholder="Owner name" icon={<User className="w-3 h-3" />} />
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-600">Show Owner</label>
                <Switch checked={!!local.showOwner} onCheckedChange={v => commit("showOwner", v)} className="scale-75" />
              </div>
              <ExclusionToggle local={local} commit={commit} />
              <MustateelStyleControl local={local} onApplyAll={onUpdateAllMustateels} onResetAll={onResetAllMustateels} />
              <AcreUseControl local={local} commit={commit} />
              {(() => {
                const hasMustateelFill = !!(local.fillColor && local.fillColor.trim() && local.fillColor.startsWith("#")) || (local.acreUses && local.acreUses.some(u => u && u.color));
                return hasMustateelFill ? (
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-600">Show Acre Numbers</label>
                    <Switch checked={local.showKillaWhenFilled !== false} onCheckedChange={v => commit("showKillaWhenFilled", v)} className="scale-75" />
                  </div>
                ) : null;
              })()}
              <div className="text-[10px] text-slate-400 font-mono">440 ft × 990 ft • 10 Killas</div>
            </>
          )}

          {selectedObj.type === "muraba" && (
            <>
              <Separator className="bg-slate-100" />
              <Field label="Muraba No." value={local.label || ""} onChange={v => commit("label", v)} placeholder="e.g. 1" hint="Double-click plot on map to edit label at centroid" />
              <Field label="Label 2 (below Mouza line)" value={local.label2 || ""} onChange={v => commit("label2", v)} placeholder="e.g. 1-A" hint="Shown only when a Mouza boundary splits this parcel into 2 mouzas" />
              <Field label="Owner Name" value={local.ownerName || ""} onChange={v => commit("ownerName", v)} placeholder="Owner name" icon={<User className="w-3 h-3" />} />
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-600">Show Owner</label>
                <Switch checked={!!local.showOwner} onCheckedChange={v => commit("showOwner", v)} className="scale-75" />
              </div>
              <ExclusionToggle local={local} commit={commit} />
              <SpacingControl label="Boundary Thickness" value={local.boundaryThickness || 5} min={1} max={10} step={1} onChange={v => commit("boundaryThickness", v)} />
              <FillControl local={local} commit={commit} />
              <div className="text-[10px] text-slate-400 font-mono">1100 ft × 990 ft • 25 Killas</div>
            </>
          )}

          {selectedObj.type === "canal" && (
            <>
              <Separator className="bg-slate-100" />
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Canal Name <span className="text-blue-400 normal-case font-normal" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>اردو سپورٹ</span></label>
                <Input value={local.name || ""} onChange={e => commit("name", e.target.value)} dir="auto" placeholder="e.g. Nurpur Distry / نور پور" className="h-7 text-xs bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-300 focus:border-blue-500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Canal Style</label>
                <div className="flex gap-1">
                  <button onClick={() => commit("canalStyle", "flat")} className={`flex-1 px-2 py-1 text-[10px] rounded border font-medium transition-colors ${(local.canalStyle || "flat") !== "3d" ? "bg-blue-600 text-white border-blue-500" : "bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300"}`}>Flat</button>
                  <button onClick={() => commit("canalStyle", "3d")} className={`flex-1 px-2 py-1 text-[10px] rounded border font-medium transition-colors ${local.canalStyle === "3d" ? "bg-blue-600 text-white border-blue-500" : "bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300"}`}>3D Ribbon</button>
                </div>
              </div>
              <CanalWidthControl name={local.name || ""} value={local.width || 10} onChange={v => commit("width", v)} />
              <div className="text-[10px] text-blue-600 font-mono">Two parallel lines • {selectedObj.points?.length || 0} points</div>
              <p className="text-[9px] text-slate-400">Double-click any anchor point to delete it (remove extra points)</p>
            </>
          )}

          {selectedObj.type === "khal" && (
            <>
              <Separator className="bg-slate-100" />
              <Field label="Watercourse Name" value={local.name || ""} onChange={v => commit("name", v)} placeholder="e.g. Watercourse 1" />
              <KhalWidthControl value={local.width ?? 11} onChange={v => commit("width", v)} />
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Fill Colour</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={local.fillColor || "#3b82f6"}
                    onChange={e => commit("fillColor", e.target.value)}
                    className="h-6 w-8 rounded cursor-pointer border border-slate-200" />
                  <span className="text-xs text-slate-600">Water fill colour</span>
                  {local.fillColor && (
                    <button onClick={() => commit("fillColor", "")} className="text-[9px] text-slate-400 hover:text-red-500 ml-auto">Reset</button>
                  )}
                </div>
              </div>
              <div className="text-[10px] text-blue-600 font-mono">Two parallel lines • {selectedObj.points?.length || 0} points</div>
            </>
          )}

          {selectedObj.type === "road" && (
            <>
              <Separator className="bg-slate-100" />
              <Field label="Road Name" value={local.name || ""} onChange={v => commit("name", v)} placeholder="e.g. Main Road" />
              <SpacingControl label="Road Width" value={local.width || 28} min={4} max={150} step={2} onChange={v => commit("width", v)} unit="ft" />
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Asphalt Colour</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={local.fillColor || "#1a1a1a"}
                    onChange={e => commit("fillColor", e.target.value)}
                    className="h-6 w-8 rounded cursor-pointer border border-slate-200" />
                  <span className="text-xs text-slate-600">Road fill</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Side Line Colour</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={local.edgeColor || "#fbbf24"}
                    onChange={e => commit("edgeColor", e.target.value)}
                    className="h-6 w-8 rounded cursor-pointer border border-slate-200" />
                  <span className="text-xs text-slate-600">Boundary lines</span>
                </div>
              </div>
              <SpacingControl label="Side Line Width" value={local.edgeWidth || 2} min={1} max={10} step={1} onChange={v => commit("edgeWidth", v)} unit="ft" />
              <div className="text-[10px] text-amber-600 font-mono">Black fill • Yellow sides • White center • {selectedObj.points?.length || 0} points</div>
            </>
          )}

          {selectedObj.type === "bridge" && (
            <>
              <Separator className="bg-slate-100" />
              <Field label="Bridge Name" value={local.name || ""} onChange={v => commit("name", v)} placeholder="e.g. Bridge 1" />
              <SpacingControl label="Ladder Width" value={local.width || 28} min={8} max={80} step={2} onChange={v => commit("width", v)} unit="ft" />
              <SpacingControl label="Rung Spacing" value={local.rungSpacing || 20} min={8} max={60} step={2} onChange={v => commit("rungSpacing", v)} unit="ft" />
              <div className="text-[10px] text-red-600 font-mono">Red dotted ladder • {selectedObj.points?.length || 0} points</div>
            </>
          )}

          {selectedObj.type === "chakbandi" && (
            <>
              <Separator className="bg-slate-100" />
              <div className="p-2 bg-green-50 border border-green-200 rounded-lg space-y-2">
                <div className="flex items-center gap-1">
                  <Calculator className="w-3 h-3 text-green-600" />
                  <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">CCA / GCA (Acres)</span>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-slate-600">CCA = GCA</label>
                  <Switch checked={!!local.ccaEqualsGca} onCheckedChange={v => {
                    if (v) {
                      const gca = local.gca ?? "";
                      commitMultiple({ ccaEqualsGca: true, cca: gca, centerLabel: gca ? `(${gca}/${gca})` : "" });
                    } else {
                      commitMultiple({ ccaEqualsGca: false });
                    }
                  }} className="scale-75" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-400 uppercase">CCA</label>
                    <Input type="number" disabled={!!local.ccaEqualsGca} value={local.cca ?? ""} onChange={e => {
                      let v = e.target.value;
                      const gca = local.gca ?? "";
                      // CCA (upper term) can never exceed GCA (lower term) — equal is allowed
                      if (v !== "" && gca !== "" && parseFloat(v) > parseFloat(gca)) v = gca;
                      commitMultiple({ cca: v, centerLabel: v || gca ? `(${v}/${gca})` : "" });
                    }} placeholder="auto" className="h-7 text-xs font-mono bg-white border-green-200 text-green-800 focus:border-green-500 disabled:opacity-50" />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 uppercase">GCA</label>
                    <Input type="number" value={local.gca ?? ""} onChange={e => {
                      const v = e.target.value;
                      let cca = local.ccaEqualsGca ? v : (local.cca ?? "");
                      // If GCA drops below CCA, cap CCA down to GCA (upper ≤ lower)
                      if (!local.ccaEqualsGca && cca !== "" && v !== "" && parseFloat(cca) > parseFloat(v)) cca = v;
                      commitMultiple(local.ccaEqualsGca
                        ? { gca: v, cca: v, centerLabel: v ? `(${v}/${v})` : "" }
                        : { gca: v, cca, centerLabel: cca || v ? `(${cca}/${v})` : "" });
                    }} placeholder="auto" className="h-7 text-xs font-mono bg-white border-green-200 text-green-800 focus:border-green-500" />
                  </div>
                </div>
                <Button size="sm" variant="outline" className="w-full h-6 text-[10px] border-green-300 text-green-700 hover:bg-green-100"
                  onClick={() => {
                    const parcels = allObjects.filter(o => ["acre", "mustateel", "muraba"].includes(o.type));
                    const canals = allObjects.filter(o => o.type === "canal");
                    const gca = calculateChakbandiGCA(selectedObj, parcels, canals);
                    const cappedCca = local.ccaEqualsGca ? gca : Math.min(parseFloat(local.cca) || gca, gca);
                    commitMultiple(local.ccaEqualsGca
                      ? { cca: String(gca), gca: String(gca), centerLabel: `(${gca}/${gca})` }
                      : { gca: String(gca), cca: String(cappedCca), centerLabel: `(${cappedCca}/${gca})` });
                  }}>
                  <Calculator className="w-3 h-3 mr-1" /> Auto Calculate
                </Button>
                <p className="text-[9px] text-green-600">Counts partial mustateels inside boundary; canal-crossed parcels count half. Each mustateel = 10 acres.</p>
                {(() => {
                  const parcels = allObjects.filter(o => ["acre", "mustateel", "muraba"].includes(o.type));
                  const canals = allObjects.filter(o => o.type === "canal");
                  const gca = calculateChakbandiGCA(selectedObj, parcels, canals);
                  const { acres, kanal, marla } = acresToAcreKanalMarla(gca);
                  return (
                    <div className="mt-1 p-2 bg-white border border-green-300 rounded-lg">
                      <div className="text-[9px] text-green-700 font-bold uppercase tracking-wider mb-1">Chakbandi Area</div>
                      <div className="grid grid-cols-3 gap-1 text-center">
                        <div className="bg-green-50 rounded px-1 py-0.5">
                          <div className="text-[8px] text-green-600" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>ایکڑ</div>
                          <div className="text-xs font-bold text-green-800 font-mono">{acres}</div>
                        </div>
                        <div className="bg-green-50 rounded px-1 py-0.5">
                          <div className="text-[8px] text-green-600" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>کنال</div>
                          <div className="text-xs font-bold text-green-800 font-mono">{kanal}</div>
                        </div>
                        <div className="bg-green-50 rounded px-1 py-0.5">
                          <div className="text-[8px] text-green-600" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>مرلہ</div>
                          <div className="text-xs font-bold text-green-800 font-mono">{marla}</div>
                        </div>
                      </div>
                      <div className="text-[8px] text-green-500 mt-1 text-center font-mono">1 مرلہ = 272.25 sq ft</div>
                    </div>
                  );
                })()}
              </div>
              <SpacingControl label="Line Thickness" value={local.lineThickness || 6} min={1} max={10} step={1} onChange={v => commit("lineThickness", v)} />
              <div className="flex items-center justify-between mt-2">
                <label className="text-xs text-slate-600">Cross Pattern (× × ×)</label>
                <Switch checked={!!local.crossPattern} onCheckedChange={v => commit("crossPattern", v)} className="scale-75" />
              </div>
              {local.crossPattern && (
                <>
                  <SpacingControl label="Cross Size" value={local.crossSize || 3} min={1} max={10} step={1} onChange={v => commit("crossSize", v)} />
                  <SpacingControl label="Cross Spacing" value={local.crossSpacing || 2} min={1} max={10} step={1} onChange={v => commit("crossSpacing", v)} />
                </>
              )}
              <p className="text-[9px] text-slate-400">Sizes here apply identically in Print Preview & Export</p>
              <div className="text-[10px] text-green-600 font-mono">{local.crossPattern ? "Cross pattern" : "Solid line"} • {selectedObj.points?.length || 0} points</div>
            </>
          )}

          {selectedObj.type === "mouza" && (
            <>
              <Separator className="bg-slate-100" />
              <Field label="Mouza Name 1 (Side 1)" value={local.label1 || local.name || ""} onChange={v => commit("label1", v)} placeholder="موضع 1" hint="Shown on one side of the boundary line" />
              <Field label="Mouza Name 2 (Side 2)" value={local.label2 || ""} onChange={v => commit("label2", v)} placeholder="موضع 2" hint="Shown on the other side of the boundary line" />
              <div className="text-[10px] text-slate-600 font-mono">Dotted boundary • {selectedObj.points?.length || 0} points</div>
            </>
          )}

          {selectedObj.type === "outlet" && (
            <>
              <Separator className="bg-slate-100" />
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Moga Colour</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={local.outletColor || "#06b6d4"}
                    onChange={e => commit("outletColor", e.target.value)}
                    className="h-6 w-8 rounded cursor-pointer border border-slate-200" />
                  <span className="text-xs text-slate-600">Block &amp; arrow colour</span>
                </div>
              </div>
              <Field label="Mogha Name (موگہ نام)" value={local.mogha_name || ""} onChange={v => commit("mogha_name", v)} placeholder="e.g. Mogha Ali" />
              {/* Moga CCA / GCA editable */}
              <div className="p-2 bg-cyan-50 border border-cyan-200 rounded-lg space-y-2">
                <div className="flex items-center gap-1">
                  <Calculator className="w-3 h-3 text-cyan-600" />
                  <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider">Moga CCA / GCA</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-400 uppercase">CCA</label>
                    <Input type="number" value={local.cca ?? ""} onChange={e => commit("cca", e.target.value)} placeholder="enter" className="h-7 text-xs font-mono bg-white border-cyan-200 text-cyan-800 focus:border-cyan-500" />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 uppercase">GCA</label>
                    <Input type="number" value={local.gca ?? ""} onChange={e => commit("gca", e.target.value)} placeholder="enter" className="h-7 text-xs font-mono bg-white border-cyan-200 text-cyan-800 focus:border-cyan-500" />
                  </div>
                </div>
                <p className="text-[9px] text-cyan-600">Enter this moga's CCA/GCA manually.</p>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Mogha Number (موگہ نمبری)</label>
                <div className="flex gap-2">
                  <Input type="number" value={local.mogha_number || ""} onChange={e => commit("mogha_number", e.target.value)}
                    placeholder="e.g. 18500"
                    className="h-7 flex-1 text-xs bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-300 focus:border-blue-500 font-mono" />
                  <Select value={local.mogha_side || ""} onValueChange={v => commit("mogha_side", v)}>
                    <SelectTrigger className="h-7 w-16 text-xs bg-slate-50 border-slate-200">
                      <SelectValue placeholder="L/R" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">L</SelectItem>
                      <SelectItem value="R">R</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(local.mogha_number || local.mogha_side) && (
                  <div className="mt-1 px-2 py-1 bg-cyan-50 border border-cyan-200 rounded text-[10px] font-mono text-cyan-700">
                    {[local.mogha_number, local.mogha_side].filter(Boolean).join("/")}
                  </div>
                )}
              </div>
              <SpacingControl label="Block Size" value={local.blockSize || 20} min={8} max={80} step={2} onChange={v => commit("blockSize", v)} unit="ft" />
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Moga Size / Arrow</label>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-6 w-6 p-0 text-xs border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    onClick={() => commit("arrowScale", Math.max(0, +((local.arrowScale ?? 1) - 0.1).toFixed(1)))}>−</Button>
                  <input type="range" min={0} max={2} step={0.1} value={local.arrowScale ?? 1}
                    onChange={e => commit("arrowScale", parseFloat(e.target.value))}
                    className="flex-1 h-1 accent-cyan-500 cursor-pointer" />
                  <Button size="sm" variant="outline" className="h-6 w-6 p-0 text-xs border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    onClick={() => commit("arrowScale", Math.min(2, +((local.arrowScale ?? 1) + 0.1).toFixed(1)))}>+</Button>
                  <span className="text-xs text-slate-600 font-mono w-10 text-center">{(local.arrowScale ?? 1).toFixed(1)}×</span>
                </div>
              </div>
              <OutletLengthControl local={local} commit={commit} />
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                <ArrowUpDown className="w-3 h-3" /> Block at start → arrow to end
              </div>
            </>
          )}

          {selectedObj.x !== undefined && (
            <>
              <Separator className="bg-slate-100" />
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Position (ft)</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400">X</label>
                  <p className="text-xs font-mono text-slate-600">{Math.round(selectedObj.x)}</p>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Y</label>
                  <p className="text-xs font-mono text-slate-600">{Math.round(selectedObj.y)}</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, icon, hint }) {
  return (
    <div>
      <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}
        <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className={`h-7 text-xs bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-300 focus:border-blue-500 ${icon ? "pl-6" : ""}`} />
      </div>
      {hint && <p className="text-[9px] text-blue-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function SpacingControl({ label, value, min, max, step, onChange, unit }) {
  return (
    <div>
      <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="h-6 w-6 p-0 text-xs border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
          onClick={() => onChange(Math.max(min, value - step))}>−</Button>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseInt(e.target.value, 10))}
          className="flex-1 h-1 accent-blue-500 cursor-pointer" />
        <Button size="sm" variant="outline" className="h-6 w-6 p-0 text-xs border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
          onClick={() => onChange(Math.min(max, value + step))}>+</Button>
        <span className="text-xs text-slate-600 font-mono w-10 text-center">{value}{unit}</span>
      </div>
    </div>
  );
}

// Watercourse (khal) width — continuous range 3–15 ft (default 11 ft)
function KhalWidthControl({ value, onChange }) {
  const min = 3, max = 15;
  const clamped = Math.min(max, Math.max(min, value || 11));
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] text-slate-400 uppercase tracking-wider">Width (ft)</label>
        <span className="text-[9px] text-blue-500 font-medium">Watercourse · 3–15 ft</span>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="h-6 w-6 p-0 text-xs border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
          onClick={() => onChange(Math.max(min, +(clamped - 0.5).toFixed(1)))}>−</Button>
        <input type="range" min={min} max={max} step={0.5} value={clamped}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="flex-1 h-1 accent-blue-500 cursor-pointer" />
        <Button size="sm" variant="outline" className="h-6 w-6 p-0 text-xs border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
          onClick={() => onChange(Math.min(max, +(clamped + 0.5).toFixed(1)))}>+</Button>
        <span className="text-xs text-slate-600 font-mono w-10 text-center">{clamped}ft</span>
      </div>
    </div>
  );
}

// Canal width — continuous range 3–150 ft (default 100 ft)
function CanalWidthControl({ name, value, onChange }) {
  const min = 3, max = 150;
  const clamped = Math.min(max, Math.max(min, value || 100));
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] text-slate-400 uppercase tracking-wider">Width (ft)</label>
        <span className="text-[9px] text-blue-500 font-medium">Canal · 3–150 ft</span>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="h-6 w-6 p-0 text-xs border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
          onClick={() => onChange(Math.max(min, clamped - 1))}>−</Button>
        <input type="range" min={min} max={max} step={1} value={clamped}
          onChange={e => onChange(parseInt(e.target.value, 10))}
          className="flex-1 h-1 accent-blue-500 cursor-pointer" />
        <Button size="sm" variant="outline" className="h-6 w-6 p-0 text-xs border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
          onClick={() => onChange(Math.min(max, clamped + 1))}>+</Button>
        <span className="text-xs text-slate-600 font-mono w-10 text-center">{clamped}ft</span>
      </div>
      <p className="text-[9px] text-slate-400 mt-0.5">3 سے 150 فٹ تک (ڈیفالٹ 100)</p>
    </div>
  );
}

function ExclusionToggle({ local, commit }) {
  const isParcel = local.type === "mustateel" || local.type === "muraba";
  const exclusionColor = local.exclusionColor || "#000000";
  const exclusionSpacing = local.exclusionSpacing || 60;
  return (
    <div className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] text-slate-600 flex items-center gap-1" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>
          <Ban className="w-3 h-3 text-slate-500" /> چکبندی سے اخراج
        </label>
        <Switch checked={!!local.excluded} onCheckedChange={v => commit("excluded", v)} className="scale-75" />
      </div>
      {local.excluded && (
        <div className="flex items-center gap-2 border-t border-slate-200 pt-2">
          <label className="text-[9px] text-slate-400 shrink-0">Fill</label>
          <input type="color" value={exclusionColor}
            onChange={e => commit("exclusionColor", e.target.value)}
            className="h-5 w-7 rounded cursor-pointer border border-slate-200" />
          <label className="text-[9px] text-slate-400 shrink-0">Spacing</label>
          <input type="range" min={8} max={60} step={2} value={exclusionSpacing}
            onChange={e => commit("exclusionSpacing", parseInt(e.target.value))}
            className="flex-1 h-1 accent-blue-500 cursor-pointer" />
          <span className="text-[9px] font-mono text-slate-500 w-6">{exclusionSpacing}</span>
        </div>
      )}
      {isParcel && local.excluded && <KillaExclusionCheckboxes local={local} commit={commit} />}
    </div>
  );
}

function KillaExclusionCheckboxes({ local, commit }) {
  // Default: all killas ticked (chakbandi ikhraj = all included)
  const isMustateel = local.type === "mustateel";
  const totalKillas = isMustateel ? 10 : 25;
  const acres = local.excludedAcres || Array(totalKillas).fill(true);
  const toggle = (idx) => {
    const next = Array.from(acres);
    next[idx] = !next[idx];
    commit("excludedAcres", next);
  };
  return (
    <div className="border-t border-slate-200 pt-2 mt-1">
      <label className="text-[9px] text-slate-400 uppercase tracking-wider block mb-1">Killa Ikhraj (1–{totalKillas})</label>
      <div className="grid grid-cols-5 gap-1">
        {Array.from({ length: totalKillas }, (_, i) => (
          <label key={i} className="flex items-center gap-1 text-[9px] text-slate-600 cursor-pointer select-none">
            <input type="checkbox" checked={!!acres[i]} onChange={() => toggle(i)} className="w-2.5 h-2.5 accent-blue-600 cursor-pointer" />
            <span>{i + 1}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function FillStyleControl({ local, commit }) {
  return (
    <div>
      <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
        <Palette className="w-3 h-3" /> Fill Pattern
      </label>
      <div className="flex flex-wrap gap-1 mb-2">
        {FILL_STYLES.map(fs => (
          <button key={fs} onClick={() => commit("fillStyle", fs)}
            className={`px-2 py-0.5 text-[9px] rounded border font-medium transition-colors ${
              (local.fillStyle || "solid") === fs
                ? "bg-blue-600 text-white border-blue-500"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300"
            }`}>
            {fs}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <label className="text-[9px] text-slate-400 shrink-0">Color</label>
        <input type="color" value={local.fillColor?.startsWith("rgba") ? "#ef4444" : (local.fillColor || "#ef4444")}
          onChange={e => commit("fillColor", e.target.value)}
          className="h-5 w-8 rounded cursor-pointer border border-slate-200" />
        <label className="text-[9px] text-slate-400 shrink-0">Opacity</label>
        <input type="range" min={0} max={1} step={0.05} value={local.fillOpacity || 0.35}
          onChange={e => commit("fillOpacity", parseFloat(e.target.value))}
          className="flex-1 h-1 accent-blue-500 cursor-pointer" />
        <span className="text-[9px] font-mono text-slate-500 w-6">{Math.round((local.fillOpacity || 0.35) * 100)}%</span>
      </div>
      {local.fillStyle !== "solid" && local.fillStyle && (
        <div className="flex items-center gap-2 mt-1">
          <label className="text-[9px] text-slate-400 shrink-0">Spacing</label>
          <input type="range" min={4} max={24} step={2} value={local.fillSpacing || 8}
            onChange={e => commit("fillSpacing", parseInt(e.target.value))}
            className="flex-1 h-1 accent-blue-500 cursor-pointer" />
          <span className="text-[9px] font-mono text-slate-500 w-6">{local.fillSpacing || 8}px</span>
        </div>
      )}
    </div>
  );
}

function KillaStyleControl({ local, commit }) {
  const ks = local.killaStyle || {};
  const updateKs = (key, val) => commit("killaStyle", { ...ks, [key]: val });

  return (
    <div>
      <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
        <Grid3x3 className="w-3 h-3" /> Killa Grid Style
      </label>
      <div className="space-y-2 pl-1 border-l-2 border-slate-100">
        <div className="flex items-center gap-2">
          <label className="text-[9px] text-slate-400 w-12 shrink-0">Stroke</label>
          <Select value={ks.strokeStyle || "solid"} onValueChange={v => updateKs("strokeStyle", v)}>
            <SelectTrigger className="h-5 text-[9px] flex-1 border-slate-200"><SelectValue /></SelectTrigger>
            <SelectContent>
              {KILLA_STROKE_STYLES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <input type="color" value={ks.strokeColor || "#ef4444"}
            onChange={e => updateKs("strokeColor", e.target.value)}
            className="h-5 w-7 rounded cursor-pointer border border-slate-200" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[9px] text-slate-400 w-12 shrink-0">Width</label>
          <input type="range" min={0.5} max={5} step={0.5} value={ks.strokeWidth || 1}
            onChange={e => updateKs("strokeWidth", parseFloat(e.target.value))}
            className="flex-1 h-1 accent-blue-500 cursor-pointer" />
          <span className="text-[9px] font-mono text-slate-500 w-6">{ks.strokeWidth || 1}px</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[9px] text-slate-400 w-12 shrink-0">Opacity</label>
          <input type="range" min={0} max={1} step={0.05} value={ks.strokeOpacity !== undefined ? ks.strokeOpacity : 0.15}
            onChange={e => updateKs("strokeOpacity", parseFloat(e.target.value))}
            className="flex-1 h-1 accent-blue-500 cursor-pointer" />
          <span className="text-[9px] font-mono text-slate-500 w-6">{Math.round((ks.strokeOpacity !== undefined ? ks.strokeOpacity : 0.15) * 100)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[9px] text-slate-400 w-12 shrink-0">Label</label>
          <input type="color" value={ks.labelColor?.startsWith("rgba") ? "#dc2626" : (ks.labelColor || "#dc2626")}
            onChange={e => updateKs("labelColor", e.target.value)}
            className="h-5 w-7 rounded cursor-pointer border border-slate-200" />
          <span className="text-[9px] text-slate-400">Killa number color</span>
        </div>
      </div>
    </div>
  );
}

// Combined Mustateel Style — applies boundary thickness + fill colour/opacity
// to ALL mustateels at once (not per-mustateel). Includes a Reset button.
function MustateelStyleControl({ local, onApplyAll, onResetAll }) {
  const hexColor = (c) => (c && c.startsWith("#")) ? c : "#ef4444";
  if (!onApplyAll) return null;
  return (
    <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Mustateel Style (All)</span>
        {onResetAll && (
          <Button size="sm" variant="outline" className="h-5 px-2 text-[9px] border-blue-300 text-blue-700 hover:bg-blue-100"
            onClick={onResetAll}>
            <RotateCcw className="w-3 h-3 mr-1" /> Reset
          </Button>
        )}
      </div>
      <p className="text-[9px] text-blue-500">Changes apply to ALL mustateels</p>
      <SpacingControl label="Boundary Thickness" value={local.boundaryThickness || 5} min={1} max={10} step={1} onChange={v => onApplyAll({ boundaryThickness: v })} />
      <div className="flex items-center gap-2">
        <label className="text-[9px] text-slate-400 shrink-0">Fill</label>
        <input type="color" value={hexColor(local.fillColor)}
          onChange={e => onApplyAll({ fillColor: e.target.value })}
          className="h-5 w-8 rounded cursor-pointer border border-slate-200" />
        <label className="text-[9px] text-slate-400 shrink-0">Opacity</label>
        <input type="range" min={0} max={1} step={0.05} value={local.fillOpacity ?? 0.10}
          onChange={e => onApplyAll({ fillOpacity: parseFloat(e.target.value) })}
          className="flex-1 h-1 accent-blue-500 cursor-pointer" />
        <span className="text-[9px] font-mono text-slate-500 w-6">{Math.round((local.fillOpacity ?? 0.10) * 100)}%</span>
      </div>
    </div>
  );
}

// Colour Fill — solid colour with opacity (per-parcel)
function FillControl({ local, commit }) {
  const hexColor = (c) => (c && c.startsWith("#")) ? c : "#ef4444";
  return (
    <div>
      <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
        <Palette className="w-3 h-3" /> Colour Fill
      </label>
      <div className="flex items-center gap-2 mb-2">
        <input type="color" value={hexColor(local.fillColor)}
          onChange={e => commit("fillColor", e.target.value)}
          className="h-5 w-8 rounded cursor-pointer border border-slate-200" />
        <label className="text-[9px] text-slate-400 shrink-0">Opacity</label>
        <input type="range" min={0} max={1} step={0.05} value={local.fillOpacity ?? 0.10}
          onChange={e => commit("fillOpacity", parseFloat(e.target.value))}
          className="flex-1 h-1 accent-blue-500 cursor-pointer" />
        <span className="text-[9px] font-mono text-slate-500 w-6">{Math.round((local.fillOpacity ?? 0.10) * 100)}%</span>
      </div>
    </div>
  );
}

// Outlet / Moga length — sets the shaft length (start→end distance) without
// changing the direction. Lets the user decide the moga length directly.
function OutletLengthControl({ local, commit }) {
  if (!local?.start || !local?.end) return null;
  const len = Math.round(Math.hypot(local.end.x - local.start.x, local.end.y - local.start.y));
  const setLen = (newLen) => {
    const cur = Math.hypot(local.end.x - local.start.x, local.end.y - local.start.y);
    const dir = cur > 0
      ? { x: (local.end.x - local.start.x) / cur, y: (local.end.y - local.start.y) / cur }
      : { x: 1, y: 0 };
    commit("end", { x: local.start.x + dir.x * newLen, y: local.start.y + dir.y * newLen });
  };
  return (
    <SpacingControl label="Outlet Length" value={Math.max(10, len)} min={10} max={2000} step={10} onChange={setLen} unit="ft" />
  );
}