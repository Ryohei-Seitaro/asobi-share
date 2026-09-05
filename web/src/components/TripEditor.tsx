"use client";

import { useState, useTransition } from "react";
import type { InferSelectModel } from "drizzle-orm";
import type { trips, tripDays, tripEvents } from "@/db/schema";
import { addDay, addEvent, publishTrip, setPaidFrom } from "@/app/(app)/create/actions";

type TripEvent = InferSelectModel<typeof tripEvents>;
type TripDay = InferSelectModel<typeof tripDays> & { events: TripEvent[] };
type Trip = InferSelectModel<typeof trips> & { days: TripDay[] };

const PPM = 26 / 15;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function fmt(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const INPUT_CLASS =
  "w-full rounded-[9px] border border-line bg-surface-3 px-[11px] py-[9px] text-[13.5px] text-ink";

const CATEGORY_LABEL: Record<string, string> = {
  sightseeing: "観光",
  food: "食事",
  transport: "移動",
  other: "その他",
};

export function TripEditor({ trip }: { trip: Trip }) {
  const [dayIndex, setDayIndex] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [showPrice, setShowPrice] = useState(false);
  const [priceMode, setPriceMode] = useState<"free" | "paid">(trip.priceYen > 0 ? "paid" : "free");
  const [priceYen, setPriceYen] = useState(trip.priceYen || 480);
  const [visibility, setVisibility] = useState<"public" | "friends" | "private">(trip.visibility);
  const [isPending, startTransition] = useTransition();

  const day = trip.days[dayIndex];
  const open = day ? toMinutes(day.openTime) : 0;
  const close = day ? toMinutes(day.closeTime) : 0;

  function handleAddDay() {
    startTransition(() => addDay(trip.id));
  }

  function handlePublish() {
    startTransition(() =>
      publishTrip(trip.id, {
        visibility,
        priceYen: priceMode === "paid" ? priceYen : 0,
        priceCoin: priceMode === "paid" ? Math.round(priceYen / 2) : null,
      })
    );
  }

  function handleTogglePaidFrom(orderIndex: number) {
    const next = trip.paidFromEventOrder === orderIndex + 1 ? null : orderIndex + 1;
    startTransition(() => setPaidFrom(trip.id, next));
  }

  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-3.5">
        <h1 className="flex-1 font-display text-[17px] font-semibold">旅程をつくる</h1>
        <button
          onClick={() => setShowPrice(true)}
          aria-label="公開設定と値づけ"
          className="grid h-8 w-8 place-items-center rounded-[9px] border border-line text-ink-2"
        >
          <svg width="15" height="15" viewBox="0 0 16 16">
            <path
              d="M8 1v14M11 4H6.5a2 2 0 100 4h3a2 2 0 110 4H4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="flex gap-1 bg-surface px-4 pt-2.5">
        {trip.days.map((d, i) => (
          <button
            key={d.id}
            onClick={() => setDayIndex(i)}
            className={`rounded-t-lg px-[11px] py-[7px] text-[12.5px] font-medium ${
              i === dayIndex ? "bg-surface-2 text-ink" : "text-ink-3"
            }`}
          >
            DAY {i + 1}
            {d.dateLabel && ` — ${d.dateLabel}`}
          </button>
        ))}
        <button onClick={handleAddDay} disabled={isPending} className="px-[11px] py-[7px] text-[12.5px] text-ink-3">
          ＋ 日を足す
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="relative min-h-0 flex-1 overflow-y-auto bg-surface-2 px-3 pb-24 pt-2.5">
        {day && (
          <div className="relative pl-11" style={{ height: (close - open) * PPM }}>
            <div
              className="pointer-events-none absolute inset-0 left-11 rounded-md opacity-45"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to bottom, var(--line) 0 1px, transparent 1px 26px), repeating-linear-gradient(to bottom, var(--ink-3) 0 1px, transparent 1px 104px)",
              }}
            />
            {day.events.map((ev, i) => {
              const s0 = toMinutes(ev.planStart);
              const e0 = toMinutes(ev.planEnd);
              const dur = e0 - s0;
              const isPaidBoundary = trip.paidFromEventOrder === i + 1;
              const behindPaywall = trip.paidFromEventOrder != null && i >= trip.paidFromEventOrder;

              return (
                <div key={ev.id}>
                  <div
                    className={`absolute left-11 right-0 overflow-hidden rounded-[9px] border border-line border-l-[3px] border-l-plan bg-surface px-2.5 py-[7px] ${
                      behindPaywall ? "bg-coin-soft" : ""
                    }`}
                    style={{ top: (s0 - open) * PPM, height: dur * PPM - 4 }}
                  >
                    <div className="font-mono-num text-[11.5px] font-medium tabular-nums text-plan">
                      {fmt(s0)}–{fmt(e0)}
                      <span className="ml-1.5 font-normal text-ink-3">{dur}分 ・ {CATEGORY_LABEL[ev.category]}</span>
                    </div>
                    <div className="text-[13.5px] font-bold leading-[1.45]">{ev.title}</div>
                    <div className="text-[11.5px] text-ink-2">{ev.place}</div>
                  </div>
                  {i < day.events.length - 1 && (
                    <div
                      className="absolute left-11 right-0 z-[2] flex items-center"
                      style={{ top: (e0 - open) * PPM - 1 }}
                    >
                      <span className={`h-[2px] flex-1 ${isPaidBoundary ? "bg-coin" : "bg-transparent"}`} />
                      <button
                        onClick={() => handleTogglePaidFrom(i)}
                        disabled={isPending}
                        className={`whitespace-nowrap rounded-full border px-[9px] py-[3px] text-[10.5px] font-bold ${
                          isPaidBoundary
                            ? "border-coin bg-coin text-white"
                            : "border-coin bg-coin-soft text-coin"
                        }`}
                      >
                        {isPaidBoundary ? "🪙 ここまでを無料に戻す" : "🪙 ここから先を有料にする"}
                      </button>
                      <span className={`h-[2px] flex-1 ${isPaidBoundary ? "bg-coin" : "bg-transparent"}`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

        <button
          onClick={() => setShowAdd(true)}
          className="absolute bottom-4 right-4 z-40 rounded-full bg-plan px-[18px] py-[11px] text-[13px] font-bold text-white shadow-lg"
        >
          ＋ 予定を置く
        </button>
      </div>

      {showAdd && day && (
        <AddEventSheet
          tripId={trip.id}
          dayId={day.id}
          onClose={() => setShowAdd(false)}
        />
      )}

      {showPrice && (
        <PriceSheet
          priceMode={priceMode}
          setPriceMode={setPriceMode}
          priceYen={priceYen}
          setPriceYen={setPriceYen}
          visibility={visibility}
          setVisibility={setVisibility}
          onClose={() => setShowPrice(false)}
          onPublish={handlePublish}
          pending={isPending}
        />
      )}
    </>
  );
}

function AddEventSheet({
  tripId,
  dayId,
  onClose,
}: {
  tripId: string;
  dayId: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [category, setCategory] = useState<"sightseeing" | "food" | "transport" | "other">("sightseeing");
  const [start, setStart] = useState("10:00");
  const [len, setLen] = useState(60);
  const [detail, setDetail] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!title || !place) return;
    const s = toMinutes(start);
    startTransition(async () => {
      await addEvent(tripId, dayId, {
        title,
        place,
        category,
        planStart: fmt(s),
        planEnd: fmt(s + len),
        detail,
      });
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="max-h-[85%] w-full max-w-[480px] overflow-y-auto rounded-t-2xl bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 font-display text-[16px] font-semibold">予定を置く</h3>
        <Field label="なにをする">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT_CLASS} />
        </Field>
        <Field label="どこへ行く">
          <input value={place} onChange={(e) => setPlace(e.target.value)} className={INPUT_CLASS} />
        </Field>
        <Field label="ジャンル">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
            className={INPUT_CLASS}
          >
            <option value="sightseeing">観光</option>
            <option value="food">食事</option>
            <option value="transport">移動</option>
            <option value="other">その他</option>
          </select>
        </Field>
        <Field label="時間（15分きざみ）">
          <div className="flex items-center gap-1.5">
            <Stepper
              value={start}
              display={start}
              onMinus={() => setStart(fmt(Math.max(0, toMinutes(start) - 15)))}
              onPlus={() => setStart(fmt(toMinutes(start) + 15))}
            />
            <span className="text-ink-3">→</span>
            <Stepper
              value={String(len)}
              display={`${len}分`}
              onMinus={() => setLen((v) => Math.max(15, v - 15))}
              onPlus={() => setLen((v) => v + 15)}
            />
          </div>
        </Field>
        <Field label="メモ（行き方・値段・おすすめ）">
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            className={`${INPUT_CLASS} min-h-[56px] resize-y`}
          />
        </Field>
        <div className="mt-1.5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-[10px] bg-surface-2 py-[11px] text-[13.5px] font-bold text-ink-2">
            やめる
          </button>
          <button
            onClick={submit}
            disabled={isPending || !title || !place}
            className="flex-1 rounded-[10px] bg-plan py-[11px] text-[13.5px] font-bold text-white disabled:opacity-50"
          >
            この時間に置く
          </button>
        </div>
      </div>
    </div>
  );
}

function Stepper({
  display,
  onMinus,
  onPlus,
}: {
  value: string;
  display: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="flex items-center overflow-hidden rounded-[9px] border border-line bg-surface-3">
      <button onClick={onMinus} className="h-9 w-[30px] font-mono-num text-[15px] text-plan">
        −
      </button>
      <span className="w-[52px] text-center font-mono-num text-[13.5px] tabular-nums">{display}</span>
      <button onClick={onPlus} className="h-9 w-[30px] font-mono-num text-[15px] text-plan">
        ＋
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-[13px]">
      <label className="mb-[5px] block text-[11px] tracking-wide text-ink-3">{label}</label>
      {children}
    </div>
  );
}

function PriceSheet({
  priceMode,
  setPriceMode,
  priceYen,
  setPriceYen,
  visibility,
  setVisibility,
  onClose,
  onPublish,
  pending,
}: {
  priceMode: "free" | "paid";
  setPriceMode: (v: "free" | "paid") => void;
  priceYen: number;
  setPriceYen: (v: number) => void;
  visibility: "public" | "friends" | "private";
  setVisibility: (v: "public" | "friends" | "private") => void;
  onClose: () => void;
  onPublish: () => void;
  pending: boolean;
}) {
  const stripeFee = Math.round(priceYen * 0.036);
  const platformFee = Math.round(priceYen * 0.15);
  const net = priceYen - stripeFee - platformFee;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="max-h-[85%] w-full max-w-[480px] overflow-y-auto rounded-t-2xl bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 font-display text-[16px] font-semibold">公開のしかた</h3>
        <Field label="だれに見せる">
          <div className="flex gap-1.5">
            {(
              [
                ["public", "みんなに公開"],
                ["friends", "友だちだけ"],
                ["private", "自分だけ"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setVisibility(v)}
                className={`flex-1 rounded-[9px] border py-2 text-[12.5px] font-medium ${
                  visibility === v ? "border-line bg-surface-2 font-bold text-ink" : "border-line bg-surface-3 text-ink-2"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="値づけ">
          <div className="flex gap-1.5">
            <button
              onClick={() => setPriceMode("free")}
              className={`flex-1 rounded-[9px] border py-2 text-[12.5px] font-medium ${
                priceMode === "free" ? "border-money bg-money-soft font-bold text-money" : "border-line bg-surface-3 text-ink-2"
              }`}
            >
              無料で公開
            </button>
            <button
              onClick={() => setPriceMode("paid")}
              className={`flex-1 rounded-[9px] border py-2 text-[12.5px] font-medium ${
                priceMode === "paid" ? "border-money bg-money-soft font-bold text-money" : "border-line bg-surface-3 text-ink-2"
              }`}
            >
              有料にする
            </button>
          </div>
          <p className="mt-1 text-[11px] leading-[1.55] text-ink-2">
            有料にすると、タイムラインに置いた「🪙ここから先を有料にする」より先が購入後に開きます。
          </p>
        </Field>
        {priceMode === "paid" && (
          <Field label="値段（自分で決める）">
            <input
              type="number"
              min={100}
              step={10}
              value={priceYen}
              onChange={(e) => setPriceYen(Number(e.target.value))}
              className={INPUT_CLASS}
            />
            <div className="mt-2 rounded-[10px] border border-line bg-surface-3 p-[11px] text-[11.5px] text-ink-2">
              <Row label="販売価格" value={`¥${priceYen.toLocaleString()}`} />
              <Row label="決済手数料（3.6%）" value={`−¥${stripeFee.toLocaleString()}`} />
              <Row label="プラットフォーム手数料（15%）" value={`−¥${platformFee.toLocaleString()}`} />
              <div className="mt-[7px] border-t border-line pt-[7px]">
                <Row label="あなたの手取り" value={`¥${net.toLocaleString()}`} bold />
              </div>
            </div>
          </Field>
        )}
        <div className="mt-1.5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-[10px] bg-surface-2 py-[11px] text-[13.5px] font-bold text-ink-2">
            閉じる
          </button>
          <button
            onClick={onPublish}
            disabled={pending}
            className="flex-1 rounded-[10px] bg-plan py-[11px] text-[13.5px] font-bold text-white disabled:opacity-50"
          >
            公開する
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span>{label}</span>
      <b className={`font-mono-num font-medium tabular-nums ${bold ? "text-money" : "text-ink"}`}>{value}</b>
    </div>
  );
}
