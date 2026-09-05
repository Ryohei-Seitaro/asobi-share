"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { suggestTripByMood } from "@/app/(app)/actions";

const MOODS = [
  "まったり過ごしたい",
  "体を動かしたい",
  "絶景が見たい",
  "おいしいものが食べたい",
  "新しい発見がほしい",
];

type Suggestion = { id: string; title: string; genre: string; coverPhoto: string | null };

export function ChatSuggest() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mood, setMood] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");
  const [result, setResult] = useState<Suggestion | null>(null);
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setResult(null);
  }

  function submit() {
    startTransition(async () => {
      const suggestion = await suggestTripByMood(mood ?? "");
      setResult(suggestion);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="今日の気分から旅程を提案してもらう"
        className="absolute bottom-4 right-4 z-40 grid h-[52px] w-[52px] place-items-center rounded-full bg-plan text-white shadow-lg"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
          <path
            d="M4 5h14a1 1 0 011 1v8a1 1 0 01-1 1H9l-4 4v-4H4a1 1 0 01-1-1V6a1 1 0 011-1z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="8" cy="10" r="1" fill="currentColor" />
          <circle cx="11" cy="10" r="1" fill="currentColor" />
          <circle cx="14" cy="10" r="1" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/40" onClick={close}>
          <div
            className="max-h-[85%] w-full max-w-[480px] overflow-y-auto rounded-t-2xl bg-surface p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 flex items-center gap-1.5 font-display text-[16px] font-semibold">
              💬 今日の気分は？
            </h3>
            <div className="mb-3 flex flex-wrap gap-[7px]">
              {MOODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMood(m)}
                  className={`rounded-full border px-3.5 py-2 text-[12.5px] font-medium ${
                    mood === m ? "border-plan bg-plan text-white" : "border-line bg-surface-3 text-ink-2"
                  }`}
                >
                  {m.replace(/(過ごしたい|したい|見たい|がほしい)$/, "")}
                </button>
              ))}
            </div>
            <div className="mb-3.5">
              <label htmlFor="free-mood" className="mb-1.5 block text-[11px] tracking-wide text-ink-3">
                自由に書いてもOK
              </label>
              <textarea
                id="free-mood"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="例：疲れてるから遠出したくない、でも何かはしたい"
                className="min-h-[56px] w-full resize-y rounded-[9px] border border-line bg-surface-3 px-[11px] py-[9px] text-[13.5px] text-ink"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={close} className="flex-1 rounded-[10px] bg-surface-2 py-[11px] text-[13.5px] font-bold text-ink-2">
                閉じる
              </button>
              <button
                onClick={submit}
                disabled={isPending || !mood}
                className="flex-1 rounded-[10px] bg-plan py-[11px] text-[13.5px] font-bold text-white disabled:opacity-50"
              >
                提案してもらう
              </button>
            </div>

            {result && (
              <div className="mt-3.5 border-t border-line-soft pt-3.5">
                <p className="mb-2 text-[12px] text-ink-3">あなたの気分なら、こんな旅程はどうですか？</p>
                <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-3 p-2.5">
                  {result.coverPhoto && (
                    <span className="relative block h-10 w-[52px] shrink-0 overflow-hidden rounded-md">
                      <Image src={result.coverPhoto} alt={result.title} fill sizes="52px" className="object-cover" />
                    </span>
                  )}
                  <span className="flex-1 text-[13px] font-bold leading-[1.4]">{result.title}</span>
                  <button
                    onClick={() => router.push(`/trips/${result.id}`)}
                    className="shrink-0 rounded-lg bg-plan px-3 py-2 text-[12px] font-bold text-white"
                  >
                    見る
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
