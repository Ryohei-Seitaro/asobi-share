"use client";

import { useState, useTransition } from "react";
import { addTripToGoogleCalendar } from "@/app/(app)/trips/[id]/actions";

function nextSaturday(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  const delta = (6 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Result =
  | { kind: "google-ok"; created: number; failed: number }
  | { kind: "error"; message: string }
  | null;

// 親側で `{open && <AddToCalendar ... />}` として出し入れする（毎回マウントし直して状態リセット）
export function AddToCalendar({
  tripId,
  dayCount,
  onClose,
}: {
  tripId: string;
  dayCount: number;
  onClose: () => void;
}) {
  const [date, setDate] = useState(nextSaturday);
  const [result, setResult] = useState<Result>(null);
  const [isPending, startTransition] = useTransition();

  function handleGoogle() {
    setResult(null);
    startTransition(async () => {
      const r = await addTripToGoogleCalendar(tripId, date);
      if (r.ok) setResult({ kind: "google-ok", created: r.created, failed: r.failed });
      else setResult({ kind: "error", message: r.error });
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="カレンダーに追加">
      <button aria-label="閉じる" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div className="relative max-h-[85vh] w-full max-w-[400px] overflow-y-auto rounded-[20px] border border-line bg-surface p-5 shadow-xl">
        <h2 className="mb-1 font-display text-[16px] font-semibold">カレンダーに追加</h2>
        <p className="mb-4 text-[12px] leading-[1.6] text-ink-3">
          {dayCount > 1
            ? `全${dayCount}日ぶんの予定を、選んだ日を1日目として登録します。`
            : "この旅程の予定を、選んだ日に登録します。"}
        </p>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-[11px] tracking-wide text-ink-3">出発日（1日目）</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-[10px] border border-line bg-surface-3 px-3 py-2.5 text-[14px] text-ink"
          />
        </label>

        <div className="flex flex-col gap-2">
          <a
            href={`/api/trips/${tripId}/ics?start=${date}`}
            className="rounded-[11px] bg-plan px-5 py-3 text-center text-[14px] font-bold text-white"
          >
            .icsファイルを保存（Apple / Outlook / TimeTree）
          </a>
          <p className="px-1 text-[11px] leading-[1.6] text-ink-3">
            保存した .ics を開くとカレンダーに取り込めます。TimeTree はアプリでファイルを共有 →「カレンダーに追加」。
          </p>
          <button
            onClick={handleGoogle}
            disabled={isPending || !date}
            className="mt-1 rounded-[11px] border border-line bg-surface-3 px-5 py-3 text-[14px] font-bold text-ink-2 disabled:opacity-50"
          >
            {isPending ? "登録中…" : "Googleカレンダーに直接登録（準備中）"}
          </button>
        </div>

        {result?.kind === "google-ok" && (
          <p className="mt-3 rounded-[9px] bg-plan-soft px-3 py-2 text-[12px] leading-[1.6] text-plan">
            Googleカレンダーに{result.created}件を登録しました。
            {result.failed > 0 && `（${result.failed}件は失敗）`}
          </p>
        )}
        {result?.kind === "error" && (
          <p className="mt-3 rounded-[9px] bg-actual-soft px-3 py-2 text-[12px] leading-[1.6] text-actual">
            {result.message}
          </p>
        )}
      </div>
    </div>
  );
}
