import React, { useState } from "react";
import { FormWrapper, FormField, FormSection } from "./FormBase";

export default function Form6_CanalEngineer() {
  const [f, setF] = useState({
    subDivision: "",
    moqaIrvi: "", rajbah: "", mauza: "",
    subEngineer: "", morzah: "",
    tarNbri: "",
    sdco: "", morzah2: "",
    mulzimAlfarman: "",
    faisalNo: "",
    dastKhat: "", sectionSign: "",
    tarikh: "", halNamber: "",
  });
  const s = (k) => (v) => setF(p => ({ ...p, [k]: v }));

  return (
    <FormWrapper title="رپورٹ کینال انجینئر" titleEn="Form 6 — Canal Engineer Report (Sub-Divisional Canal Officer)">

      <FormSection className="mb-4 space-y-3">
        <div className="flex gap-2 items-end" style={{ direction: "rtl" }}>
          <span className="text-sm text-slate-300 shrink-0" style={{ fontFamily: "serif" }}>بخدمت جناب سب ڈویژنل کینال آفیسر صاحب</span>
          <input type="text" value={f.subDivision} onChange={e => s("subDivision")(e.target.value)}
            className="flex-1 bg-transparent border-b border-slate-600 focus:border-blue-400 outline-none text-white text-sm px-1"
            style={{ direction: "rtl", fontFamily: "serif" }} placeholder="سب ڈویژن" />
        </div>
        <div className="flex gap-3 flex-wrap" style={{ direction: "rtl" }}>
          <FormField label="عنوان:۔ تاوان کیس بابت" value={f.moqaIrvi} onChange={s("moqaIrvi")} width="flex-1" />
          <FormField label="موقع نمبر اربعی" value={f.rajbah} onChange={s("rajbah")} width="w-32" />
          <FormField label="راجباہ" value={f.mauza} onChange={s("mauza")} width="w-32" />
          <FormField label="مونع" value={f.subEngineer} onChange={s("subEngineer")} width="w-32" />
        </div>
      </FormSection>

      <div className="bg-slate-800/50 rounded-xl p-4 mb-5 text-sm leading-7 text-slate-300" style={{ direction: "rtl", fontFamily: "serif" }}>
        <p className="font-bold text-white mb-2">جسناب عالی سلام!</p>
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap items-center">
            <span>سب انجینئر</span>
            <FormField label="" value={f.subEngineer} onChange={s("subEngineer")} width="w-28" />
            <span>نے بذر رویہ نا نمبری</span>
            <FormField label="" value={f.morzah} onChange={s("morzah")} width="w-24" />
            <span>موژرہ</span>
            <span>قوہ کثبت مطلع کیا گیا موقع</span>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <span>نمبر ایچ جی نمبر موقع مذکورہ بالا کے حصہ ودار احمد وادران نے موقع موژرہ</span>
            <FormField label="" value={f.tarNbri} onChange={s("tarNbri")} width="w-32" />
            <span>کی درمیانی شب اذن رتبہ کی جانچ آپاجاشی کی ہے۔ قوہ کثبت کی تعمیر میں</span>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <span>جناب SDCO صاحب نے بذر رویہ نا نمبری</span>
            <FormField label="" value={f.sdco} onChange={s("sdco")} width="w-24" />
            <span>موژرہ</span>
            <FormField label="" value={f.morzah2} onChange={s("morzah2")} width="w-28" />
            <span>کی ہے۔ اور کیس محصول ناس مرتب کرنے کا مادو فرمایا۔</span>
          </div>
        </div>
        <p className="mt-3">
          اطلاع موصول ہونے پر ہمر وپٹواری حلقہ موقع لاحقہ کیا گیا اور بعد موقع کا جچہ تا پائی کثبت بچیاتیاں جات پائی کثبت پائی کثبت مل لاحقہ
          کروئی گئی ہے۔ لازم الفرمان کو موقع الفرمان کو موژرہ
        </p>
        <div className="flex gap-2 my-2 flex-wrap items-center">
          <FormField label="" value={f.mulzimAlfarman} onChange={s("mulzimAlfarman")} width="flex-1" />
          <span>بذکر جزئیات بکوامرزی بمقام دفتر ملہداری سیکشن</span>
        </div>
        <p>باندھیا گیا ہے۔ فیصل شدہ پر دانہ شامل کیس ہے۔</p>

        <div className="mt-4 p-3 bg-slate-700/40 rounded-lg">
          <p>
            لازم الفرمان کا فیصل پیرا بہ 13.8 ڈونگی نمبر At C روبو فوثمنٹل تاپلس موا انڈ وتم ہے۔ لازم الفرمان کے خلاف زیر دفعہ 140 پنجاب میریکیشن ڈرینج ریونیو
            ایکٹ 2023 کارروائی کرتے ہوئے قانم نمبر 7 جاک کردیا گیا ہے۔ پولس نمبر 1 کا اتما امتساب ہوگا۔
          </p>
        </div>
        <p className="text-center font-bold mt-3 text-white">کیس بمرا دمزید کارروانی ارسال خدمت ہے۔</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-4">
        <FormField label="دستخط ملہدار:۔" value={f.dastKhat} onChange={s("dastKhat")} />
        <FormField label="ملہداری سیکشن:۔" value={f.sectionSign} onChange={s("sectionSign")} />
      </div>
      <div className="grid grid-cols-2 gap-6 mt-3">
        <FormField label="تاریخ" value={f.tarikh} onChange={s("tarikh")} />
        <FormField label="حل نامبر" value={f.faisalNo} onChange={s("faisalNo")} />
      </div>
    </FormWrapper>
  );
}