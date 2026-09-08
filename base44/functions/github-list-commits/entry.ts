import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Fetches the latest commits from a GitHub repository using the connected
// shared GitHub account. Admin-only to protect the builder's shared token.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const payload = await req.json().catch(() => ({}));
    const owner = typeof payload?.owner === 'string' ? payload.owner.trim() : '';
    const repo = typeof payload?.repo === 'string' ? payload.repo.trim() : '';
    const limit = Math.min(Number(payload?.limit) || 10, 100);

    if (!owner || !repo) {
      return Response.json({ error: 'owner and repo are required' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('github');
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ChakLand-GIS-PRO',
    };

    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=${limit}`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      const txt = await resp.text();
      return Response.json({ error: `GitHub ${resp.status}: ${txt}` }, { status: 502 });
    }
    const data = await resp.json();

    const commits = (Array.isArray(data) ? data : []).map((c) => ({
      sha: c.sha,
      message: (c.commit?.message || '').split('\n')[0],
      author: c.commit?.author?.name || '',
      author_login: c.author?.login || c.commit?.author?.name || '',
      author_avatar: c.author?.avatar_url || '',
      date: c.commit?.author?.date || '',
      html_url: c.html_url || '',
    }));

    return Response.json({ ok: true, owner, repo, total: commits.length, commits });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}