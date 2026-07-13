"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyTrendPoint } from "@/lib/analytics";

function formatDay(day: string) {
  const d = new Date(day);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TrendChart({ data }: { data: DailyTrendPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="day"
            tickFormatter={formatDay}
            tick={{ fontSize: 12, fill: "#64748b" }}
          />
          <YAxis tick={{ fontSize: 12, fill: "#64748b" }} allowDecimals={false} />
          <Tooltip labelFormatter={(label) => formatDay(label as string)} />
          <Legend />
          <Area
            type="monotone"
            dataKey="positive"
            stackId="1"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.75}
            name="Positive"
          />
          <Area
            type="monotone"
            dataKey="neutral"
            stackId="1"
            stroke="#94a3b8"
            fill="#94a3b8"
            fillOpacity={0.6}
            name="Neutral"
          />
          <Area
            type="monotone"
            dataKey="negative"
            stackId="1"
            stroke="#f43f5e"
            fill="#f43f5e"
            fillOpacity={0.75}
            name="Negative"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
