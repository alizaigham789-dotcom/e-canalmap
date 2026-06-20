import React, { useState } from "react";
import { FormWrapper, FormField, FormSection } from "./FormBase";

export default function Form2_Parwana() {
  const [f, setF] = useState({
    number: "", date: "", section: "", robakar: "",
    moqaIrvi: "", mauza: "", rajbah: "", supAlEngineer: "",
    tarNbri: "", morzah: "", waqtMorzah: "",
    taoanKaysMindarga: "", muqam: "", waqt: "",
    dastKhat: "", sectionSign: "",
  });
  const s = (k) => (v) => setF(p => ({ ...p, [k]: v }));

  return (
    <FormWrapper title="پروانہ پٹواری ملکہ" titleEn="Form 2 — Parwana Patwari Mulqa">
      <FormSection className="mb-4">
        <div className="flex gap-6">
          <FormField label="نمبر:۔" value={f.number} onChange={s("number")} width="flex-1" />
          <FormField label="تاریخ:۔" value={f.date} onChange={s("date")} width="flex-1" />
        </div>
      </FormSection>

      <FormSection className="mb-5 space-y-3">
        <div className="flex gap-2 items-end" style={{ direction: "rtl" }}>
          <span className="text-sm text-slate-700 shrink-0 font-medium" style={{ fontFamily: "serif" }}>از دفتر:۔ ملہدار صاحب سیکشن</span>
          <input type="text" value={f.section} onChange={e => setF(p => ({ ...p, section: e.target.value }))}
            className="flex-1 bg-transparent border-b-2 border-slate-300 focus:border-blue-500 outline-none text-slate-900 text-sm px-1"
            style={{ direction: "rtl", fontFamily: "serif" }} />
          <span className="text-sm text-slate-700 shrink-0">سب ڈویژن جوہرآباد۔</span>
        </div>
        <FormField label="روبکار بنام:۔ پٹواری ملقہ" value={f.robakar} onChange={s("robakar")} />
        <div className="flex gap-3 flex-wrap" style={{ direction: "rtl" }}>
          <FormField label="موقع نمبر اربعی" value={f.moqaIrvi} onChange={s("moqaIrvi")} width="flex-1" />
          <FormField label="مونع" value={f.mauza} onChange={s("mauza")} width="flex-1" />
          <FormField label="راجباہ" value={f.rajbah} onChange={s("rajbah")} width="flex-1" />
          <FormField label="بحوالہ سب انجینئر" value={f.supAlEngineer} onChange={s("supAlEngineer")} width="flex-1" />
        </div>
        <div className="flex gap-3" style={{ direction: "rtl" }}>
          <FormField label="تار نمبری" value={f.tarNbri} onChange={s("tarNbri")} width="flex-1" />
          <FormField label="موژرہ" value={f.morzah} onChange={s("morzah")} width="flex-1" />
          <FormField label="وقت موژرہ" value={f.waqtMorzah} onChange={s("waqtMorzah")} width="flex-1" />
        </div>
        <FormField label="تاوان کیس زیر دفعہ 140 پنجاب ایریکیشن ایکٹ 2023" value={f.taoanKaysMindarga} onChange={s("taoanKaysMindarga")} />
        <div className="flex gap-3" style={{ direction: "rtl" }}>
          <FormField label="بمقام" value={f.muqam} onChange={s("muqam")} width="flex-1" />
          <FormField label="بوقت" value={f.waqt} onChange={s("waqt")} width="flex-1" />
        </div>
      </FormSection>

      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-5 text-sm leading-7 text-slate-700" style={{ direction: "rtl", fontFamily: "serif" }}>
        <p>لہٰذا آپ جملہ معلقین کو تاریخ و مقام مقررہ وقت پر پابند کریں۔ عدم حاضری کی صورت میں یکطرفہ کارروائی غائبانہ عمل میں لائی جائے گی۔ اور بعد ازاں کوئی عذر قابل قبول نہ ہوگا۔</p>
      </div>

      <p className="text-center text-sm text-slate-500 mb-6" style={{ fontFamily: "serif" }}>بعدازتعمیل پروانہ واپس کریں۔</p>

      <div className="grid grid-cols-2 gap-6 mt-4">
        <div className="border-t-2 border-slate-200 pt-3">
          <FormField label="دستخط ملہدار:۔" value={f.dastKhat} onChange={s("dastKhat")} />
        </div>
        <div className="border-t-2 border-slate-200 pt-3">
          <FormField label="سیکشن:۔" value={f.sectionSign} onChange={s("sectionSign")} />
        </div>
      </div>
    </FormWrapper>
  );
}