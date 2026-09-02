import React, { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MogaSearchSelect from "@/components/warabandi/MogaSearchSelect";

const URDU = "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif";

// Edit the header line of an EXISTING Fard Masrooba record (mogha, rajbah, two
// mouzas, section, tehsil, district). Mirrors FardHeaderDialog but loads the
// record's current values and saves via updateMut instead of creating.
export default function FardHeaderEditDialog({ open, record, onClose, onSave }) {
  const [h, setH] = useState({});
  const mapRef = useRef(null);

  useEffect(() => {
    if (open && record) {
      setH({
        mogha_number: record.mogha_number || "",
        mogha_side: record.mogha_side || "R",
        rajbah: record.rajbah || "",
        village: record.village || "",
        village2: record.village2 || "",
        section: record.section || "",
        tehsil: record.tehsil || "",
        district: record.district || "",
        map_id: record.map_id || "",
      });
    }
  }, [open, record]);

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

  const save = () => {
    if (!h.mogha_number) return;
    onSave({ ...h });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: URDU }}>ہیڈر لائن ایڈٹ — فرد مسروبہ</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-slate-500">موگہ نمبری (Moga)</Label>
            <MogaSearchSelect
              value={h.mogha_number}
              sideValue={h.mogha_side}
              onSelect={handleMoga}
              onTextChange={(v) => set("mogha_number", v)}
              placeholder="موجودہ موگہ تلاش کریں یا تبدیل کریں"
            />
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
          <Button onClick={save} className="text-xs" disabled={!h.mogha_number}>محفوظ کریں</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}