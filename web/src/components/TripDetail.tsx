"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import type { InferSelectModel } from "drizzle-orm";
import type { trips, tripDays, tripEvents, eventPhotos, users } from "@/db/schema";
import { purchaseTrip, toggleLike, toggleSave } from "@/app/(app)/trips/[id]/actions";
import { AddToCalendar } from "@/components/AddToCalendar";
import { monthSeasonLabel } from "@/lib/trip-filters";

type EventPhoto = InferSelectModel<typeof eventPhotos>;
type TripEvent = InferSelectModel<typeof tripEvents> & { photos: EventPhoto[] };
type TripDay = InferSelectModel<typeof tripDays> & { events: TripEvent[] };
type Trip = InferSelectModel<typeof trips> & {
  author: InferSelectModel<typeof users>;
  days: TripDay[];
};

const PPM = 26 / 15; // pixel per minute

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function fmt(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function mapUrl(place: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}

function tabelogUrl(place: string): string {
  return `https://tabelog.com/rstLst/?sw=${encodeURIComponent(place)}`;
}

export function TripDetail({
  trip,
  initialSaved,
  initialLiked,
  isLoggedIn,
  purchased: initialPurchased,
  coinBalance,
}: {
  trip: Trip;
  initialSaved: boolean;
  initialLiked: boolean;
  isLoggedIn: boolean;
  purchased: boolean;
  coinBalance: number;
}) {
  const [dayIndex, setDayIndex] = useState(0);
  const [layer, setLayer] = useState<"plan" | "actual">("plan");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saved, setSaved] = useState(initialSaved);
  const [saveCount, setSaveCount] = useState(trip.savesCount);
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(trip.likesCount);
  const [purchased, setPurchased] = useState(initialPurchased);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [coinSheetOpen, setCoinSheetOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleToggleSave() {
    startTransition(async () => {
      const result = await toggleSave(trip.id);
      setSaved(result.saved);
      setSaveCount(result.savesCount);
    });
  }

  function handleToggleLike() {
    startTransition(async () => {
      const result = await toggleLike(trip.id);
      setLiked(result.liked);
      setLikeCount(result.likesCount);
    });
  }

  function handlePurchase(method: "yen" | "coin") {
    if (!isLoggedIn) return;
    setPurchaseError(null);
    startTransition(async () => {
      const result = await purchaseTrip(trip.id, method);
      if (result.ok) {
        setPurchased(true);
        setCoinSheetOpen(false);
      } else {
        setPurchaseError(result.error);
      }
    });
  }

  const day = trip.days[dayIndex];
  const hasDetail = trip.days.length > 0 && day?.events.length > 0;
  const paidFrom = purchased ? null : trip.paidFromEventOrder;
  const lockedCount =
    paidFrom != null && day ? Math.max(0, day.events.length - paidFrom) : null;

  const paywall =
    paidFrom != null ? (
      <Paywall
        priceYen={trip.priceYen}
        priceCoin={trip.priceCoin}
        lockedCount={lockedCount}
        isLoggedIn={isLoggedIn}
        coinBalance={coinBalance}
        isPending={isPending}
        error={purchaseError}
        onBuyYen={() => handlePurchase("yen")}
        onOpenCoinSheet={() => {
          setPurchaseError(null);
          setCoinSheetOpen(true);
        }}
      />
    ) : null;

  if (!hasDetail) {
    return (
      <div className="flex flex-1 flex-col">
        <TripHeader trip={trip} saved={saved} saveCount={saveCount} />
        {paywall ? (
          <div className="flex-1 overflow-y-auto bg-surface-2 px-4 py-5">
            <p className="mb-4 text-[13px] leading-[1.7] text-ink-2">
              この旅程の中身（時間割・立ち寄り先・気をつけること）は有料です。
              購入すると全編が読めます。
            </p>
            {paywall}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-[13px] text-ink-3">
            この旅程はまだ時間割の詳細が登録されていません。
          </div>
        )}
        {coinSheetOpen && trip.priceCoin != null && (
          <CoinSheet
            priceCoin={trip.priceCoin}
            balance={coinBalance}
            isPending={isPending}
            error={purchaseError}
            onConfirm={() => handlePurchase("coin")}
            onClose={() => setCoinSheetOpen(false)}
          />
        )}
        <SaveLikeBar
          isLoggedIn={isLoggedIn}
          isPending={isPending}
          liked={liked}
          likeCount={likeCount}
          saved={saved}
          onToggleLike={handleToggleLike}
          onToggleSave={handleToggleSave}
          onCalendar={() => setCalOpen(true)}
        />
        {calOpen && (
          <AddToCalendar
            tripId={trip.id}
            dayCount={trip.days.length || 1}
            onClose={() => setCalOpen(false)}
          />
        )}
      </div>
    );
  }

  const open = toMinutes(day.openTime);
  const close = toMinutes(day.closeTime);
  const gridHeight = (close - open) * PPM;

  return (
    <div className="flex flex-1 flex-col">
      <TripHeader trip={trip} saved={saved} saveCount={saveCount} />

      <div className="flex gap-1 bg-surface px-4 pt-2.5">
        {trip.days.map((d, i) => (
          <button
            key={d.id}
            onClick={() => {
              setDayIndex(i);
              setExpandedId(null);
            }}
            className={`rounded-t-lg px-[11px] py-[7px] text-[12.5px] font-medium ${
              i === dayIndex ? "bg-surface-2 text-ink" : "text-ink-3"
            }`}
          >
            DAY {i + 1}
            {d.dateLabel && ` — ${d.dateLabel}`}
          </button>
        ))}
      </div>

      <div className="bg-surface-2 px-4 pb-1 pt-[11px]">
        <div className="flex gap-[3px] rounded-[10px] border border-line bg-surface p-[3px]">
          {(["plan", "actual"] as const).map((l) => (
            <button
              key={l}
              onClick={() => {
                setLayer(l);
                setExpandedId(null);
              }}
              className={`flex-1 rounded-[7px] py-[7px] text-[13px] font-bold ${
                l === layer
                  ? l === "plan"
                    ? "bg-plan text-white"
                    : "bg-actual text-white"
                  : "text-ink-3"
              }`}
            >
              {l === "plan" ? "計画" : "実際"}
            </button>
          ))}
        </div>
        <p className="my-2 text-[11.5px] leading-[1.55] text-ink-2">
          {layer === "plan"
            ? "この旅程の「計画」です。実際に切り替えると、押した時間と気をつけることが出ます。"
            : "実際に行った時刻に変わりました。予定をタップすると「気をつけること」が読めます。"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-surface-2 px-3 pb-6">
        <div className="relative pl-11" style={{ height: gridHeight }}>
          <div
            className="pointer-events-none absolute inset-0 left-11 rounded-md opacity-45"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to bottom, var(--line) 0 1px, transparent 1px 26px), repeating-linear-gradient(to bottom, var(--ink-3) 0 1px, transparent 1px 104px)",
            }}
          />
          {Array.from({ length: Math.floor((close - Math.ceil(open / 60) * 60) / 60) + 1 }).map(
            (_, i) => {
              const m = Math.ceil(open / 60) * 60 + i * 60;
              return (
                <span
                  key={m}
                  className="absolute left-0 w-[38px] -translate-y-[7px] text-right font-mono-num text-[11px] tabular-nums text-ink-3"
                  style={{ top: (m - open) * PPM }}
                >
                  {fmt(m)}
                </span>
              );
            }
          )}

          {day.events.map((ev) => {
            const startStr = (layer === "plan" ? ev.planStart : ev.actualStart) ?? ev.planStart;
            const endStr = (layer === "plan" ? ev.planEnd : ev.actualEnd) ?? ev.planEnd;
            const s0 = toMinutes(startStr);
            const e0 = toMinutes(endStr);
            const dur = e0 - s0;
            const locked = paidFrom != null && ev.orderIndex >= paidFrom;
            const expanded = expandedId === ev.id;
            const shiftMin = toMinutes(ev.actualStart ?? ev.planStart) - toMinutes(ev.planStart);

            return (
              <div
                key={ev.id}
                role="button"
                tabIndex={locked ? -1 : 0}
                onClick={() => !locked && setExpandedId(expanded ? null : ev.id)}
                onKeyDown={(e) => {
                  if (!locked && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    setExpandedId(expanded ? null : ev.id);
                  }
                }}
                className={`absolute left-11 right-0 overflow-hidden rounded-[9px] border border-line bg-surface px-2.5 py-[7px] ${
                  layer === "plan" ? "border-l-[3px] border-l-plan" : "border-l-[3px] border-l-actual"
                } ${locked ? "pointer-events-none blur-[3.5px]" : "cursor-pointer"}`}
                style={{
                  top: (s0 - open) * PPM,
                  height: expanded ? undefined : dur * PPM - 4,
                  minHeight: expanded ? dur * PPM - 4 : undefined,
                }}
              >
                <div className="font-mono-num text-[11.5px] font-medium tabular-nums text-plan data-[layer=actual]:text-actual">
                  <span className={layer === "actual" ? "text-actual" : "text-plan"}>
                    {fmt(s0)}–{fmt(e0)}
                  </span>
                  <span className="ml-1.5 font-normal text-ink-3">{dur}分</span>
                  {layer === "actual" && shiftMin !== 0 && (
                    <span className="ml-1.5 rounded-[4px] bg-actual-soft px-[5px] py-px font-mono-num text-[10.5px] tabular-nums text-actual">
                      予定より{shiftMin > 0 ? "+" : ""}
                      {shiftMin}分
                    </span>
                  )}
                </div>
                <div className="my-px text-[13.5px] font-bold leading-[1.45]">{ev.title}</div>
                <div className="flex items-center gap-1 text-[11.5px] text-ink-2">
                  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                    <path
                      d="M5 0C3 0 1.6 1.5 1.6 3.4 1.6 5.9 5 10 5 10s3.4-4.1 3.4-6.6C8.4 1.5 7 0 5 0zm0 4.8a1.4 1.4 0 110-2.8 1.4 1.4 0 010 2.8z"
                      fill="currentColor"
                    />
                  </svg>
                  {ev.place}
                </div>
                {ev.photos.length > 0 && (
                  <div className="scrollbar-none mt-[7px] flex gap-[5px] overflow-x-auto" onClick={(e) => e.stopPropagation()}>
                    {ev.photos.map((p) => (
                      <span key={p.id} className="relative block h-[45px] w-[60px] shrink-0 overflow-hidden rounded-md bg-surface-2">
                        <Image src={p.url} alt={ev.title} fill sizes="60px" className="object-cover" />
                      </span>
                    ))}
                  </div>
                )}
                {expanded && (
                  <>
                    {ev.detail && <div className="mt-[7px] text-[11.5px] leading-[1.65] text-ink-2">{ev.detail}</div>}
                    {layer === "actual" && ev.caution && (
                      <div className="mt-2 rounded-[7px] bg-actual-soft px-[9px] py-[7px] text-[11.5px] leading-[1.6] text-ink">
                        <b className="mb-0.5 block text-[10.5px] tracking-wide text-actual">気をつけること</b>
                        {ev.caution}
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={ev.mapUrl || mapUrl(ev.place)}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface-3 px-[9px] py-[5px] text-[11px] font-medium text-ink-2"
                      >
                        📍 Googleマップで見る
                      </a>
                      {(ev.tabelogUrl || ev.category === "food") && (
                        <a
                          href={ev.tabelogUrl || tabelogUrl(ev.place)}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface-3 px-[9px] py-[5px] text-[11px] font-medium text-ink-2"
                        >
                          🍴 食べログで見る
                        </a>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {paywall && <div className="mt-4">{paywall}</div>}
      </div>

      {coinSheetOpen && trip.priceCoin != null && (
        <CoinSheet
          priceCoin={trip.priceCoin}
          balance={coinBalance}
          isPending={isPending}
          error={purchaseError}
          onConfirm={() => handlePurchase("coin")}
          onClose={() => setCoinSheetOpen(false)}
        />
      )}

      <SaveLikeBar
        isLoggedIn={isLoggedIn}
        isPending={isPending}
        liked={liked}
        likeCount={likeCount}
        saved={saved}
        onToggleLike={handleToggleLike}
        onToggleSave={handleToggleSave}
        onCalendar={() => setCalOpen(true)}
      />
      {calOpen && (
        <AddToCalendar
          tripId={trip.id}
          dayCount={trip.days.length || 1}
          onClose={() => setCalOpen(false)}
        />
      )}
    </div>
  );
}

function SaveLikeBar({
  isLoggedIn,
  isPending,
  liked,
  likeCount,
  saved,
  onToggleLike,
  onToggleSave,
  onCalendar,
}: {
  isLoggedIn: boolean;
  isPending: boolean;
  liked: boolean;
  likeCount: number;
  saved: boolean;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onCalendar: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 border-t border-line-soft bg-surface px-4 py-3.5">
      <button
        onClick={onToggleLike}
        disabled={!isLoggedIn || isPending}
        aria-label="いいね"
        className={`flex shrink-0 items-center gap-1 rounded-[11px] border px-3.5 py-3 text-[13px] font-bold disabled:opacity-50 ${
          liked ? "border-actual bg-actual-soft text-actual" : "border-line text-ink-2"
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill={liked ? "currentColor" : "none"} aria-hidden="true">
          <path
            d="M8 14s-6-3.7-6-8.2C2 3.1 3.8 1.5 6 1.5c1.1 0 2.1.5 2 1.5.9-1 1.9-1.5 3-1.5 2.2 0 4 1.6 4 4.3 0 4.5-6 8.2-6 8.2z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
        {likeCount}
      </button>
      <button
        onClick={onCalendar}
        aria-label="カレンダーに追加"
        className="flex shrink-0 items-center justify-center rounded-[11px] border border-line px-3.5 py-3 text-ink-2"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2" y="3" width="12" height="11" rx="1.6" stroke="currentColor" strokeWidth="1.4" />
          <path d="M2 6.5 H14 M5.5 1.5 V4 M10.5 1.5 V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
      {isLoggedIn ? (
        <button
          onClick={onToggleSave}
          disabled={isPending}
          className={`flex-1 rounded-[11px] py-3 text-[14px] font-bold disabled:opacity-50 ${
            saved ? "bg-surface-2 text-ink-2" : "bg-plan text-white"
          }`}
        >
          {saved ? "保存しました" : "この旅程を保存"}
        </button>
      ) : (
        <SignInButton mode="modal">
          <button className="flex-1 rounded-[11px] bg-plan py-3 text-[14px] font-bold text-white">
            ログインして保存
          </button>
        </SignInButton>
      )}
    </div>
  );
}

function TripHeader({
  trip,
  saved,
  saveCount,
}: {
  trip: Trip;
  saved: boolean;
  saveCount: number;
}) {
  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-3.5">
        <Link href="/" className="grid h-8 w-8 place-items-center rounded-[9px] border border-line text-ink-2" aria-label="戻る">
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M9 1 L3 7 L9 13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="flex-1 font-display text-[17px] font-semibold">旅程</h1>
        <Link href={`/trips/${trip.id}/share`} className="grid h-8 w-8 place-items-center rounded-[9px] border border-line text-ink-2" aria-label="共有する">
          <svg width="15" height="15" viewBox="0 0 16 16">
            <circle cx="12" cy="3.5" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="4" cy="8" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="12" cy="12.5" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M6 7 L10 4.6M6 9 L10 11.4" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </Link>
      </div>
      <div className="border-b border-line-soft bg-surface px-4 py-4">
        <h2 className="mb-2 font-display text-[20px] font-semibold leading-[1.4]">{trip.title}</h2>
        <div className="mb-[11px] flex flex-wrap gap-1.5">
          <span className="rounded-full bg-plan-soft px-2.5 py-1 text-[11.5px] font-medium text-plan">#{trip.genre}</span>
          <span className="rounded-full bg-plan-soft px-2.5 py-1 text-[11.5px] font-medium text-plan">#{trip.daysLabel}</span>
          {monthSeasonLabel(trip.startDate) && (
            <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11.5px] font-medium text-ink-2">
              {monthSeasonLabel(trip.startDate)}
            </span>
          )}
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11.5px] font-medium text-ink-2">
            #{trip.international ? "海外" : "国内"}
          </span>
          <span className="rounded-full bg-surface-2 px-2.5 py-1 font-mono-num text-[11.5px] font-medium tabular-nums text-ink-2">
            {trip.partySizeMin}
            {trip.partySizeMax ? `〜${trip.partySizeMax}` : "〜"}人
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-[12.5px] text-ink-2">
          <span className="h-[26px] w-[26px] shrink-0 rounded-full bg-gradient-to-br from-[#8FB4E8] to-[#C79BD8]" />
          <span>{trip.author.name}</span>
          <span className="ml-auto font-mono-num text-[12px] tabular-nums">{saveCount}人が保存</span>
        </div>
      </div>
    </>
  );
}

// note風の有料区切り＋購入パネル（無料プレビューの下に置く）
function Paywall({
  priceYen,
  priceCoin,
  lockedCount,
  isLoggedIn,
  coinBalance,
  isPending,
  error,
  onBuyYen,
  onOpenCoinSheet,
}: {
  priceYen: number;
  priceCoin: number | null;
  lockedCount: number | null;
  isLoggedIn: boolean;
  coinBalance: number;
  isPending: boolean;
  error: string | null;
  onBuyYen: () => void;
  onOpenCoinSheet: () => void;
}) {
  return (
    <div className="mx-1">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-bold tracking-wide text-money">
        <span className="h-px flex-1 bg-money/40" />
        ここから先は有料です
        <span className="h-px flex-1 bg-money/40" />
      </div>
      <div className="rounded-2xl border border-money bg-surface p-4">
        <p className="mb-1 text-[12.5px] leading-[1.65] text-ink-2">
          {lockedCount != null && lockedCount > 0 ? (
            <>
              のこり<b className="text-ink">{lockedCount}件</b>の予定と、ぜんぶの「気をつけること」・立ち寄り先が読めます。
            </>
          ) : (
            <>この旅程の時間割・立ち寄り先・気をつけることが、ぜんぶ読めます。</>
          )}
        </p>
        <div className="my-3 flex items-baseline gap-2">
          <span className="font-mono-num text-[24px] font-medium tabular-nums text-money">
            ¥{priceYen.toLocaleString()}
          </span>
          {priceCoin != null && (
            <span className="font-mono-num text-[13px] tabular-nums text-coin">
              または 🪙{priceCoin.toLocaleString()}
            </span>
          )}
        </div>
        {error && <p className="mb-2 text-[11.5px] leading-[1.5] text-actual">{error}</p>}
        {isLoggedIn ? (
          <div className="flex flex-col gap-2">
            <button
              onClick={onBuyYen}
              disabled={isPending}
              className="rounded-[11px] bg-money px-5 py-3 text-[14px] font-bold text-white disabled:opacity-50"
            >
              ¥{priceYen.toLocaleString()}で購入する
            </button>
            {priceCoin != null && (
              <button
                onClick={onOpenCoinSheet}
                disabled={isPending}
                className="rounded-[11px] border border-coin px-5 py-3 text-[14px] font-bold text-coin disabled:opacity-50"
              >
                🪙 コインで購入する（残高 🪙{coinBalance.toLocaleString()}）
              </button>
            )}
          </div>
        ) : (
          <SignInButton mode="modal">
            <button className="w-full rounded-[11px] bg-money px-5 py-3 text-[14px] font-bold text-white">
              ログインして購入する
            </button>
          </SignInButton>
        )}
      </div>
    </div>
  );
}

// コイン支払い画面（確認シート）。残高が足りなければチャージ画面へ誘導する。
function CoinSheet({
  priceCoin,
  balance,
  isPending,
  error,
  onConfirm,
  onClose,
}: {
  priceCoin: number;
  balance: number;
  isPending: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const short = balance < priceCoin;
  const deficit = priceCoin - balance;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="コインで購入">
      <button aria-label="閉じる" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-[440px] rounded-t-[20px] border border-line bg-surface px-5 pb-7 pt-4">
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-line" />
        <h2 className="mb-3 font-display text-[16px] font-semibold">コインで購入</h2>
        <dl className="mb-4 flex flex-col gap-1.5 text-[13px]">
          <div className="flex justify-between">
            <dt className="text-ink-3">この旅程</dt>
            <dd className="font-mono-num tabular-nums text-coin">🪙{priceCoin.toLocaleString()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-3">いまの残高</dt>
            <dd className="font-mono-num tabular-nums text-ink-2">🪙{balance.toLocaleString()}</dd>
          </div>
          {short && (
            <div className="flex justify-between">
              <dt className="text-actual">不足</dt>
              <dd className="font-mono-num tabular-nums text-actual">🪙{deficit.toLocaleString()}</dd>
            </div>
          )}
        </dl>
        {error && (
          <p className="mb-3 rounded-[9px] bg-actual-soft px-3 py-2 text-[12px] leading-[1.6] text-actual">{error}</p>
        )}
        {short ? (
          <Link
            href="/me/charge"
            className="block rounded-[11px] bg-coin px-5 py-3 text-center text-[14px] font-bold text-white"
          >
            コインをチャージする
          </Link>
        ) : (
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="w-full rounded-[11px] bg-coin px-5 py-3 text-[14px] font-bold text-white disabled:opacity-50"
          >
            {isPending ? "処理中…" : `🪙${priceCoin.toLocaleString()} を使って購入する`}
          </button>
        )}
        <p className="mt-2 text-center text-[11px] text-ink-3">購入すると全編が読めます。</p>
      </div>
    </div>
  );
}
