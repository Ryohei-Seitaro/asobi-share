"use client";

// 画面セグメントで例外が投げられたときのフォールバック。
// 主な発生源は、リクエスト時のDB読み取りが一過性で失敗するケース
// （Neon のサーバーレス Postgres がアイドルでゼロにスケールし、
// コールドスタート直後の最初のクエリがタイムアウト/失敗する）。
// これが無いと Next の素の全画面エラー（"This page couldn't load"）が出る。
// reset() でそのセグメントのサーバーコンポーネントを再実行できる＝
// 2回目以降は DB が温まっていて成功することがほとんど。

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("app segment error:", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-ink-3">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 8v5M12 16.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </div>
      <div>
        <p className="text-[15px] font-bold text-ink">うまく読み込めませんでした</p>
        <p className="mt-1 text-[12.5px] text-ink-3">
          一時的な問題の可能性があります。もう一度お試しください。
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-plan px-6 py-3 text-[14px] font-bold text-white"
      >
        再読み込み
      </button>
      {error.digest && (
        <p className="text-[10.5px] text-ink-3">エラーID: {error.digest}</p>
      )}
    </div>
  );
}
