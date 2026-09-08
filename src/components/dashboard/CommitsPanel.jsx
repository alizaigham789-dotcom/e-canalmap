import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { GitCommit, Loader2, ExternalLink, Search } from "lucide-react";

// Fetches and displays the latest commits from a GitHub repo (land mapping engine)
// via the github-list-commits backend function using the shared GitHub connector.
export default function CommitsPanel({ defaultRepo = "" }) {
  const [repo, setRepo] = useState(defaultRepo);
  const [commits, setCommits] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchCommits = async (repoStr) => {
    const parts = repoStr.split("/").map((s) => s.trim()).filter(Boolean);
    if (parts.length < 2) {
      setError("Enter owner/repo (e.g. my-org/land-mapping-engine)");
      return;
    }
    const [owner, repoName] = parts;
    setLoading(true);
    setError("");
    try {
      const { data } = await base44.functions.invoke("github-list-commits", {
        owner,
        repo: repoName,
        limit: 10,
      });
      setCommits(data.commits || []);
    } catch (e) {
      setError(e.message || "Failed to fetch commits");
      setCommits(null);
    }
    setLoading(false);
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <GitCommit className="w-4 h-4 text-slate-500" />
        <h3 className="text-sm font-bold font-heading text-slate-800">Latest Commits</h3>
        <span className="text-[10px] text-slate-400 ml-auto">GitHub · land mapping engine</span>
      </div>

      <div className="p-3 flex items-center gap-2 border-b border-slate-100 bg-slate-50">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchCommits(repo)}
          placeholder="owner/repo (e.g. my-org/land-mapping-engine)"
          className="flex-1 min-w-0 h-9 px-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={() => fetchCommits(repo)}
          disabled={loading}
          className="h-9 px-3 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Fetch"}
        </button>
      </div>

      {error && (
        <div className="px-4 py-2 text-xs text-red-600 bg-red-50">{error}</div>
      )}

      {commits && commits.length === 0 && !error && (
        <div className="px-4 py-6 text-center text-xs text-slate-400">No commits found.</div>
      )}

      {commits && commits.length > 0 && (
        <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
          {commits.map((c) => (
            <li key={c.sha} className="px-4 py-2.5 hover:bg-slate-50">
              <div className="flex items-start gap-2.5">
                {c.author_avatar ? (
                  <img src={c.author_avatar} alt="" className="w-6 h-6 rounded-full shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-slate-200 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-700 leading-snug truncate">{c.message}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    <span className="font-medium text-slate-500">{c.author_login || c.author}</span>
                    {" · "}
                    {c.sha.slice(0, 7)}
                    {" · "}
                    {new Date(c.date).toLocaleString()}
                  </p>
                </div>
                <a href={c.html_url} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-blue-600 shrink-0">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}