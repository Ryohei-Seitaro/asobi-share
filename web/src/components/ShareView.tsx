"use client";

import { useState } from "react";
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
  const [shareUrl] = useState(() =>
    typeof window !== "undefined" ? `${window.location.origin}/trips/${tripId}` : ""
  );

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
            <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-black">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#fff"
                  d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                />
              </svg>
            </span>
            X
          </a>
          <a
            href={lineUrl}
            target="_blank"
            rel="noopener"
            className="flex flex-col items-center gap-1.5 rounded-[11px] border border-line bg-surface py-3.5 text-[12px] font-medium text-ink"
          >
            <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-[#06C755]">
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#fff"
                  d="M12 2.5C6.201 2.5 1.5 6.315 1.5 11.01c0 4.209 3.73 7.734 8.77 8.4.342.074.807.226.925.518.106.266.069.682.034.951l-.15.9c-.043.267-.21 1.043.913.569 1.122-.474 6.05-3.562 8.253-6.098C21.72 14.238 22.5 12.706 22.5 11.01c0-4.695-4.701-8.51-10.5-8.51zm-5.5 10.87h-1.53a.36.36 0 01-.36-.36V8.62a.36.36 0 01.72 0v3.99h1.17a.36.36 0 010 .72zm2.09 0a.36.36 0 01-.36-.36V8.62a.36.36 0 01.72 0v4.39a.36.36 0 01-.36.36zm4.94-.36a.36.36 0 01-.36.36h-.02a.36.36 0 01-.29-.146L10.63 9.98v2.87a.36.36 0 01-.72 0V8.62a.36.36 0 01.36-.36h.03a.36.36 0 01.29.147l2.25 3.28V8.62a.36.36 0 01.72 0zm3.6-3.03h-1.62v1.13h1.53a.36.36 0 010 .72h-1.53v1.13h1.62a.36.36 0 010 .72h-1.98a.36.36 0 01-.36-.36V8.62a.36.36 0 01.36-.36h1.98a.36.36 0 010 .72z"
                />
              </svg>
            </span>
            LINE
          </a>
          <button
            onClick={() => show("画像を保存してストーリーに貼り付けてください")}
            className="flex flex-col items-center gap-1.5 rounded-[11px] border border-line bg-surface py-3.5 text-[12px] font-medium text-ink"
          >
            <span
              className="grid h-[26px] w-[26px] place-items-center rounded-[8px]"
              style={{
                background:
                  "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#fff"
                  d="M12 2c-2.716 0-3.056.012-4.123.06-1.064.049-1.791.218-2.427.465a4.9 4.9 0 00-1.772 1.153A4.9 4.9 0 002.525 5.45c-.247.636-.416 1.363-.465 2.427C2.012 8.944 2 9.284 2 12s.012 3.056.06 4.123c.049 1.064.218 1.791.465 2.427a4.9 4.9 0 001.153 1.772 4.9 4.9 0 001.772 1.153c.636.247 1.363.416 2.427.465C8.944 21.988 9.284 22 12 22s3.056-.012 4.123-.06c1.064-.049 1.791-.218 2.427-.465a4.9 4.9 0 001.772-1.153 4.9 4.9 0 001.153-1.772c.247-.636.416-1.363.465-2.427.048-1.067.06-1.407.06-4.123s-.012-3.056-.06-4.123c-.049-1.064-.218-1.791-.465-2.427a4.9 4.9 0 00-1.153-1.772A4.9 4.9 0 0018.55 2.525c-.636-.247-1.363-.416-2.427-.465C15.056 2.012 14.716 2 12 2zm0 1.802c2.67 0 2.987.01 4.042.059.976.045 1.505.207 1.858.344.467.182.8.399 1.15.748.35.35.566.683.748 1.15.137.353.3.882.344 1.858.048 1.055.058 1.372.058 4.042s-.01 2.987-.058 4.042c-.045.976-.207 1.505-.344 1.858a3.1 3.1 0 01-.748 1.15 3.1 3.1 0 01-1.15.748c-.353.137-.882.3-1.858.344-1.054.048-1.371.058-4.042.058s-2.988-.01-4.042-.058c-.976-.045-1.505-.207-1.858-.344a3.1 3.1 0 01-1.15-.748 3.1 3.1 0 01-.748-1.15c-.137-.353-.3-.882-.344-1.858-.048-1.055-.058-1.372-.058-4.042s.01-2.987.058-4.042c.045-.976.207-1.505.344-1.858.182-.467.399-.8.748-1.15a3.1 3.1 0 011.15-.748c.353-.137.882-.3 1.858-.344 1.055-.048 1.372-.059 4.042-.059zm0 3.063a5.135 5.135 0 100 10.27 5.135 5.135 0 000-10.27zm0 8.468a3.333 3.333 0 110-6.666 3.333 3.333 0 010 6.666zm6.538-8.671a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0z"
                />
              </svg>
            </span>
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
