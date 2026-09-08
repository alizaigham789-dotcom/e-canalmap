import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url required' }, { status: 400 });

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `This is a scanned cadastral / land-record map (Khasra / Chakbandi / Parat). 
Identify all recognizable land parcels, canals, roads, and boundaries.
Return a JSON object with an array "objects" where each item has:
- type: "mustateel" | "muraba" | "acre" | "canal" | "khal" | "road"
- label: string (parcel number or name, if visible)
- notes: string (any extra info)

Return ONLY the JSON, no extra text.`,
      file_urls: [file_url],
      model: "claude_sonnet_4_6",
      response_json_schema: {
        type: "object",
        properties: {
          objects: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                label: { type: "string" },
                notes: { type: "string" },
              },
            },
          },
          summary: { type: "string" },
        },
      },
    });
    return Response.json(res);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}