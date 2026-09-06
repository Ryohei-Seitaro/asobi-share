// 旅程詳細への遷移時に即座に出すフォールバック（カバー写真＋見出しの骨組み）。
export default function Loading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-busy="true" aria-label="読み込み中">
      <div className="aspect-[16/10] w-full animate-pulse bg-surface-2" />
      <div className="flex flex-col gap-3 px-4 py-4">
        <div className="h-5 w-4/5 animate-pulse rounded bg-surface-2" />
        <div className="flex gap-2">
          <div className="h-5 w-16 animate-pulse rounded bg-surface-2" />
          <div className="h-5 w-20 animate-pulse rounded bg-surface-2" />
          <div className="h-5 w-14 animate-pulse rounded bg-surface-2" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="h-4 w-12 shrink-0 animate-pulse rounded bg-surface-2" />
            <div className="h-16 flex-1 animate-pulse rounded-[10px] bg-surface-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
