// 遷移直後に即座に出るフォールバック。これが無いと旧画面が固まったまま
// サーバーレンダリング完了を待つ（左下 "Rendering" が出続ける体感の主因）。
export default function Loading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-busy="true" aria-label="読み込み中">
      <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-3.5">
        <div className="h-[18px] w-24 animate-pulse rounded bg-surface-2" />
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-surface-3 px-4 py-3.5">
        <div className="h-9 w-full animate-pulse rounded-[11px] bg-surface-2" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-[14px] border border-line bg-surface">
            <div className="aspect-[16/10] w-full animate-pulse bg-surface-2" />
            <div className="flex flex-col gap-2 px-[13px] pb-[13px] pt-[11px]">
              <div className="h-3.5 w-3/4 animate-pulse rounded bg-surface-2" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-surface-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
