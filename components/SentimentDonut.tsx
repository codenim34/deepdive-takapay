"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { SentimentSplit } from "@/lib/analytics";

const COLORS = {
  positive: "#10b981",
  negative: "#f43f5e",
  neutral: "#94a3b8",
};

export default function SentimentDonut({ split }: { split: SentimentSplit }) {
  const data = [
    { name: "Positive", key: "positive", value: split.positive },
    { name: "Negative", key: "negative", value: split.negative },
    { name: "Neutral", key: "neutral", value: split.neutral },
  ];

  return (
    <div className="flex h-72 w-full items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={65}
            outerRadius={100}
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell key={entry.key} fill={COLORS[entry.key as keyof typeof COLORS]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [
              `${value} posts (${(((value as number) / split.total) * 100).toFixed(0)}%)`,
              name,
            ]}
          />
          <Legend verticalAlign="bottom" height={32} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
