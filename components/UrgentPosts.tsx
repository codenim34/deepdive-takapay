import type { ProcessedRecord } from "@/lib/types";

export default function UrgentPosts({ posts }: { posts: ProcessedRecord[] }) {
  if (posts.length === 0) return null;

  return (
    <div className="rounded-xl border border-l-4 border-slate-200 border-l-rose-500 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800">Urgent posts</h2>
      <p className="mt-1 text-sm text-slate-500">
        Ranked by a severity score combining negativity, engagement, and whether money is at
        stake — the posts most likely to need a direct response.
      </p>
      <div className="mt-4 space-y-3">
        {posts.slice(0, 5).map((p) => (
          <div key={p.id} className="flex items-start justify-between gap-4 rounded-lg bg-rose-50 p-3">
            <div className="min-w-0">
              <p className="text-sm text-slate-800">&ldquo;{p.text}&rdquo;</p>
              <p className="mt-1 text-xs text-slate-500">
                {p.platform} · {p.reactions} reactions · {p.comments} comments
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
              {p.severityScore}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
