// 自由記述のメモ（他アプリで書いた旅程テキスト）から、この媒体の投稿フォーマット
// （日ごとの時間割イベント）を推測して組み立てる簡易パーサー。
// 完全な自然言語理解ではなく、時刻表記・日付表記のパターンマッチに基づくヒューリスティック。

export type ParsedMemoEvent = {
  title: string;
  place: string;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  detail: string;
};

export type ParsedMemoDay = {
  dateLabel: string;
  events: ParsedMemoEvent[];
};

export type ParsedMemo = {
  title: string;
  days: ParsedMemoDay[];
};

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
export function fmt(min: number): string {
  const m = ((min % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
function normTime(h: string, m?: string): string {
  return `${h.padStart(2, "0")}:${(m ?? "00").padStart(2, "0")}`;
}

// 日付境界の見出し行として認識するパターン。
// 「1日目」「Day 1」「Day1」「5/16」「5/16(土)」「5月16日」等、表記ゆれを広めに拾う。
const DAY_LABEL_RE =
  /^(?:day\s*(\d{1,2})\b)|^(\d{1,2})\s*日目|^(\d{1,2})\s*\/\s*(\d{1,2})|^(\d{1,2})\s*月\s*(\d{1,2})\s*日/i;
const DAY_LABEL_MAX_LEN = 40;
// 直前の予定より大きく時刻が巻き戻ったら、明示的な見出しがなくても日が変わったとみなす。
const DAY_ROLLOVER_MINUTES = 180;

const TIME_RANGE_RE = /(\d{1,2})[:：](\d{2})\s*[-〜~]\s*(\d{1,2})[:：](\d{2})/;
const TIME_SINGLE_RE = /(\d{1,2})[:：](\d{2})/;

export function parseMemoText(text: string): ParsedMemo {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const days: ParsedMemoDay[] = [];
  let title = "";
  // TypeScriptのnarrowingがクロージャ経由の再代入を正しく追えないケースを避けるため、
  // 可変状態はオブジェクトのプロパティとして持つ（プロパティアクセスは呼び出しの度に再評価される）。
  const state: { day: ParsedMemoDay | null; event: ParsedMemoEvent | null } = { day: null, event: null };

  function pushEvent() {
    if (state.event && state.day) state.day.events.push(state.event);
    state.event = null;
  }
  function startNewDay(dateLabel?: string) {
    state.day = { dateLabel: dateLabel ?? `${days.length + 1}日目`, events: [] };
    days.push(state.day);
  }
  function ensureDay() {
    if (!state.day) startNewDay();
  }

  for (const line of lines) {
    if (DAY_LABEL_RE.test(line) && line.length < DAY_LABEL_MAX_LEN) {
      pushEvent();
      startNewDay(line);
      continue;
    }

    const rangeMatch = line.match(TIME_RANGE_RE);
    const singleMatch = !rangeMatch ? line.match(TIME_SINGLE_RE) : null;

    if (rangeMatch || singleMatch) {
      let start: string;
      let end: string;
      let rest: string;
      if (rangeMatch) {
        start = normTime(rangeMatch[1], rangeMatch[2]);
        end = normTime(rangeMatch[3], rangeMatch[4]);
        rest = line.slice((rangeMatch.index ?? 0) + rangeMatch[0].length);
      } else {
        const m = singleMatch as RegExpMatchArray;
        start = normTime(m[1], m[2]);
        end = fmt(toMinutes(start) + 60);
        rest = line.slice((m.index ?? 0) + m[0].length);
      }

      pushEvent();

      // 明示的な日付見出しがなくても、直前の予定より大きく時刻が巻き戻っていたら
      // 新しい日が始まったとみなす（複数日程のメモで見出しが省略されがちなため）。
      const activeDay = state.day;
      if (activeDay && activeDay.events.length > 0) {
        const lastStart = toMinutes(activeDay.events[activeDay.events.length - 1].start);
        if (toMinutes(start) < lastStart - DAY_ROLLOVER_MINUTES) {
          startNewDay();
        }
      }
      ensureDay();

      rest = rest.replace(/^[\s〜~\-−:：,、]+/, "").trim();
      const parts = rest.split(/\s*[@＠]\s*|\s{2,}/).filter(Boolean);
      const titlePart = parts[0] || rest || "予定";
      const placePart = parts.slice(1).join(" ");

      state.event = { title: titlePart, place: placePart, start, end, detail: "" };
      continue;
    }

    if (state.event) {
      state.event.detail = state.event.detail ? `${state.event.detail}\n${line}` : line;
    } else if (!title) {
      title = line;
    }
  }
  pushEvent();

  return { title: title || "無題の旅程", days };
}
