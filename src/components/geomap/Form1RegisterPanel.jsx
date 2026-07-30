import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { sqMetersToUnits, polygonAreaSqMeters } from "@/lib/geoOverlay";
import { X, Plus, Trash2, Download, Save, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

const CROPS = ["Wheat", "Gram", "Fodder", "Mustard", "Rice", "Sugarcane", "Cotton", "Maize", "Other"];

export default function Form1RegisterPanel({ open, onClose, mapData, objects, overlay, selectedMoga }) {
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState(null);

  const [info, setInfo] = useState({
    village: "", tehsil: "", district: "", mouza: "",
    channel: "", outlet_rd: "", side: "", sub_division: "", division: "", circle: "", zone: "",
  });

  // Outlet for this moga (for side / RD defaults)
  const outlet = useMemo(
    () => objects.find(o => o.type === "outlet" && String(o.mogha_number) === String(selectedMoga)),
    [objects, selectedMoga]
  );

  // Pre-fill header info from the map editor header line (tehsil/district/mouza/etc.)
  useEffect(() => {
    if (!mapData) return;
    setInfo({
      village: mapData.village || "",
      tehsil: mapData.tehsil || "",
      district: mapData.district || "",
      mouza: mapData.village || "",
      channel: mapData.rajbah || "",
      outlet_rd: outlet?.mogha_number ? String(outlet.mogha_number) : (mapData.moga_number || ""),
      side: outlet?.mogha_side || mapData.mogha_side || "",
      sub_division: mapData.zilladar_section || mapData.section || "",
      division: mapData.district || "",
      circle: "",
      zone: "",
    });
  }, [mapData, outlet]);

  // Load existing register for this map + moga
  const { data: existing } = useQuery({
    queryKey: ["form1-register", mapData?.id, selectedMoga],
    queryFn: () => base44.entities.Form1Register.filter({ map_id: mapData.id }),
    enabled: !!mapData?.id && open,
  });

  const matching = useMemo(
    () => (existing || []).find(r => String(r.moga_number) === String(selectedMoga)),
    [existing, selectedMoga]
  );

  useEffect(() => {
    if (!open) return;
    if (matching) {
      setExistingId(matching.id);
      try { setRows(JSON.parse(matching.rows_json || "[]")); } catch { setRows([]); }
      setInfo(prev => ({
        ...prev,
        village: matching.village || prev.village,
        tehsil: matching.tehsil || prev.tehsil,
        district: matching.district || prev.district,
        mouza: matching.mouza || prev.mouza,
        channel: matching.channel_name || prev.channel,
        outlet_rd: matching.outlet_rd || prev.outlet_rd,
        side: matching.outlet_side || prev.side,
      }));
    } else {
      setExistingId(null);
      setRows([]);
    }
  }, [matching, open]);

  // Available mustateel/muraba patches for this moga, with computed area
  const parcels = useMemo(() => {
    if (!overlay?.transform || !objects.length) return [];
    return objects
      .filter(o => (o.type === "mustateel" || o.type === "muraba")
        && (!selectedMoga || !o.mogaNumber || String(o.mogaNumber) === String(selectedMoga)))
      .map(o => {
        const corners = [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h]];
        const latlngs = corners.map(([cx, cy]) => overlay.transform.transform(cx, cy));
        const u = sqMetersToUnits(polygonAreaSqMeters(latlngs));
        const acres = u.acres;
        const totalK = acres * 8;
        const kanal = Math.floor(totalK);
        const marla = Math.round((totalK - kanal) * 20);
        return { obj: o, id: o.id, label: o.label || "—", type: o.type, acres, kanal, marla, ownerName: o.ownerName || "" };
      });
  }, [objects, overlay, selectedMoga]);

  const addedIds = useMemo(() => new Set(rows.map(r => r.parcelId)), [rows]);

  const addParcel = (p) => {
    if (addedIds.has(p.id)) return;
    const row = {
      id: `f1_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      parcelId: p.id, parcelType: p.type,
      sr_no: rows.length + 1,
      khasra_number: p.label,
      mustateel_no: p.label,
      occupier_name: p.ownerName, occupier_father: "",
      owner_name: p.ownerName, owner_father: "",
      phone: "", cnic: "",
      khata_no: "", crop_name: "", land_type: "CCA",
      kanal: p.kanal, marla: p.marla, acres: p.acres,
      channel_nme: info.channel, outlet_rd: info.outlet_rd, side: info.side,
      rate1: "Half",
      village: info.village, mouza: info.mouza, tehsil: info.tehsil, district: info.district,
      sub_division: info.sub_division, division: info.division, circle: info.circle, zone: info.zone,
    };
    setRows(prev => [...prev, row]);
  };

  const addAll = () => parcels.forEach(p => { if (!addedIds.has(p.id)) addParcel(p); });

  const updateRow = (id, field, value) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeRow = (id) => {
    setRows(prev => prev.filter(r => r.id !== id).map((r, i) => ({ ...r, sr_no: i + 1 })));
  };

  const totals = useMemo(() => {
    const acres = rows.reduce((s, r) => s + (r.acres || 0), 0);
    return { acres, kanal: acres * 8 };
  }, [rows]);

  const handleSave = async () => {
    if (!mapData?.id) { toast.error("No map selected"); return; }
    setSaving(true);
    const payload = {
      map_id: mapData.id, map_title: mapData.title || "", moga_number: selectedMoga || "",
      village: info.village, tehsil: info.tehsil, district: info.district, mouza: info.mouza,
      channel_name: info.channel, outlet_rd: info.outlet_rd, outlet_side: info.side,
      rows_json: JSON.stringify(rows), total_acres: +totals.acres.toFixed(3), total_kanal: +totals.kanal.toFixed(2),
      status: "draft",
    };
    try {
      if (existingId) {
        await base44.entities.Form1Register.update(existingId, payload);
      } else {
        const r = await base44.entities.Form1Register.create(payload);
        if (r?.id) setExistingId(r.id);
      }
      toast.success("Form 1 register saved");
    } catch (e) {
      toast.error("Save failed: " + (e.message || "unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handlePrintPDF = () => {
    if (rows.length === 0) { toast.error("Add patches first"); return; }
    const cols = [
      ["Sr", r => r.sr_no],
      ["Occupier Name", r => esc(r.occupier_name)],
      ["Father", r => esc(r.occupier_father)],
      ["Owner Name", r => esc(r.owner_name)],
      ["Father", r => esc(r.owner_father)],
      ["Phone", r => esc(r.phone)],
      ["CNIC", r => esc(r.cnic)],
      ["Khata No", r => esc(r.khata_no)],
      ["Khasra No", r => esc(r.khasra_number)],
      ["Mustateel", r => esc(r.mustateel_no)],
      ["Crop", r => esc(r.crop_name)],
      ["Land Type", r => esc(r.land_type)],
      ["Kanal", r => r.kanal],
      ["Marla", r => r.marla],
      ["Acres", r => (r.acres || 0).toFixed(3)],
      ["Channel", r => esc(r.channel_nme)],
      ["Outlet RD", r => esc(r.outlet_rd)],
      ["Side", r => esc(r.side)],
      ["Rate", r => esc(r.rate1)],
      ["Village", r => esc(r.village)],
      ["Mouza", r => esc(r.mouza)],
      ["Tehsil", r => esc(r.tehsil)],
      ["District", r => esc(r.district)],
      ["Sub Div", r => esc(r.sub_division)],
      ["Division", r => esc(r.division)],
      ["Circle", r => esc(r.circle)],
      ["Zone", r => esc(r.zone)],
    ];
    const head = cols.map(c => `<th>${c[0]}</th>`).join("");
    const body = rows.map(r => `<tr>${cols.map(c => `<td>${c[1](r)}</td>`).join("")}</tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Form 1 Register</title>
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      body { font-family: 'Inter', Arial, sans-serif; color:#1e293b; }
      h1 { font-size:16px; text-align:center; margin:0 0 2px; }
      h2 { font-size:12px; text-align:center; margin:0 0 6px; font-weight:600; }
      .meta { font-size:10px; text-align:center; margin-bottom:8px; color:#475569; }
      table { width:100%; border-collapse:collapse; font-size:8px; }
      th, td { border:1px solid #94a3b8; padding:2px 3px; white-space:nowrap; }
      th { background:#1e3a5f; color:#fff; font-weight:700; }
      tr:nth-child(even) td { background:#f1f5f9; }
      .totals { margin-top:8px; font-size:11px; font-weight:bold; text-align:right; }
      .foot { margin-top:18px; display:flex; justify-content:space-between; font-size:10px; }
    </style></head><body>
    <h1>FORM 1 REGISTER (Girdawari)</h1>
    <h2>${esc(mapData?.title || "")}${selectedMoga ? ` — Moga ${esc(selectedMoga)}` : ""}</h2>
    <div class="meta">Village: ${esc(info.village)} | Mouza: ${esc(info.mouza)} | Tehsil: ${esc(info.tehsil)} | District: ${esc(info.district)} | Channel: ${esc(info.channel)} | Side: ${esc(info.side)} | Outlet RD: ${esc(info.outlet_rd)}</div>
    <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
    <div class="totals">Total Area: ${totals.acres.toFixed(3)} Acres &nbsp;|&nbsp; ${totals.kanal.toFixed(2)} Kanal</div>
    <div class="foot"><span>Girdawar _______________</span><span>Patwari _______________</span><span>Zilladar _______________</span></div>
    </body></html>`;
    const win = window.open("", "_blank");
    if (!win) { toast.error("Allow pop-ups to download PDF"); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 600);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1100] bg-black/60 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 bg-gradient-to-r from-amber-600 to-amber-700 text-white shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-bold tracking-wide">Form 1 Register — Girdawari</span>
            <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full">Moga {selectedMoga || "—"}</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/20">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Map info (from header line) */}
        <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 shrink-0">
          {[
            ["Village", "village"], ["Mouza", "mouza"], ["Tehsil", "tehsil"], ["District", "district"],
            ["Channel", "channel"], ["Outlet RD", "outlet_rd"], ["Side", "side"],
          ].map(([label, key]) => (
            <div key={key}>
              <label className="text-[9px] font-bold text-slate-500 uppercase block">{label}</label>
              <input
                value={info[key] || ""}
                onChange={(e) => setInfo(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-full h-7 text-xs px-1.5 border border-slate-200 rounded"
              />
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="px-4 py-2 border-b border-slate-200 flex items-center gap-3 shrink-0">
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg px-4 py-1.5">
            <div className="text-[9px] font-bold text-amber-700 uppercase">Total Acres</div>
            <div className="text-lg font-bold text-amber-800">{totals.acres.toFixed(3)}</div>
          </div>
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg px-4 py-1.5">
            <div className="text-[9px] font-bold text-blue-700 uppercase">Total Kanal</div>
            <div className="text-lg font-bold text-blue-800">{totals.kanal.toFixed(2)}</div>
          </div>
          <div className="text-xs text-slate-500">{rows.length} patch{rows.length !== 1 ? "es" : ""} selected</div>
        </div>

        {/* Body: parcels list + register table */}
        <div className="flex-1 flex overflow-hidden">
          {/* Available patches */}
          <div className="w-56 shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col">
            <div className="px-3 py-2 flex items-center justify-between border-b border-slate-200">
              <span className="text-[10px] font-bold text-slate-600 uppercase">Patches (Mustateel/Muraba)</span>
              <button onClick={addAll} className="text-[9px] text-amber-700 font-bold hover:underline">Add all</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {parcels.length === 0 && <p className="text-[10px] text-slate-400 p-3">Place the map overlay & select a moga first.</p>}
              {parcels.map(p => (
                <button
                  key={p.id}
                  onClick={() => addParcel(p)}
                  disabled={addedIds.has(p.id)}
                  className={`w-full text-left px-3 py-1.5 border-b border-slate-100 transition-all ${addedIds.has(p.id) ? "opacity-40 cursor-default" : "hover:bg-amber-50"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">{p.label}</span>
                    <span className="text-[9px] px-1.5 rounded bg-slate-200 text-slate-600 uppercase">{p.type === "mustateel" ? "Must" : "Murb"}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">{p.kanal} kanal {p.marla} marla · {p.acres.toFixed(3)} ac</div>
                </button>
              ))}
            </div>
          </div>

          {/* Register table */}
          <div className="flex-1 overflow-auto">
            {rows.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Click patches on the left to build the register.
              </div>
            ) : (
              <table className="w-full text-[10px] border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-800 text-white">
                    <th className="px-1 py-1 border border-slate-300 sticky left-0 bg-slate-800">#</th>
                    {["Occupier", "Father", "Owner", "Father", "Phone", "CNIC", "Khata", "Khasra", "Must", "Crop", "Type", "K", "M", "Acres", "Rate", ""].map(h => (
                      <th key={h} className="px-1 py-1 border border-slate-300 whitespace-nowrap min-w-[60px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="even:bg-slate-50">
                      <td className="px-1 py-0.5 border border-slate-200 text-center font-bold sticky left-0 bg-inherit">{r.sr_no}</td>
                      <td><CellInput value={r.occupier_name} onChange={v => updateRow(r.id, "occupier_name", v)} /></td>
                      <td><CellInput value={r.occupier_father} onChange={v => updateRow(r.id, "occupier_father", v)} /></td>
                      <td><CellInput value={r.owner_name} onChange={v => updateRow(r.id, "owner_name", v)} /></td>
                      <td><CellInput value={r.owner_father} onChange={v => updateRow(r.id, "owner_father", v)} /></td>
                      <td><CellInput value={r.phone} onChange={v => updateRow(r.id, "phone", v)} placeholder="03xx" /></td>
                      <td><CellInput value={r.cnic} onChange={v => updateRow(r.id, "cnic", v)} placeholder="xxxxx-xxxxxxx-x" /></td>
                      <td><CellInput value={r.khata_no} onChange={v => updateRow(r.id, "khata_no", v)} /></td>
                      <td className="px-1 py-0.5 border border-slate-200 text-center font-mono bg-amber-50">{r.khasra_number}</td>
                      <td className="px-1 py-0.5 border border-slate-200 text-center font-mono bg-amber-50">{r.mustateel_no}</td>
                      <td>
                        <select value={r.crop_name} onChange={e => updateRow(r.id, "crop_name", e.target.value)} className="w-full h-6 text-[10px] px-0.5 border-0 bg-transparent">
                          <option value="">—</option>
                          {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td>
                        <select value={r.land_type} onChange={e => updateRow(r.id, "land_type", e.target.value)} className="w-full h-6 text-[10px] px-0.5 border-0 bg-transparent">
                          <option value="CCA">CCA</option>
                          <option value="GCA">GCA</option>
                        </select>
                      </td>
                      <td className="px-1 py-0.5 border border-slate-200 text-center font-mono">{r.kanal}</td>
                      <td className="px-1 py-0.5 border border-slate-200 text-center font-mono">{r.marla}</td>
                      <td className="px-1 py-0.5 border border-slate-200 text-center font-mono font-bold text-amber-700">{r.acres.toFixed(3)}</td>
                      <td>
                        <select value={r.rate1} onChange={e => updateRow(r.id, "rate1", e.target.value)} className="w-full h-6 text-[10px] px-0.5 border-0 bg-transparent">
                          <option>Half</option><option>Full</option><option>Quarter</option>
                        </select>
                      </td>
                      <td className="px-1 py-0.5 border border-slate-200 text-center">
                        <button onClick={() => removeRow(r.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 h-12 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
          <button onClick={handlePrintPDF} className="h-8 px-4 rounded-lg bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-red-700">
            <Download className="w-3.5 h-3.5" /> Download PDF
          </button>
          <button onClick={handleSave} disabled={saving} className="h-8 px-4 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-700 disabled:opacity-60">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

function CellInput({ value, onChange, placeholder }) {
  return (
    <input
      value={value || ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-6 text-[10px] px-1 border-0 bg-transparent focus:bg-amber-50 focus:outline-none rounded"
    />
  );
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}