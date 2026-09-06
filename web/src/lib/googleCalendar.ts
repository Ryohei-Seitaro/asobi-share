// ClerkのGoogle OAuthアクセストークンを使って、Google Calendar APIに
// イベントを直接作成する（calendar.eventsスコープが必要）。

export type CalendarEventInput = {
  title: string;
  location?: string | null;
  description?: string | null;
  dateStr: string; // "YYYY-MM-DD"
  startHHMM: string; // "10:00"
  endHHMM: string; // "11:00"
};

export async function insertCalendarEvent(
  accessToken: string,
  ev: CalendarEventInput
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: ev.title,
      location: ev.location || undefined,
      description: ev.description || undefined,
      start: { dateTime: `${ev.dateStr}T${ev.startHHMM}:00`, timeZone: "Asia/Tokyo" },
      end: { dateTime: `${ev.dateStr}T${ev.endHHMM}:00`, timeZone: "Asia/Tokyo" },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, status: res.status, error: body.slice(0, 300) };
  }
  return { ok: true };
}
