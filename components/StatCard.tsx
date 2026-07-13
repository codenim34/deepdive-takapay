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

const cardToneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  neutral: "border-l-slate-300 bg-white",
  positive: "border-l-emerald-400 bg-emerald-50/40",
  negative: "border-l-rose-400 bg-rose-50/40",
};

export default function StatCard({ label, value, sublabel, tone = "neutral" }: StatCardProps) {
  return (
    <div
      className={`rounded-xl border border-l-4 border-slate-200 p-5 shadow-sm ${cardToneClasses[tone]}`}
    >
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums ${toneClasses[tone]}`}>{value}</p>
      {sublabel && <p className="mt-1 text-xs text-slate-400">{sublabel}</p>}
    </div>
  );
}
