import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Trash2, Map as MapIcon } from "lucide-react";

const URDU = "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif";

export default function SavedMogaPropertiesDialog({ open, mapData, onRemove, onSelect, onClose }) {
  if (!mapData) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-base flex items-center gap-2">
            <MapIcon className="w-4 h-4 text-blue-500" />
            {mapData.title || "—"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2 text-sm" dir="rtl" style={{ fontFamily: URDU }}>
          <Row label="موگہ نمبری" value={mapData.moga_number || "—"} />
          <Row label="موضع" value={mapData.village || "—"} />
          <Row label="راجباہ" value={mapData.rajbah || "—"} />
          <Row label="تحصیل" value={mapData.tehsil || "—"} />
          <Row label="ڈویژن" value={mapData.district || "—"} />
          <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-[11px] font-mono text-slate-700" dir="ltr">
            <MapPin className="w-3 h-3 text-blue-500" />
            {mapData.geo_placement_lat?.toFixed(5)}, {mapData.geo_placement_lng?.toFixed(5)}
          </div>
        </div>
        <DialogFooter className="gap-2 flex-row-reverse">
          <Button variant="ghost" onClick={onClose} className="text-slate-500">بند کریں</Button>
          <Button onClick={() => onSelect(mapData)} variant="outline" className="gap-1.5">
            <MapIcon className="w-3.5 h-3.5" /> نقشہ کھولیں
          </Button>
          <Button onClick={() => onRemove(mapData)} variant="destructive" className="gap-1.5">
            <Trash2 className="w-3.5 h-3.5" /> ہٹائیں
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}