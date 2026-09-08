import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url required' }, { status: 400 });

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `This is a 33-C form or village irrigation billing list. Extract all village rows. Return ONLY tab-separated lines with no headers: VillageName(Urdu)\tTehsil\tTotalBills\tZarAabiana. Leave column empty if not found.`,
      file_urls: [file_url],
      model: "claude_sonnet_4_6",
    });
    return Response.json({ result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}