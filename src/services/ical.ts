import type { EventResponse } from "../types/custom-event.js";

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function formatIcsUtc(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");

  return (
    [
      date.getUTCFullYear(),
      pad(date.getUTCMonth() + 1),
      pad(date.getUTCDate()),
    ].join("") +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function foldLine(line: string): string {
  // RFC 5545 recommends folding long content lines. This implementation keeps
  // ASCII fields simple while still producing standards-compatible folded lines.
  const max = 74;
  if (line.length <= max) return line;

  const chunks: string[] = [];
  for (let i = 0; i < line.length; i += max) {
    chunks.push(line.slice(i, i + max));
  }
  return chunks.join("\r\n ");
}

export function renderIcs(events: EventResponse[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Custom Timetable Service//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      foldLine(`UID:${event.id}@custom-timetable`),
      foldLine(`DTSTAMP:${formatIcsUtc(event.createdAt)}`),
      foldLine(`DTSTART:${formatIcsUtc(event.startAt)}`),
      foldLine(`DTEND:${formatIcsUtc(event.endAt)}`),
      foldLine(`SUMMARY:${escapeText(event.title)}`),
    );

    if (event.description !== undefined) {
      lines.push(foldLine(`DESCRIPTION:${escapeText(event.description)}`));
    }

    if (event.location !== undefined) {
      lines.push(foldLine(`LOCATION:${escapeText(event.location)}`));
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
