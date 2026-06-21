import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const STATUS_COLORS = {
  draft: "#94a3b8",
  in_progress: "#f59e0b",
  review: "#a855f7",
  approved: "#3b82f6",
  published: "#10b981",
};

const STATUS_LABELS = {
  draft: "Draft",
  in_progress: "In Progress",
  review: "Under Review",
  approved: "Approved",
  published: "Published",
};

export default function StatusChart({ maps }) {
  const counts = { draft: 0, in_progress: 0, review: 0, approved: 0, published: 0 };
  maps.forEach(m => {
    const s = m.status || "draft";
    if (counts[s] !== undefined) counts[s]++;
  });

  const data = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: STATUS_LABELS[key] || key,
      value,
      color: STATUS_COLORS[key] || "#cbd5e1",
    }));

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        No maps yet — create your first map to see the chart.
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="w-40 h-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#e2e8f0",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col gap-1.5 flex-1 w-full">
        {data.map((d) => {
          const pct = Math.round((d.value / total) * 100);
          return (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ background: d.color }}
              />
              <span className="text-slate-600 w-24">{d.name}</span>
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: d.color,
                  }}
                />
              </div>
              <span className="text-slate-400 font-mono w-8 text-right">{d.value}</span>
              <span className="text-slate-300 font-mono w-8 text-right">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}