import React, { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MogaSearchSelect from "@/components/warabandi/MogaSearchSelect";

const URDU = "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif";
const EMPTY = { mogha_number: "", mogha_side: "R", rajbah: "", village: "", village2: "", section: "", tehsil: "", district: "", map_id: "" };

// Header form that opens FIRST (like map editor / warabandi parat create flow).
// Moga number is selectable from the maps that exist in the map editor; selecting
// one auto-fills rajbah, village, section, tehsil, district. If the moga is not in
// the backend, the user types it and the khasra column falls back to manual entry.
export default function FardHeaderDialog({ open, onClose, onCreate }) {
  const [h, setH] = useState({ ...EMPTY });
  const mapRef = useRef(null);
  const set = (k, v) => setH((p) => ({ ...p, [k]: v }));

  const handleMoga = (map) => {
    if (!map) return;
    if (map._sideOnly) { set("mogha_side", map.mogha_side); return; }
    mapRef.current = map;
    setH((p) => ({
      ...p,
      mogha_number: String(map.moga_number || ""),
      mogha_side: map.mogha_side || p.mogha_side,
      rajbah: map.rajbah || "",
      village: map.village || "",
      section: map.zilladar_section || map.section || "",
      tehsil: map.tehsil || "",
      district: map.district || "",
      map_id: map.id || "",
    }));
  };

  const create = () => {
    if (!h.mogha_number) return;
    onCreate({ ...h });
    setH({ ...EMPTY });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: URDU }}>نیا فرد مسروبہ — ہیڈر معلومات</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-slate-500">موگہ نمبری (Moga)</Label>
            <MogaSearchSelect
              value={h.mogha_number}
              sideValue={h.mogha_side}
              onSelect={handleMoga}
              onTextChange={(v) => set("mogha_number", v)}
              placeholder="موجودہ موگہ تلاش کریں یا نیا درج کریں"
            />
            <p className="text-[10px] text-slate-400 mt-1" style={{ fontFamily: URDU }}>
              موگہ منتخب کرنے پر باقی معلومات خود بخود بھر جائیں گی۔ اگر میپ ایڈیٹر میں نہیں تو نیا مستطیل کے ساتھ دستی درج کریں۔
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["rajbah", "راجباہ"],
              ["village", "موضع ۱"],
              ["village2", "موضع ۲"],
              ["section", "ضلعداری سیکشن"],
              ["tehsil", "سب ڈویژن"],
              ["district", "کینال ڈویژن"],
            ].map(([k, l]) => (
              <div key={k}>
                <Label className="text-[11px] text-slate-500" style={{ fontFamily: URDU }}>{l}</Label>
                <Input value={h[k] || ""} onChange={(e) => set(k, e.target.value)} dir="auto" className="h-8 text-sm" style={{ fontFamily: URDU }} />
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="text-xs">منسوخ</Button>
          <Button onClick={create} className="text-xs" disabled={!h.mogha_number}>فارم کھولیں</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}