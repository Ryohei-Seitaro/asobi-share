"use client";

import { useState } from "react";
import Image from "next/image";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function TripCardPhotos({ photos, alt }: { photos: string[]; alt: string }) {
  const pages = chunk(photos, 3);
  const [page, setPage] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  if (pages.length === 0) {
    return <div className="h-[104px] bg-surface-2" />;
  }

  const safePage = Math.min(page, pages.length - 1);
  const current = pages[safePage];

  function go(delta: number) {
    setPage((p) => Math.max(0, Math.min(pages.length - 1, p + delta)));
  }

  return (
    <div
      className="relative h-[104px] overflow-hidden"
      onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStartX == null) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        setTouchStartX(null);
      }}
    >
      <div
        className={`grid h-full gap-0.5 ${
          current.length >= 3 ? "grid-cols-[2fr_1fr_1fr]" : current.length === 2 ? "grid-cols-2" : "grid-cols-1"
        }`}
      >
        {current.map((url, i) => (
          <span key={`${safePage}-${i}`} className="relative block overflow-hidden bg-surface-2">
            <Image src={url} alt={alt} fill sizes="200px" className="object-cover" />
          </span>
        ))}
      </div>
      {pages.length > 1 && (
        <>
          {safePage > 0 && (
            <button
              type="button"
              aria-label="前の写真"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                go(-1);
              }}
              className="absolute left-1.5 top-1/2 z-10 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white"
            >
              <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden="true">
                <path d="M6.5 1 L2 4.5 L6.5 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          {safePage < pages.length - 1 && (
            <button
              type="button"
              aria-label="次の写真"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                go(1);
              }}
              className="absolute right-1.5 top-1/2 z-10 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white"
            >
              <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden="true">
                <path d="M2.5 1 L7 4.5 L2.5 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          <div className="absolute bottom-1.5 left-1/2 z-10 flex -translate-x-1/2 gap-1">
            {pages.map((_, i) => (
              <span key={i} className={`h-1 w-1 rounded-full ${i === safePage ? "bg-white" : "bg-white/45"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
