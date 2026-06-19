import React, { useState } from "react";
import { FormWrapper, FormField, FormSection } from "./FormBase";

export default function Form5_Naqshbandi47() {
  const [f, setF] = useState({
    number: "", date: "",
    sectionFrom: "",
    unwanBrKhilaf: "",
    babatMasari: "",
    moqaIrvi: "", rajbah: "",
    naamNaqshi: "",
    morzah: "",
    dastKhat: "", sectionSign: "",
  });
  const s = (k) => (v) => setF(p => ({ ...p, [k]: v }));

  return (
    <FormWrapper
      title="نوٹس الاعلام یابی بابت مسارشدہ کمال زیر دفعہ 47 کینال ریونیو ایکٹ 2023ء"
      titleEn="Form 5 — Notice u/s 47 Canal Revenue Act 2023 (Mussarahsuda Kamal)"
    >
      <FormSection className="mb-4">
        <div className="flex gap-6">
          <FormField label="نمبر:۔" value={f.number} onChange={s("number")} width="flex-1" />
          <FormField label="تاریخ:۔" value={f.date} onChange={s("date")} width="flex-1" />
        </div>
      </FormSection>

      <FormSection className="mb-5 space-y-3">
        <FormField label="از دفتر ملہداری سیکشن:۔" value={f.sectionFrom} onChange={s("sectionFrom")} />
        <FormField label="عنوان پروانہ اطلاع یابی بنام برخلاف:۔" value={f.unwanBrKhilaf} onChange={s("unwanBrKhilaf")} />
        <FormField label="بابت مساری کمال پردرخواست:۔" value={f.babatMasari} onChange={s("babatMasari")} />
        <div className="flex gap-4" style={{ direction: "rtl" }}>
          <FormField label="موقع اربعی نمبر:۔" value={f.moqaIrvi} onChange={s("moqaIrvi")} width="flex-1" />
          <FormField label="راجباہ:۔" value={f.rajbah} onChange={s("rajbah")} width="flex-1" />
        </div>
        <FormField label="بنام نقشی:۔" value={f.naamNaqshi} onChange={s("naamNaqshi")} />
      </FormSection>

      <div className="bg-slate-800/50 rounded-xl p-4 mb-5 text-sm leading-7 text-slate-300" style={{ direction: "rtl", fontFamily: "serif" }}>
        <p>
          تلمی ہے کہ سائل اسائلان نے درخواست گزاری ہے کہ ان کاروان کاروان مذکورہ بالا ملفوض اشخاص نے مسار کردیا ہے۔ ان کے وسائل آپ کاجاکر دیے ہیں۔ ان
          کے خلاف قانونی کارروائی عمل میں لاکران کے کمال کو بحال فرمایا جائے۔
        </p>
        <div className="flex items-center gap-2 my-2">
          <span>آپ کو اس ضمن میں پابندگیا جاتا ہے کہ دولوں فریقین کو اطلاعیابی کروائیں کہ وہ موقع موژرہ:</span>
        </div>
        <div className="flex items-center gap-2">
          <FormField label="" value={f.morzah} onChange={s("morzah")} />
          <span>کو دفتر بذا ملہداری میں حاضر ہوں تا کہ درخواست</span>
        </div>
        <p className="mt-2">پر بیانات وتحقیقات کرتے ہوئے کارروائی مکمل کی جاسکے اور اگر کوئی عذر ہو تو بانی تاخیری پیش کریں۔ عدم حاضری کی صورت میں ایک طرفہ کارروائی عمل میں لائی جائے گی۔</p>
      </div>

      <p className="text-center text-sm text-slate-400 mb-6" style={{ fontFamily: "serif" }}>بعدازتعمیل اصل بذرادا پس کریں۔</p>

      <div className="grid grid-cols-2 gap-6 mt-4">
        <FormField label="دستخط ملہدار:۔" value={f.dastKhat} onChange={s("dastKhat")} />
        <FormField label="ملہداری سیکشن:۔" value={f.sectionSign} onChange={s("sectionSign")} />
      </div>

      <div className="text-center mt-6 text-sm text-slate-400" style={{ fontFamily: "serif" }}>
        <p>ملہداری سیکشن</p>
        <p>ملہ فوانہ کینال سب ڈویژن جوہرآباد</p>
      </div>
    </FormWrapper>
  );
}