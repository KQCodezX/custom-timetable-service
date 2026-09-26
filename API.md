# Custom Timetable Events API

All event endpoints require a bearer token.

## Event model

```json
{
  "id": "uuid",
  "title": "Study Session",
  "description": "Algorithms practice",
  "location": "Library",
  "startAt": "2026-10-01T01:00:00.000Z",
  "endAt": "2026-10-01T03:00:00.000Z",
  "createdAt": "2026-09-26T00:00:00.000Z",
  "updatedAt": "2026-09-26T00:00:00.000Z"
}
```

The client sends RFC 3339 timestamps. MongoDB stores them as dates, and the API serializes them as UTC ISO 8601 timestamps.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/events` | Create an event |
| GET | `/events` | List the authenticated user's events |
| GET | `/events/:id` | Fetch one event |
| PATCH | `/events/:id` | Partially update one event |
| DELETE | `/events/:id` | Delete one event |
| GET | `/events/export.ics` | Export the authenticated user's events as iCalendar |

`GET /events` and `/events/export.ics` support `from`, `to`, and `limit` query parameters.

The range is treated as an overlap query: an event is returned when its end is after `from` and its start is before `to`.

## Authorization / tenant isolation

The authenticated user's username is used as the event owner identifier.

Every database read/write includes both:

```text
_id = requested event id
AND
userId = authenticated user
```

This means a user cannot read, edit, export, or delete another user's event merely by guessing its UUID. The server returns `404` for an event that does not belong to the caller, rather than revealing that another user's event exists.

## Why the API is organized this way

HTTP route handlers validate requests and translate HTTP errors.

`services/custom-events.ts` owns event business rules and MongoDB operations.

`services/ical.ts` owns calendar serialization.

This keeps the route layer small and makes the core event operations testable without duplicating logic across endpoints.

## Extra feature: iCalendar export

The service generates RFC 5545-style `VEVENT` records with `UID`, `DTSTAMP`, `DTSTART`, `DTEND`, `SUMMARY`, and optional `DESCRIPTION` / `LOCATION` fields.

The export uses UTC timestamps so the same absolute instant is preserved when imported into calendar applications in different time zones.

## Deliberate scope

Recurring events were not implemented because they introduce additional semantics around recurrence rules, exceptions, time zones, and editing individual occurrences. A standards-based `.ics` export provides a useful user-facing feature without expanding the data model unnecessarily for a small technical test.
