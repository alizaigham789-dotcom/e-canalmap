import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Info, Waves, MapPin, User } from "lucide-react";
import CollapsibleCard from "./CollapsibleCard";
import DepartmentalSection from "./DepartmentalSection";

const fieldLabel = (en, urdu) => (
  <>
    <span className="font-medium">{en}</span>
    <span className="text-slate-400 ml-1" style={{ fontFamily: "serif" }}>({urdu})</span>
  </>
);

const inputCls = "h-9 text-sm bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-300 focus:border-blue-500";

export default function WarabandiForm({ data, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val });

  const moghaDisplay = [data.mogha_number, data.mogha_side].filter(Boolean).join(" / ");

  return (
    <div className="space-y-4">
      {/* General Information — Departmental heading style */}
      <DepartmentalSection titleUrdu="عمومی معلومات" titleEn="General Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Type of Warabandi (dropdown — replaces Circle Name) */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">{fieldLabel("Type of Warabandi", "وارابندی کی قسم")}</Label>
            <Select value={data.warabandi_type || ""} onValueChange={v => set("warabandi_type", v)}>
              <SelectTrigger className={`${inputCls} justify-start`}>
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="پرت وارہ بندی">پرت وارہ بندی</SelectItem>
                <SelectItem value="ترمیم وارہ بندی">ترمیم وارہ بندی</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Village Name */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">{fieldLabel("Village Name", "گاؤں")}</Label>
            <Input
              value={data.village_name || ""}
              onChange={e => set("village_name", e.target.value)}
              placeholder="Village name"
              className={inputCls}
              style={{ direction: "rtl" }}
            />
          </div>
          {/* Division (renamed from District) */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">{fieldLabel("Division", "ڈویژن")}</Label>
            <Input
              value={data.division || ""}
              onChange={e => set("division", e.target.value)}
              placeholder="Division name"
              className={inputCls}
              style={{ direction: "rtl" }}
            />
          </div>
          {/* Sub Division (renamed from Tehsil) */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">{fieldLabel("Sub Division", "سب ڈویژن")}</Label>
            <Input
              value={data.sub_division || ""}
              onChange={e => set("sub_division", e.target.value)}
              placeholder="Sub Division name"
              className={inputCls}
              style={{ direction: "rtl" }}
            />
          </div>
          {/* Warabandi Date */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">{fieldLabel("Warabandi Date", "تاریخ وارابندی")}</Label>
            <Input
              type="date"
              value={data.warabandi_date || ""}
              onChange={e => set("warabandi_date", e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      </DepartmentalSection>

      {/* Canal Information */}
      <CollapsibleCard title="Canal Information" titleUrdu="نہر معلومات" icon={Waves}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">{fieldLabel("Canal Name", "نہر")}</Label>
            <Input
              value={data.canal_name || ""}
              onChange={e => set("canal_name", e.target.value)}
              placeholder="Canal name"
              className={inputCls}
              style={{ direction: "rtl" }}
            />
          </div>
        </div>
      </CollapsibleCard>

      {/* Moga Information */}
      <CollapsibleCard title="Moga Information" titleUrdu="موگہ معلومات" icon={MapPin}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* موگہ نام — text input */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">{fieldLabel("Mogha Name", "موگہ نام")}</Label>
            <Input
              value={data.mogha_name || ""}
              onChange={e => set("mogha_name", e.target.value)}
              placeholder="Mogha name"
              className={inputCls}
              style={{ direction: "rtl" }}
            />
          </div>
          {/* موگہ نمبری — numeric input + side dropdown */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">{fieldLabel("Mogha Number", "موگہ نمبری")}</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={data.mogha_number || ""}
                onChange={e => set("mogha_number", e.target.value)}
                placeholder="e.g. 18500"
                className={`${inputCls} flex-1`}
              />
              <Select value={data.mogha_side || ""} onValueChange={v => set("mogha_side", v)}>
                <SelectTrigger className={`${inputCls} w-20`}>
                  <SelectValue placeholder="Side" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">L</SelectItem>
                  <SelectItem value="R">R</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Combined display: 18500 / L */}
            {moghaDisplay && (
              <div className="mt-1 px-3 py-1.5 bg-cyan-50 border border-cyan-200 rounded-lg text-xs font-mono text-cyan-700">
                {moghaDisplay}
              </div>
            )}
          </div>
        </div>
      </CollapsibleCard>

      {/* Applicant Information */}
      <CollapsibleCard title="Applicant Information" titleUrdu="درخواست گزار معلومات" icon={User}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">{fieldLabel("Applicant Name", "نام درخواست گزار")}</Label>
            <Input
              value={data.applicant_name || ""}
              onChange={e => set("applicant_name", e.target.value)}
              placeholder="Applicant name"
              className={inputCls}
              style={{ direction: "rtl" }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">{fieldLabel("Father Name", "ولدیت")}</Label>
            <Input
              value={data.applicant_father || ""}
              onChange={e => set("applicant_father", e.target.value)}
              placeholder="Father name"
              className={inputCls}
              style={{ direction: "rtl" }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">{fieldLabel("CNIC", "شناختی کارڈ")}</Label>
            <Input
              value={data.applicant_cnic || ""}
              onChange={e => set("applicant_cnic", e.target.value)}
              placeholder="XXXXX-XXXXXXX-X"
              className={inputCls}
            />
          </div>
        </div>
      </CollapsibleCard>
    </div>
  );
}