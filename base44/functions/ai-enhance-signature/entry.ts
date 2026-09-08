import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url required' }, { status: 400 });

    const result = await base44.asServiceRole.integrations.Core.GenerateImage({
      prompt: `Extract just the handwritten signature or rubber stamp ink from this scanned image. Remove all paper background, making it pure white (#FFFFFF). Keep the ink lines crisp, dark, and at original scale. Do not resize or crop the ink marks. White background only.`,
      existing_image_urls: [file_url],
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}