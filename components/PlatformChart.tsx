"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PlatformRow } from "@/lib/analytics";

function colorForNegativePct(pct: number) {
  if (pct >= 55) return "#f43f5e";
  if (pct >= 40) return "#f59e0b";
  return "#10b981";
}

export default function PlatformChart({ data }: { data: PlatformRow[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="platform" tick={{ fontSize: 12, fill: "#64748b" }} />
          <YAxis tick={{ fontSize: 12, fill: "#64748b" }} allowDecimals={false} />
          <Tooltip
            formatter={(value, _name, item) => {
              const payload = item?.payload as PlatformRow | undefined;
              return [
                `${value} posts${payload ? ` · ${payload.negativePct}% negative` : ""}`,
                "Volume",
              ];
            }}
          />
          <Bar dataKey="total" name="total" radius={[4, 4, 0, 0]}>
            {data.map((row) => (
              <Cell key={row.platform} fill={colorForNegativePct(row.negativePct)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-slate-400">
        Bar color reflects how negative that platform skews (red = mostly negative, green = mostly positive).
      </p>
    </div>
  );
}
