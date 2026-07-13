import Link from "next/link";

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "neutral" | "positive" | "negative" | "warning";
  href?: string;
  onClick?: () => void;
}

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  neutral: "text-slate-900",
  positive: "text-emerald-600",
  negative: "text-rose-600",
  warning: "text-amber-600",
};

const cardToneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  neutral: "border-l-slate-300 bg-white",
  positive: "border-l-emerald-400 bg-emerald-50/40",
  negative: "border-l-rose-400 bg-rose-50/40",
  warning: "border-l-amber-400 bg-amber-50/40",
};

export default function StatCard({ label, value, sublabel, tone = "neutral", href, onClick }: StatCardProps) {
  const clickable = Boolean(href || onClick);

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {clickable && <span className="text-slate-300">→</span>}
      </div>
      <p className={`mt-1 text-3xl font-semibold tabular-nums ${toneClasses[tone]}`}>{value}</p>
      {sublabel && <p className="mt-1 text-xs text-slate-400">{sublabel}</p>}
    </>
  );

  const className = `w-full rounded-xl border border-l-4 border-slate-200 p-5 text-left shadow-sm ${cardToneClasses[tone]} ${
    clickable ? "block transition hover:shadow-md hover:ring-1 hover:ring-slate-300" : ""
  }`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
