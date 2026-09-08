import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Lists all repositories accessible to the connected Bitbucket account,
// across every workspace the account belongs to. Paginates automatically.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const payload = await req.json().catch(() => ({}));
    const workspaceParam = typeof payload?.workspace === 'string' ? payload.workspace.trim() : '';

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('bitbucket');

    const headers = { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' };
    const repos = [];
    const workspacesList = [];

    if (workspaceParam) {
      workspacesList.push(workspaceParam);
    } else {
      // Discover workspaces the account has access to (requires account scope).
      let permUrl = 'https://api.bitbucket.org/2.0/user/permissions/workspaces?pagelen=100';
      while (permUrl) {
        const permResp = await fetch(permUrl, { headers });
        if (permResp.ok) {
          const permBody = await permResp.json();
          for (const p of permBody.values || []) {
            if (p.workspace?.slug) workspacesList.push(p.workspace.slug);
          }
          permUrl = permBody.next || null;
        } else {
          permUrl = null;
        }
      }
    }

    if (!workspacesList.length) {
      return Response.json({
        error: 'No workspace specified. Pass a "workspace" slug (the org name in bitbucket.org/<workspace>). The connected account lacks the scope to enumerate workspaces automatically.',
      }, { status: 400 });
    }

    // List repositories within each workspace.
    for (const ws of workspacesList) {
      let nextUrl = `https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(ws)}?pagelen=100`;
      while (nextUrl) {
        const resp = await fetch(nextUrl, { headers });
        if (!resp.ok) {
          const txt = await resp.text();
          return Response.json({ error: `Bitbucket repos for ${ws} ${resp.status}: ${txt}`, repos }, { status: 502 });
        }
        const body = await resp.json();
        for (const r of body.values || []) {
          repos.push({
            uuid: r.uuid,
            name: r.name,
            full_name: r.full_name,
            slug: r.slug,
            workspace: r.workspace?.slug || r.owner?.display_name || '',
            is_private: r.is_private,
            description: r.description || '',
            language: r.language || '',
            size: r.size,
            created_on: r.created_on,
            updated_on: r.updated_on,
            links: { html: r.links?.html?.href || '', clone: (r.links?.clone || []).map(c => c.href) },
            main_branch: r.mainbranch?.name || '',
          });
        }
        nextUrl = body.next || null;
      }
    }

    return Response.json({
      ok: true,
      total: repos.length,
      workspaces: [...new Set(repos.map(r => r.workspace))],
      repos,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}