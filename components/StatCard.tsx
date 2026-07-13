interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "neutral" | "positive" | "negative";
}

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  neutral: "text-slate-900",
  positive: "text-emerald-600",
  negative: "text-rose-600",
};

export default function StatCard({ label, value, sublabel, tone = "neutral" }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums ${toneClasses[tone]}`}>{value}</p>
      {sublabel && <p className="mt-1 text-xs text-slate-400">{sublabel}</p>}
    </div>
  );
}
