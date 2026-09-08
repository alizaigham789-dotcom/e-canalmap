import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url required' }, { status: 400 });

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `This is a scanned Khasra / Jamabandi or Parat Warabandi register page. Extract all rows of land holder data. For each row, return a JSON object with these fields:
- sr_no: row number
- owner_name: name of occupier / مالک کا نام (Urdu)
- father_name: father name / ولدیت (Urdu)
- khewat_no: khewat number
- khatoni_no: khatoni / khata number
- khasra_no: khasra number(s)
- area_acre: total area in acres (number only)
- area_kanal: kanal portion (number only)
- area_marla: marla portion (number only)
- water_share: water share / حصہ آب
- remarks: any remarks or Ghair Mumkin / Zaid Wasoli / Wazgi notes (Urdu)
Return ONLY a JSON array of objects, no extra text.`,
      file_urls: [file_url],
      model: "claude_sonnet_4_6",
      response_json_schema: {
        type: "object",
        properties: {
          rows: {
            type: "array",
            items: {
              type: "object",
              properties: {
                sr_no: { type: "string" },
                owner_name: { type: "string" },
                father_name: { type: "string" },
                khewat_no: { type: "string" },
                khatoni_no: { type: "string" },
                khasra_no: { type: "string" },
                area_acre: { type: "string" },
                area_kanal: { type: "string" },
                area_marla: { type: "string" },
                water_share: { type: "string" },
                remarks: { type: "string" },
              },
            },
          },
        },
      },
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}