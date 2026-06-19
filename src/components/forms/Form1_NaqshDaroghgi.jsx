import React, { useState } from "react";
import { FormWrapper, FormField, FormSection } from "./FormBase";

export default function Form1_NaqshDaroghgi() {
  const [f, setF] = useState({
    number: "", date: "",
    mukhatabSection: "", naam: "",
    bimqadmah: "", moqaIrvi: "",
    rajbah: "", naamNaqshi: "",
    motarrifah: "",
    dastKhatMilhdar: "", section: "",
  });
  const s = (k) => (v) => setF(p => ({ ...p, [k]: v }));

  return (
    <FormWrapper title="نقش داروغہ گنی" titleEn="Form 1 — Naqsh Daroghgi (Notice Daroga)">
      {/* Number & Date */}
      <FormSection className="mb-4">
        <div className="flex gap-6">
          <FormField label="نمبر:۔" value={f.number} onChange={s("number")} width="flex-1" />
          <FormField label="تاریخ:۔" value={f.date} onChange={s("date")} width="flex-1" />
        </div>
      </FormSection>

      <FormSection className="mb-5 space-y-3">
        <FormField label="مخاطب:۔ دفتر ملہداری سیکشن:۔" value={f.mukhatabSection} onChange={s("mukhatabSection")} />
        <FormField label="بنام:۔" value={f.naam} onChange={s("naam")} />
        <FormField label="بمقدمہ:۔ داروغہ گنی پردرخواست:۔" value={f.bimqadmah} onChange={s("bimqadmah")} />
        <FormField label="موقع اربعی نمبر:۔" value={f.moqaIrvi} onChange={s("moqaIrvi")} />
        <FormField label="راجباہ:۔" value={f.rajbah} onChange={s("rajbah")} />
        <FormField label="بنام نقشی:۔" value={f.naamNaqshi} onChange={s("naamNaqshi")} />
      </FormSection>

      {/* Body text */}
      <div className="bg-slate-800/50 rounded-xl p-4 mb-5 text-sm leading-7 text-slate-300" style={{ direction: "rtl", fontFamily: "serif" }}>
        <p>
          تلمی ہے کہ سائل اسائلان نے درخواست گزارنی ہے کہ فریق دوم مذکورہ بالا نے ان کا منظور شدہ پانی روک کران کی تنتلی کا ہے۔ ان کے خلاف قانونی کارروائی
          عمل میں لائی جائے۔ آپ کو اس ضمن میں ہدایت کی جاتی ہے کہ آپ موقعہ پر جا کر ناجائز آپاجی کا اندراج کریں اور دولوں فریقین کو مطلع کریں کہ وہ
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span>موژرفہ:</span>
          <FormField label="" value={f.motarrifah} onChange={s("motarrifah")} />
          <span>کو بمقام دفتر ملہداری میں مقرر وقت پر پابند کریں۔</span>
        </div>
        <p className="mt-2">عدم حاضری کی صورت میں ایک طرفہ کارروائی غائبانہ عمل میں لائی جائے گی۔ اور بعد ازاں کوئی مقدر قابل قبول نہ ہوگا۔</p>
      </div>

      <p className="text-center text-sm text-slate-400 mb-6" style={{ fontFamily: "serif" }}>بعدازتعمیل اصل بذرادا پس کریں۔</p>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-6 mt-4">
        <div className="text-center">
          <div className="border-t border-slate-600 pt-2">
            <FormField label="دستخط ملہدار:۔" value={f.dastKhatMilhdar} onChange={s("dastKhatMilhdar")} />
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-slate-600 pt-2">
            <FormField label="سیکشن:۔" value={f.section} onChange={s("section")} />
          </div>
        </div>
      </div>

      <div className="text-center mt-6 text-sm text-slate-400" style={{ fontFamily: "serif" }}>
        <p>ملہداری سیکشن</p>
        <p>ملہ فوانہ سب ڈویژن جوہرآباد</p>
      </div>
    </FormWrapper>
  );
}