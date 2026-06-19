import React, { useState } from "react";
import { FormWrapper, FormField, FormSection } from "./FormBase";

export default function Form4_Naqshbandi57() {
  const [f, setF] = useState({
    number: "", date: "",
    mukhatabSection: "",
    moqaIrvi: "", rajbah: "",
    babatDarkhwast: "",
    naamNaqshi: "",
    morzah: "",
    dastKhat: "", sectionSign: "",
  });
  const s = (k) => (v) => setF(p => ({ ...p, [k]: v }));

  return (
    <FormWrapper
      title="نوٹس الاعلام یابی اجرا پرانہ بابت دارہ بندی از زیر دفعہ 57 کینال ریونیو ایکٹ 2023ء"
      titleEn="Form 4 — Notice u/s 57 Canal Revenue Act 2023 (Dara Bandi)"
    >
      <FormSection className="mb-4">
        <div className="flex gap-6">
          <FormField label="نمبر:۔" value={f.number} onChange={s("number")} width="flex-1" />
          <FormField label="تاریخ:۔" value={f.date} onChange={s("date")} width="flex-1" />
        </div>
      </FormSection>

      <FormSection className="mb-5 space-y-3">
        <FormField label="مخاطب:۔ دفتر ملہداری سیکشن:۔" value={f.mukhatabSection} onChange={s("mukhatabSection")} />
        <div className="text-sm text-slate-400 pt-1" style={{ direction: "rtl", fontFamily: "serif" }}>
          متزان:۔ پروانہ الاطلاع یابی بنام جملہ حصہ داران موقع
        </div>
        <FormField label="موقع اربعی نمبر:۔" value={f.moqaIrvi} onChange={s("moqaIrvi")} />
        <FormField label="راجباہ:۔" value={f.rajbah} onChange={s("rajbah")} />
        <FormField label="بابت:۔ ترمیم دارہ بندی پردرخواست:۔" value={f.babatDarkhwast} onChange={s("babatDarkhwast")} />
        <FormField label="بنام نقشی:۔" value={f.naamNaqshi} onChange={s("naamNaqshi")} />
      </FormSection>

      <div className="bg-slate-800/50 rounded-xl p-4 mb-5 text-sm leading-7 text-slate-300" style={{ direction: "rtl", fontFamily: "serif" }}>
        <p>
          تلمی ہے کہ سائل اسائلان نے درخواست گزاری ہے کہ زیر دفعہ 57 کینال کے تحت ان کی دارہ بندی میں ترمیم کی جائے۔ آپ کو اس ضمن میں پابندگیا جاتا
          ہے کہ رتنزرزگرہ و جملہ حصہ داران موقع کو اطلاعیابی کروائیں کہ وہ موقع موژرہ
        </p>
        <div className="flex items-center gap-2 my-2">
          <FormField label="" value={f.morzah} onChange={s("morzah")} />
          <span>کو دفتر بذا ملہداری میں حاضر ہوں تا کہ درخواست پر</span>
        </div>
        <p>بیانات وتحقیقات کرتے ہوئے کارروائی مکمل کی جاسکے اور اگر کوئی عذر ہوتو بانی تاخیری پیش کریں۔</p>
        <p className="mt-2">عدم حاضری کی صورت میں یکطرفہ کارروائی عمل میں لائی جائے گی۔</p>
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