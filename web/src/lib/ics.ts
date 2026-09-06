// Googleカレンダー互換のiCalendar(.ics)形式の生成・パース。
// RFC5545の必要最低限（VEVENTのSUMMARY/DTSTART/DTEND/LOCATION/DESCRIPTION）のみ対応。

export type IcsEventInput = {
  uid: string;
  title: string;
  location?: string | null;
  description?: string | null;
  dateStr: string; // "YYYYMMDD"
  startHHMM: string; // "10:00"
  endHHMM: string; // "11:00"
};

function escapeIcsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function generateIcs(calName: string, events: IcsEventInput[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//asobi-share//trip export//JA",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeIcsText(calName)}`,
  ];
  for (const ev of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${ev.uid}`,
      `DTSTART:${ev.dateStr}T${ev.startHHMM.replace(":", "")}00`,
      `DTEND:${ev.dateStr}T${ev.endHHMM.replace(":", "")}00`,
      `SUMMARY:${escapeIcsText(ev.title)}`
    );
    if (ev.location) lines.push(`LOCATION:${escapeIcsText(ev.location)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escapeIcsText(ev.description)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export type ParsedIcsEvent = {
  title: string;
  location: string | null;
  description: string | null;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
};

function unescapeIcsText(s: string): string {
  return s.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

// Googleカレンダー等からエクスポートされた.icsを取り込む用の簡易パーサー。
export function parseIcsEvents(ics: string): ParsedIcsEvent[] {
  const unfolded = ics.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
  const blocks = unfolded.split("BEGIN:VEVENT").slice(1);
  const out: ParsedIcsEvent[] = [];

  for (const block of blocks) {
    const body = block.split("END:VEVENT")[0];
    const get = (key: string): string | null => {
      const m = body.match(new RegExp(`^${key}(?:;[^:]*)?:(.*)$`, "m"));
      return m ? m[1].trim() : null;
    };
    const toHHMM = (v: string | null): string | null => {
      if (!v) return null;
      const m = v.match(/T(\d{2})(\d{2})/);
      return m ? `${m[1]}:${m[2]}` : null;
    };

    const summary = get("SUMMARY");
    const start = toHHMM(get("DTSTART"));
    if (!summary || !start) continue;

    const end = toHHMM(get("DTEND"));
    const location = get("LOCATION");
    const description = get("DESCRIPTION");

    out.push({
      title: unescapeIcsText(summary),
      location: location ? unescapeIcsText(location) : null,
      description: description ? unescapeIcsText(description) : null,
      start,
      end: end ?? start,
    });
  }
  return out;
}
