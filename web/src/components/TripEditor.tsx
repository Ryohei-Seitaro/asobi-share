"use client";

import { useRef, useState, useTransition } from "react";
import type { InferSelectModel } from "drizzle-orm";
import type { trips, tripDays, tripEvents } from "@/db/schema";
import {
  addDay,
  addEvent,
  importIcsToDay,
  publishTrip,
  pushTripToGoogleCalendar,
  setPaidFrom,
} from "@/app/(app)/create/actions";

type TripEvent = InferSelectModel<typeof tripEvents>;
type TripDay = InferSelectModel<typeof tripDays> & { events: TripEvent[] };
type Trip = InferSelectModel<typeof trips> & { days: TripDay[] };

const PPM = 26 / 15;
const MIN_DRAG_LEN = 15; // ドラッグ量が小さい（≒クリックのみ）場合のデフォルト長さ

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

export function TripEditor({ trip }: { trip: Trip }) {
  const [dayIndex, setDayIndex] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [addRange, setAddRange] = useState<{ start: number; end: number } | null>(null);
  const [drag, setDrag] = useState<{ startMin: number; endMin: number } | null>(null);
  const [paidLineDragY, setPaidLineDragY] = useState<number | null>(null);
  const paidDraggingRef = useRef(false);
  const [showPrice, setShowPrice] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [priceMode, setPriceMode] = useState<"free" | "paid">(trip.priceYen > 0 ? "paid" : "free");
  const [priceYen, setPriceYen] = useState(trip.priceYen || 480);
  const [visibility, setVisibility] = useState<"public" | "friends" | "private">(trip.visibility);
  const [isPending, startTransition] = useTransition();

  const gridRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const dragStartMinRef = useRef(0);

  const day = trip.days[dayIndex];
  const open = day ? toMinutes(day.openTime) : 0;
  const close = day ? toMinutes(day.closeTime) : 0;

  // 有料ラインを置ける境界（イベントとイベントの間）の一覧。orderIndexは1始まり。
  const paidBoundaries = day
    ? day.events.slice(0, -1).map((ev, i) => ({
        orderIndex: i + 1,
        y: (toMinutes(ev.planEnd) - open) * PPM,
      }))
    : [];

  function handlePaidHandlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!gridRef.current) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    paidDraggingRef.current = true;
    const rect = gridRef.current.getBoundingClientRect();
    setPaidLineDragY(e.clientY - rect.top);
  }

  function handlePaidHandlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!paidDraggingRef.current || !gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    setPaidLineDragY(e.clientY - rect.top);
  }

  function handlePaidHandlePointerUp() {
    if (!paidDraggingRef.current) return;
    paidDraggingRef.current = false;
    setPaidLineDragY((y) => {
      if (y != null && paidBoundaries.length > 0) {
        let nearest = paidBoundaries[0];
        let minDist = Math.abs(paidBoundaries[0].y - y);
        for (const b of paidBoundaries) {
          const dist = Math.abs(b.y - y);
          if (dist < minDist) {
            minDist = dist;
            nearest = b;
          }
        }
        startTransition(() => setPaidFrom(trip.id, nearest.orderIndex));
      }
      return null;
    });
  }

  function yToMinutes(clientY: number): number {
    const rect = gridRef.current!.getBoundingClientRect();
    const raw = open + (clientY - rect.top) / PPM;
    return Math.min(close, Math.max(open, Math.round(raw)));
  }

  function handleGridPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!gridRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const m = yToMinutes(e.clientY);
    draggingRef.current = true;
    dragStartMinRef.current = m;
    setDrag({ startMin: m, endMin: m });
  }

  function handleGridPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    setDrag({ startMin: dragStartMinRef.current, endMin: yToMinutes(e.clientY) });
  }

  function endDrag() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDrag((current) => {
      if (current) {
        const s = Math.min(current.startMin, current.endMin);
        const e = Math.max(current.startMin, current.endMin);
        setAddRange({ start: s, end: e - s < MIN_DRAG_LEN ? Math.min(close, s + MIN_DRAG_LEN) : e });
      }
      return null;
    });
  }

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
          onClick={() => setShowCalendar(true)}
          aria-label="Googleカレンダーと連携"
          className="grid h-8 w-8 place-items-center rounded-[9px] border border-line text-ink-2"
        >
          <svg width="15" height="15" viewBox="0 0 16 16">
            <rect x="1.5" y="2.5" width="13" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
            <path d="M1.5 6h13M4.5 1.3v2.4M11.5 1.3v2.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
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
          <p className="mb-1.5 px-1 text-[11px] text-ink-3">
            空いている時間をドラッグすると、その時間で予定を作れます
          </p>
        )}
        {day && (
          <div
            ref={gridRef}
            className="relative touch-none select-none pl-11"
            style={{ height: (close - open) * PPM }}
            onPointerDown={handleGridPointerDown}
            onPointerMove={handleGridPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={() => {
              draggingRef.current = false;
              setDrag(null);
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 left-11 rounded-md opacity-45"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to bottom, var(--line) 0 1px, transparent 1px 26px), repeating-linear-gradient(to bottom, var(--ink-3) 0 1px, transparent 1px 104px)",
              }}
            />
            {drag && (
              <div
                className="pointer-events-none absolute left-11 right-0 z-30 overflow-hidden rounded-[9px] border-2 border-dashed border-plan bg-plan-soft/80 px-2.5 py-[5px]"
                style={{
                  top: (Math.min(drag.startMin, drag.endMin) - open) * PPM,
                  height: Math.max(4, Math.abs(drag.endMin - drag.startMin) * PPM),
                }}
              >
                <span className="font-mono-num text-[11px] font-bold tabular-nums text-plan">
                  {fmt(Math.min(drag.startMin, drag.endMin))}–{fmt(Math.max(drag.startMin, drag.endMin))}
                </span>
              </div>
            )}
            {day.events.map((ev, i) => {
              const s0 = toMinutes(ev.planStart);
              const e0 = toMinutes(ev.planEnd);
              const dur = e0 - s0;
              const isPaidBoundary = trip.paidFromEventOrder === i + 1;
              const behindPaywall = trip.paidFromEventOrder != null && i >= trip.paidFromEventOrder;

              return (
                <div key={ev.id}>
                  <div
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`absolute left-11 right-0 z-10 overflow-hidden rounded-[9px] border border-line border-l-[3px] border-l-plan bg-surface px-2.5 py-[7px] ${
                      behindPaywall ? "bg-coin-soft" : ""
                    }`}
                    style={{ top: (s0 - open) * PPM, height: dur * PPM - 4 }}
                  >
                    <div className="font-mono-num text-[11.5px] font-medium tabular-nums text-plan">
                      {fmt(s0)}–{fmt(e0)}
                      <span className="ml-1.5 font-normal text-ink-3">{dur}分</span>
                    </div>
                    <div className="text-[13.5px] font-bold leading-[1.45]">{ev.title}</div>
                    <div className="text-[11.5px] text-ink-2">{ev.place}</div>
                  </div>
                  {i < day.events.length - 1 && isPaidBoundary && (
                    <div
                      onPointerDown={handlePaidHandlePointerDown}
                      onPointerMove={handlePaidHandlePointerMove}
                      onPointerUp={handlePaidHandlePointerUp}
                      onPointerCancel={() => {
                        paidDraggingRef.current = false;
                        setPaidLineDragY(null);
                      }}
                      className="absolute left-11 right-0 z-30 flex touch-none items-center"
                      style={{
                        top: (paidLineDragY != null ? paidLineDragY : (e0 - open) * PPM) - 1,
                        cursor: "ns-resize",
                      }}
                    >
                      <span className="h-[3px] flex-1 rounded-full bg-coin" />
                      <span className="mx-1.5 flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-coin bg-coin px-[10px] py-[4px] text-[10.5px] font-bold text-white shadow-md">
                        🪙 ドラッグで動かす
                      </span>
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => handleTogglePaidFrom(i)}
                        disabled={isPending}
                        aria-label="有料ラインを外す"
                        className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-coin bg-surface text-[11px] font-bold text-coin"
                      >
                        ×
                      </button>
                      <span className="h-[3px] flex-1 rounded-full bg-coin" />
                    </div>
                  )}
                  {i < day.events.length - 1 && !isPaidBoundary && (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      className="absolute left-11 right-0 z-20 flex items-center"
                      style={{ top: (e0 - open) * PPM - 1 }}
                    >
                      <span className="h-[2px] flex-1 bg-transparent" />
                      <button
                        onClick={() => handleTogglePaidFrom(i)}
                        disabled={isPending}
                        className="whitespace-nowrap rounded-full border border-coin bg-coin-soft px-[9px] py-[3px] text-[10.5px] font-bold text-coin"
                      >
                        🪙 ここから先を有料にする
                      </button>
                      <span className="h-[2px] flex-1 bg-transparent" />
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
        <AddEventSheet tripId={trip.id} dayId={day.id} onClose={() => setShowAdd(false)} />
      )}

      {addRange && day && (
        <AddEventSheet
          tripId={trip.id}
          dayId={day.id}
          initialStart={fmt(addRange.start)}
          initialEnd={fmt(addRange.end)}
          onClose={() => setAddRange(null)}
        />
      )}

      {showCalendar && day && (
        <GoogleCalendarSheet tripId={trip.id} dayId={day.id} onClose={() => setShowCalendar(false)} />
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
  initialStart,
  initialEnd,
  onClose,
}: {
  tripId: string;
  dayId: string;
  initialStart?: string;
  initialEnd?: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [tabelogUrl, setTabelogUrl] = useState("");
  const [start, setStart] = useState(initialStart ?? "10:00");
  const [end, setEnd] = useState(initialEnd ?? "11:00");
  const [detail, setDetail] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleStartChange(v: string) {
    setStart(v);
    if (toMinutes(v) >= toMinutes(end)) {
      setEnd(fmt(Math.min(23 * 60 + 59, toMinutes(v) + 30)));
    }
  }

  function submit() {
    if (!title || !place || toMinutes(end) <= toMinutes(start)) return;
    startTransition(async () => {
      await addEvent(tripId, dayId, {
        title,
        place,
        mapUrl,
        tabelogUrl,
        planStart: start,
        planEnd: end,
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
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトルを追加"
          autoFocus
          className="mb-3 w-full border-b border-line bg-transparent pb-2 text-[17px] font-semibold text-ink outline-none placeholder:text-ink-3"
        />
        <div className="mb-[13px] flex items-center gap-2 rounded-[9px] border border-line bg-surface-3 px-[11px] py-[9px]">
          <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0 text-ink-3" aria-hidden="true">
            <circle cx="7" cy="7" r="5.8" fill="none" stroke="currentColor" strokeWidth="1.3" />
            <path d="M7 3.8V7l2.4 1.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            type="time"
            step={60}
            value={start}
            onChange={(e) => handleStartChange(e.target.value)}
            className="bg-transparent font-mono-num text-[13.5px] tabular-nums text-ink outline-none"
          />
          <span className="text-ink-3">〜</span>
          <input
            type="time"
            step={60}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="bg-transparent font-mono-num text-[13.5px] tabular-nums text-ink outline-none"
          />
          <span className="ml-auto text-[11px] text-ink-3">1分きざみ</span>
        </div>
        {toMinutes(end) <= toMinutes(start) && (
          <p className="mb-[13px] -mt-[7px] text-[11px] text-actual">終了時刻は開始より後にしてください</p>
        )}
        <Field label="どこへ行く">
          <input value={place} onChange={(e) => setPlace(e.target.value)} className={INPUT_CLASS} />
        </Field>
        <Field label="Googleマップの位置情報（任意・URLを貼り付け）">
          <input
            value={mapUrl}
            onChange={(e) => setMapUrl(e.target.value)}
            placeholder="https://maps.app.goo.gl/..."
            inputMode="url"
            className={INPUT_CLASS}
          />
          <p className="mt-1 text-[10.5px] leading-[1.5] text-ink-3">
            未入力の場合は「どこへ行く」の内容でGoogleマップを検索するリンクになります
          </p>
        </Field>
        <Field label="食べログのページ（任意・URLを貼り付け）">
          <input
            value={tabelogUrl}
            onChange={(e) => setTabelogUrl(e.target.value)}
            placeholder="https://tabelog.com/..."
            inputMode="url"
            className={INPUT_CLASS}
          />
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
            disabled={isPending || !title || !place || toMinutes(end) <= toMinutes(start)}
            className="flex-1 rounded-[10px] bg-plan py-[11px] text-[13.5px] font-bold text-white disabled:opacity-50"
          >
            この時間に置く
          </button>
        </div>
      </div>
    </div>
  );
}

function GoogleCalendarSheet({
  tripId,
  dayId,
  onClose,
}: {
  tripId: string;
  dayId: string;
  onClose: () => void;
}) {
  const [result, setResult] = useState<{ ok: true; count: number } | { ok: false; error: string } | null>(null);
  const [pushResult, setPushResult] = useState<
    { ok: true; created: number; failed: number } | { ok: false; error: string } | null
  >(null);
  const [isPending, startTransition] = useTransition();
  const [isPushing, startPushTransition] = useTransition();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      startTransition(async () => {
        const r = await importIcsToDay(tripId, dayId, text);
        setResult(r);
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handlePushToGoogle() {
    setPushResult(null);
    startPushTransition(async () => {
      const r = await pushTripToGoogleCalendar(tripId);
      setPushResult(r);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="max-h-[85%] w-full max-w-[480px] overflow-y-auto rounded-t-2xl bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 font-display text-[16px] font-semibold">Googleカレンダーと連携</h3>

        <p className="mb-1.5 text-[11px] tracking-wide text-ink-3">ワンクリックで登録</p>
        <button
          onClick={handlePushToGoogle}
          disabled={isPushing}
          className="mb-1.5 w-full rounded-[10px] bg-plan py-[13px] text-[13.5px] font-bold text-white disabled:opacity-50"
        >
          {isPushing ? "Googleカレンダーに登録中…" : "この旅程をGoogleカレンダーに追加する"}
        </button>
        <p className="mb-3 text-[11px] leading-[1.6] text-ink-3">
          全ての日の予定をまとめてあなたのGoogleカレンダーに作成します（要：カレンダーへのアクセス許可）。
        </p>
        {pushResult && (
          <p className={`mb-4 text-[12px] leading-[1.5] ${pushResult.ok ? "text-plan" : "text-actual"}`}>
            {pushResult.ok
              ? `${pushResult.created}件を登録しました${pushResult.failed > 0 ? `（失敗 ${pushResult.failed}件）` : ""}`
              : pushResult.error}
          </p>
        )}

        <p className="mb-1.5 text-[11px] tracking-wide text-ink-3">エクスポート</p>
        <a
          href={`/api/trips/${tripId}/ics`}
          className="mb-4 block rounded-[10px] border border-line bg-surface-3 px-[13px] py-[11px] text-[13px] font-medium text-ink"
        >
          .icsファイルをダウンロード
          <span className="mt-0.5 block text-[11px] font-normal text-ink-2">
            ダウンロードした.icsはGoogleカレンダーの「設定 → インポート」から取り込めます
          </span>
        </a>

        <p className="mb-1.5 text-[11px] tracking-wide text-ink-3">インポート（この日に追加）</p>
        <label className="mb-1.5 block cursor-pointer rounded-[10px] border border-dashed border-line bg-surface-3 px-[13px] py-[15px] text-center text-[13px] font-medium text-ink-2">
          {isPending ? "取り込み中…" : ".icsファイルを選ぶ"}
          <input type="file" accept=".ics,text/calendar" onChange={handleFile} disabled={isPending} className="hidden" />
        </label>
        <p className="mb-3 text-[11px] leading-[1.6] text-ink-3">
          Googleカレンダーの「設定 → カレンダーのエクスポート」で書き出した.icsを選ぶと、この日の予定として取り込みます。
        </p>

        {result && (
          <p className={`mb-3 text-[12px] leading-[1.5] ${result.ok ? "text-plan" : "text-actual"}`}>
            {result.ok ? `${result.count}件の予定を取り込みました` : result.error}
          </p>
        )}

        <button onClick={onClose} className="w-full rounded-[10px] bg-surface-2 py-[11px] text-[13.5px] font-bold text-ink-2">
          閉じる
        </button>
      </div>
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
