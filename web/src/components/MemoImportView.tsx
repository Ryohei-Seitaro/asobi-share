"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createTripFromMemo } from "@/app/(app)/create/actions";
import { parseMemoText, toMinutes, fmt, type ParsedMemoDay } from "@/lib/memoParser";
import { GENRE_TAXONOMY, ALL_SUBGENRES } from "@/lib/genres";

// Server Actionのredirect()は例外として実装されているため、try/catchで誤って
// 握りつぶさないよう再スローする（Next.js公式の回避パターン）。
function isNextRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function MemoImportView() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [genre, setGenre] = useState(ALL_SUBGENRES[0]);
  const [startDate, setStartDate] = useState("");
  const [international, setInternational] = useState(false);
  const [partySizeMin, setPartySizeMin] = useState(2);
  const [partySizeMax, setPartySizeMax] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const parsed = useMemo(() => (text.trim() ? parseMemoText(text) : null), [text]);
  const totalEvents = parsed?.days.reduce((n, d) => n + d.events.length, 0) ?? 0;

  async function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const urls = await Promise.all(files.map(readFileAsDataUrl));
    setPhotos((p) => [...p, ...urls]);
    e.target.value = "";
  }

  function removePhoto(i: number) {
    setPhotos((p) => p.filter((_, idx) => idx !== i));
  }

  function submit() {
    if (!parsed) return;
    setError(null);
    startTransition(async () => {
      try {
        await createTripFromMemo({
          title: parsed.title,
          genre,
          startDate: startDate || null,
          international,
          partySizeMin,
          partySizeMax: partySizeMax ? Number(partySizeMax) : null,
          coverPhotos: photos,
          days: parsed.days.map((d) => ({
            dateLabel: d.dateLabel,
            events: d.events.map((ev) => ({
              title: ev.title,
              place: ev.place,
              start: ev.start,
              end: ev.end,
              detail: ev.detail,
            })),
          })),
        });
      } catch (err) {
        if (isNextRedirectError(err)) throw err;
        setError(err instanceof Error ? err.message : "投稿の作成に失敗しました");
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-3.5">
        <Link
          href="/create"
          aria-label="つくるへ戻る"
          className="grid h-8 w-8 place-items-center rounded-[9px] border border-line text-ink-2"
        >
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M9 1 L3 7 L9 13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="font-display text-[17px] font-semibold">メモから旅程をつくる</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-[18px]">
        <p className="mb-3 text-[12px] leading-[1.7] text-ink-2">
          他のメモアプリなどで書いた旅程のテキストと写真を貼り付けると、この媒体のフォーマット（1日ごとの時間割）に自動で整えます。
          <br />
          例：<br />
          <span className="text-ink-3">
            京都1泊2日
            <br />
            1日目
            <br />
            9:15 京都駅到着
            <br />
            10:05-11:40 伏見稲荷大社
          </span>
        </p>

        <label htmlFor="memo-text" className="mb-1.5 block text-[11px] tracking-wide text-ink-3">
          旅程のメモを貼り付け
        </label>
        <textarea
          id="memo-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"京都1泊2日\n1日目\n9:15 京都駅到着\n10:05-11:40 伏見稲荷大社 千本鳥居"}
          className="mb-4 min-h-[160px] w-full resize-y rounded-[9px] border border-line bg-surface-3 px-[11px] py-[9px] text-[13.5px] text-ink"
        />

        <label className="mb-1.5 block text-[11px] tracking-wide text-ink-3">いつ行った？（開始日・任意）</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="mb-4 w-full rounded-[9px] border border-line bg-surface-3 px-[11px] py-[9px] text-[13.5px] text-ink"
        />

        <label className="mb-1.5 block text-[11px] tracking-wide text-ink-3">ジャンル（カテゴリ ＞ 種類）</label>
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="mb-4 w-full rounded-[9px] border border-line bg-surface-3 px-[11px] py-[9px] text-[13.5px] text-ink"
        >
          {GENRE_TAXONOMY.map((cat) => (
            <optgroup key={cat.category} label={cat.category}>
              {cat.subgenres.map((g) => (
                <option key={g} value={g}>
                  {cat.category} ＞ {g}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <label className="mb-1.5 block text-[11px] tracking-wide text-ink-3">国内・海外</label>
        <div className="mb-4 flex gap-[9px]">
          {([
            ["国内", false],
            ["海外", true],
          ] as const).map(([label, val]) => (
            <button
              key={label}
              type="button"
              onClick={() => setInternational(val)}
              className={`flex-1 rounded-[9px] border py-[9px] text-[13.5px] ${
                international === val
                  ? "border-plan bg-plan-soft font-bold text-plan"
                  : "border-line bg-surface-3 text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="mb-1.5 block text-[11px] tracking-wide text-ink-3">おすすめの人数</label>
        <div className="mb-1 flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={partySizeMin}
            onChange={(e) => setPartySizeMin(Math.max(1, Number(e.target.value) || 1))}
            aria-label="最少人数"
            className="w-full rounded-[9px] border border-line bg-surface-3 px-[11px] py-[9px] text-[13.5px] text-ink"
          />
          <span className="shrink-0 text-[12.5px] text-ink-3">人 〜</span>
          <input
            type="number"
            min={1}
            value={partySizeMax}
            onChange={(e) => setPartySizeMax(e.target.value)}
            placeholder="上限なし"
            aria-label="最大人数"
            className="w-full rounded-[9px] border border-line bg-surface-3 px-[11px] py-[9px] text-[13.5px] text-ink"
          />
          <span className="shrink-0 text-[12.5px] text-ink-3">人</span>
        </div>
        <p className="mb-4 text-[10.5px] text-ink-3">「見つける」のフィルタで使われます。</p>

        <label className="mb-1.5 block text-[11px] tracking-wide text-ink-3">写真（枚数の上限なし）</label>
        <div className="mb-4 flex flex-wrap gap-2">
          {photos.map((url, i) => (
            <div key={i} className="relative h-[64px] w-[64px] overflow-hidden rounded-[9px] bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URLはnext/imageで最適化できないため */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                onClick={() => removePhoto(i)}
                aria-label="写真を削除"
                className="absolute right-0.5 top-0.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-black/60 text-[10px] text-white"
              >
                ×
              </button>
            </div>
          ))}
          <label className="grid h-[64px] w-[64px] cursor-pointer place-items-center rounded-[9px] border border-dashed border-line bg-surface-3 text-[10.5px] text-ink-3">
            ＋写真
            <input type="file" accept="image/*" multiple onChange={handlePhotos} className="hidden" />
          </label>
        </div>

        {parsed && (
          <div className="mb-4 rounded-[12px] border border-line bg-surface p-3.5">
            <p className="mb-2 text-[11px] tracking-wide text-ink-3">
              投稿するとこの内容で公開されます（{totalEvents}件の予定を検出）
            </p>
            <p className="mb-2 text-[15px] font-bold leading-[1.4]">{parsed.title}</p>
            {parsed.days.length === 0 && (
              <p className="text-[12px] text-ink-3">
                時刻（例：10:00 や 10:00-11:00）を含む行が見つかりませんでした。行の先頭に時刻を書くと予定として認識されます。
              </p>
            )}
            {parsed.days.map((d, i) => (
              <div key={i} className="mb-3 last:mb-0">
                <p className="mb-1 text-[12px] font-bold text-ink-2">{d.dateLabel}</p>
                {d.events.length === 0 && <p className="text-[11.5px] text-ink-3">予定なし</p>}
                <MemoTimelinePreview day={d} />
                <ul className="mt-1.5 flex flex-col gap-1">
                  {d.events.map((ev, j) => (
                    <li key={j} className="rounded-[8px] bg-surface-3 px-[9px] py-[6px] text-[12px]">
                      <span className="font-mono-num font-bold tabular-nums text-plan">
                        {ev.start}–{ev.end}
                      </span>{" "}
                      <span className="font-medium">{ev.title}</span>
                      {ev.place && <span className="text-ink-2">（{ev.place}）</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {error && <p className="mb-3 text-[12px] leading-[1.5] text-actual">{error}</p>}

        <button
          onClick={submit}
          disabled={isPending || !parsed || totalEvents === 0}
          className="w-full rounded-xl bg-plan py-[14px] text-[14.5px] font-bold text-white disabled:opacity-50"
        >
          この内容で投稿する
        </button>
        <button
          onClick={() => router.push("/create")}
          className="mt-2 w-full rounded-xl bg-surface-2 py-[12px] text-[13px] font-bold text-ink-2"
        >
          やめる
        </button>
      </div>
    </>
  );
}

const PREVIEW_PPM = 1.6; // pixel per minute（メモプレビュー用に少しコンパクトに）

function MemoTimelinePreview({ day }: { day: ParsedMemoDay }) {
  if (day.events.length === 0) return null;

  const starts = day.events.map((ev) => toMinutes(ev.start));
  const ends = day.events.map((ev) => toMinutes(ev.end));
  const open = Math.max(0, Math.min(...starts) - 30);
  const close = Math.min(24 * 60, Math.max(...ends) + 30);
  const hourStart = Math.ceil(open / 60) * 60;
  const hourLines = Math.max(0, Math.floor((close - hourStart) / 60) + 1);

  return (
    <div
      className="relative overflow-hidden rounded-[10px] border border-line bg-surface-2"
      style={{ height: (close - open) * PREVIEW_PPM + 12 }}
    >
      <div
        className="pointer-events-none absolute inset-y-1.5 left-10 right-2 opacity-40"
        style={{
          backgroundImage: "repeating-linear-gradient(to bottom, var(--line) 0 1px, transparent 1px 60px)",
        }}
      />
      {Array.from({ length: hourLines }).map((_, i) => {
        const m = hourStart + i * 60;
        return (
          <span
            key={m}
            className="absolute left-0 w-9 -translate-y-[6px] text-right font-mono-num text-[10px] tabular-nums text-ink-3"
            style={{ top: (m - open) * PREVIEW_PPM + 6 }}
          >
            {fmt(m)}
          </span>
        );
      })}
      {day.events.map((ev, i) => {
        const s = toMinutes(ev.start);
        const e = toMinutes(ev.end);
        return (
          <div
            key={i}
            className="absolute left-10 right-2 overflow-hidden rounded-[7px] border border-line border-l-[3px] border-l-plan bg-surface px-2 py-[3px]"
            style={{ top: (s - open) * PREVIEW_PPM + 6, height: Math.max(16, (e - s) * PREVIEW_PPM - 2) }}
          >
            <span className="font-mono-num text-[10px] font-bold tabular-nums text-plan">
              {ev.start}–{ev.end}
            </span>
            <span className="ml-1 text-[11px] font-medium">{ev.title}</span>
          </div>
        );
      })}
    </div>
  );
}
