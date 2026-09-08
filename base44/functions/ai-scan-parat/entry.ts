import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const AI_SCHEMA = {
  type: "object",
  properties: {
    header: {
      type: "object",
      properties: {
        mogha_number: { type: "string", description: "موگہ نمبر e.g. 16000" },
        mogha_side: { type: "string", description: "L یا R طرف" },
        rajbaha: { type: "string", description: "راجباہ نام" },
        mouza: { type: "string", description: "موضع/چک نمبر" },
        section: { type: "string", description: "سیکشن" },
        sub_division: { type: "string", description: "تحصیل/سب ڈویژن" },
        canal_division: { type: "string", description: "ضلع/ڈویژن" },
      },
    },
    rows: {
      type: "array",
      items: {
        type: "object",
        properties: {
          khatoni: { type: "string", description: "نمبر شمار یا کھاتہ نمبر" },
          owner_name: { type: "string", description: "نام مالک معہ ولدیت (Urdu)" },
          bandubast: { type: "string", description: "نمبران مربعہ جات" },
          total_area: { type: "string", description: "کل رقبہ بروئے ایکڑ (numeric)" },
          ghair_mumkin: { type: "string", description: "غیر ممکن رقبہ (numeric)" },
          khalis_raqba: { type: "string", description: "خالص رقبہ (numeric)" },
          waari_ghante: { type: "string", description: "واری بحساب رقبہ گھنٹہ (numeric)" },
          waari_minute: { type: "string", description: "واری بحساب رقبہ منٹ (numeric)" },
          zaidah_ghante: { type: "string", description: "زائدہ واری گھنٹہ (numeric)" },
          zaidah_minute: { type: "string", description: "زائدہ واری منٹ (numeric)" },
          wazgi_ghante: { type: "string", description: "وضگی گھنٹہ (numeric)" },
          wazgi_minute: { type: "string", description: "وضگی منٹ (numeric)" },
          khalis_waari_ghante: { type: "string", description: "خالص واری گھنٹہ (numeric)" },
          khalis_waari_minute: { type: "string", description: "خالص واری منٹ (numeric)" },
          nikha_lega: { type: "string", description: "کس نکہ سے پانی لاوے گا" },
          nikha_dega: { type: "string", description: "کس نکہ پر پانی دے گا" },
          tashreeh_din: { type: "string", description: "اوقات داری شروع وقت" },
          tashreeh_raat: { type: "string", description: "اوقات داری ختم وقت" },
        },
      },
    },
  },
};

const COMMON_DIGIT_RULES = `
CRITICAL RULES FOR NUMERIC FIELDS:
1. Convert ALL Eastern-Arabic / Urdu digits (۰۱۲۳۴۵۶۷۸۹ ٠١٢٣٤٥٦٧٨٩) to Western digits (0123456789). E.g. "۷.۲۴" → "7.24", "۱٢۳" → "123".
2. Strip thousands separators (، or ,) inside numbers: "1,234" → "1234".
3. Keep decimal points as "." (not ،). Preserve fractional values exactly: "7.10", "0.14", "12.5".
4. If a numeric cell is blank or "—", use empty string "".
5. Keep owner_name and nikha text in original Urdu script (Nastaliq). Do NOT translate names.
6. If a value is ambiguous or unreadable, use empty string "" — do NOT guess.`;

const COLUMN_MAP = `
COLUMN MAPPING (table is read RIGHT-TO-LEFT in Urdu, columns 1→n from right):
  نمبر شمار (serial) → khatoni
  نام مالک یا قابض اراضی معہ ولدیت (owner + father) → owner_name  [URDU, keep as-is]
  نمبران مربعہ جات / تفصیل بندوبست (plot nos.) → bandubast
  رقبہ بروئے ایکڑ (total acres) → total_area  [numeric]
  غیر ممکن رقبہ (unusable) → ghair_mumkin  [numeric]
  خالص رقبہ (net area = total − unusable) → khalis_raqba  [numeric]
  واری بحساب رقبہ منٹ / گھنٹہ (water turn min / hr) → waari_minute / waari_ghante  [numeric]
  زائدہ وصولی منٹ / گھنٹہ (extra min / hr) → zaidah_minute / zaidah_ghante  [numeric]
  وضگی منٹ / گھنٹہ (deduction min / hr) → wazgi_minute / wazgi_ghante  [numeric]
  خالص واری / کل پانی منٹ / گھنٹہ (net water min / hr) → khalis_waari_minute / khalis_waari_ghante  [numeric]
  کس نکہ سے پانی لاوے گا (water source) → nikha_lega  [URDU]
  کس نکہ پر پانی دے گا (water dest) → nikha_dega  [URDU]
  تشریح اوقات دن (day start time) → tashreeh_din  [URDU text]
  تشریح اوقات رات (night end time) → tashreeh_raat  [URDU text]
Skip the میزان (totals) row, header rows, and sub-header rows. Extract ONLY data rows where owner_name or total_area is present.`;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { file_url, isSpreadsheet } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url required' }, { status: 400 });

    const basePrompt = isSpreadsheet
      ? `This Excel/CSV file contains a Parat Warabandi (پرت وارہ بندی) or Tarmeem Warabandi (ترمیم وارہ بندی) register in Urdu.
The spreadsheet may have Urdu column headers in row 1-4. Identify the header row, then map each data column.${COLUMN_MAP}

Also extract the document header metadata if present anywhere:
  mogha_number (موگہ نمبر, e.g. "18650"), mogha_side (L or R), rajbaha (راجباہ), mouza (موضع/چک), section (سیکشن), sub_division (سب ڈویژن/تحصیل), canal_division (ضلع/ڈویژن).
${COMMON_DIGIT_RULES}
Use empty string "" for any missing value. Return ONLY the JSON object — no markdown, no explanation.`
      : `You are an expert OCR + document analysis AI specialized in Pakistani irrigation land records.
This image/PDF is a scanned Parat Warabandi (پرت وارہ بندی) or Tarmeem Warabandi (ترمیم وارہ بندی) document written in Urdu (Nastaliq script), with mixed English text and numerals.

STEP 1 — HEADER: Read the top header line of the document for:
  mogha_number (موگہ نمبری, e.g. "18650"), mogha_side (طرف L or R), rajbaha (راجباہ), mouza (موضع/چک), section (سیکشن), sub_division (سب ڈویژن/تحصیل), canal_division (ضلع/کینال ڈویژن).

STEP 2 — TABLE ROWS: The table has many columns. For EACH DATA ROW extract these fields.${COLUMN_MAP}

STEP 3 — QUALITY: If a cell is blurred, crossed out, or illegible, use empty string "". If an entire row is a sub-total or the میزان (totals) row, SKIP it.

${COMMON_DIGIT_RULES}

Return ONLY a valid JSON object matching the schema — no markdown fences, no commentary.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: basePrompt,
      file_urls: [file_url],
      model: "claude_sonnet_4_6",
      response_json_schema: AI_SCHEMA,
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}