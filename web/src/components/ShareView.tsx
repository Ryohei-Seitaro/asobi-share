"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export function ShareView({
  tripId,
  title,
  authorName,
  coverPhotos,
  savesCount,
  eventCount,
}: {
  tripId: string;
  title: string;
  authorName: string;
  coverPhotos: string[];
  savesCount: number;
  eventCount: number;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    setShareUrl(`${window.location.origin}/trips/${tripId}`);
  }, [tripId]);

  function show(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      show("リンクをコピーしました");
    } catch {
      show("コピーに失敗しました");
    }
  }

  const shareText = `${title}（${authorName}さんの旅程）`;
  const xUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-3.5">
        <Link
          href={`/trips/${tripId}`}
          aria-label="戻る"
          className="grid h-8 w-8 place-items-center rounded-[9px] border border-line text-ink-2"
        >
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path
              d="M9 1 L3 7 L9 13"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <h1 className="font-display text-[17px] font-semibold">シェアする</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-[18px]">
        <p className="mb-2.5 text-[12px] text-ink-3">SNSにはこの画像が出ます</p>
        <div className="mb-4 overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="grid h-24 grid-cols-4 gap-0.5">
            {coverPhotos.slice(0, 4).map((url, i) => (
              <span key={i} className="relative block overflow-hidden bg-surface-2">
                <Image src={url} alt={title} fill sizes="150px" className="object-cover" />
              </span>
            ))}
          </div>
          <div className="px-3.5 py-3">
            <h4 className="mb-1 font-display text-[15px] font-semibold leading-[1.4]">{title}</h4>
            <div className="flex items-center gap-1.5 font-mono-num text-[11px] tabular-nums text-ink-3">
              <span>{eventCount}の予定</span>
              <span>・</span>
              <span>{savesCount} 保存</span>
              <span>・</span>
              <span>{authorName}</span>
            </div>
          </div>
        </div>

        <div className="mb-3.5 grid grid-cols-3 gap-2">
          <a
            href={xUrl}
            target="_blank"
            rel="noopener"
            className="flex flex-col items-center gap-1.5 rounded-[11px] border border-line bg-surface py-3.5 text-[12px] font-medium text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path d="M2 2 L16 16M16 2 L2 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            X
          </a>
          <a
            href={lineUrl}
            target="_blank"
            rel="noopener"
            className="flex flex-col items-center gap-1.5 rounded-[11px] border border-line bg-surface py-3.5 text-[12px] font-medium text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path
                d="M9 2C4.9 2 1.6 4.7 1.6 8c0 2.1 1.4 4 3.5 5.1-.1.6-.5 1.9-.6 2.2 0 0 0 .2.1.2h.2c.3-.1 2.6-1.7 3.2-2.1.3 0 .7.1 1 .1 4.1 0 7.4-2.7 7.4-6S13.1 2 9 2z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              />
            </svg>
            LINE
          </a>
          <button
            onClick={() => show("画像を保存してストーリーに貼り付けてください")}
            className="flex flex-col items-center gap-1.5 rounded-[11px] border border-line bg-surface py-3.5 text-[12px] font-medium text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <rect x="2" y="2" width="14" height="14" rx="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="9" cy="9" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="13.4" cy="4.6" r="1" fill="currentColor" />
            </svg>
            ストーリー
          </button>
        </div>

        <div className="flex items-center gap-1.5 rounded-[10px] border border-line bg-surface py-2 pl-3 pr-2">
          <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono-num text-[11px] text-ink-2">
            {shareUrl}
          </code>
          <button onClick={copyLink} className="shrink-0 rounded-[7px] bg-plan px-3.5 py-1.5 text-[12px] font-bold text-white">
            コピー
          </button>
        </div>

        <p className="mt-3 text-[11px] text-ink-3">シェアから来た人が保存すると、あなたの保存数が増えます。</p>
      </div>

      {toast && (
        <div className="absolute bottom-[74px] left-1/2 z-[60] -translate-x-1/2 rounded-[9px] bg-ink px-4 py-2.5 text-[12.5px] font-medium text-ground">
          {toast}
        </div>
      )}
    </div>
  );
}
