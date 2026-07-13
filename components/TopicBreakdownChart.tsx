"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TopicBreakdownRow } from "@/lib/analytics";

function prettyTopic(topic: string) {
  return topic
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export default function TopicBreakdownChart({ data }: { data: TopicBreakdownRow[] }) {
  const chartData = data.map((row) => ({ ...row, topicLabel: prettyTopic(row.topic) }));
  const height = Math.max(280, chartData.length * 34);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12, fill: "#64748b" }} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="topicLabel"
            width={130}
            tick={{ fontSize: 12, fill: "#334155" }}
          />
          <Tooltip />
          <Legend />
          <Bar dataKey="negative" stackId="a" fill="#f43f5e" name="Negative" />
          <Bar dataKey="neutral" stackId="a" fill="#94a3b8" name="Neutral" />
          <Bar dataKey="positive" stackId="a" fill="#10b981" name="Positive" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
