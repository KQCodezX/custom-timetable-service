# Custom Timetable Service

Backend service for managing user-created custom events alongside a university timetable.

The service provides authenticated CRUD operations for custom events, per-user data isolation, date-range filtering, and iCalendar (`.ics`) export. It is implemented with Fastify, TypeScript, Bun, and MongoDB, with Docker Compose support for running the API and database together.

## Features

- Create, list, retrieve, update, and delete custom timetable events
- Bearer-token authentication with per-user event isolation
- Validation for event fields and time ranges
- Overlap-aware date-range filtering
- iCalendar (`.ics`) export
- MongoDB index on `(userId, startAt)`
- Integration tests for authentication, CRUD, isolation, validation, and export
- Dockerized API and MongoDB setup

## API

All event endpoints require a bearer token.

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/events` | Create a custom event |
| `GET` | `/events` | List the authenticated user's events |
| `GET` | `/events/:id` | Retrieve one event |
| `PATCH` | `/events/:id` | Partially update one event |
| `DELETE` | `/events/:id` | Delete one event |
| `GET` | `/events/export.ics` | Export the user's events as iCalendar |

See [API.md](API.md) for request/response details and examples.

## Architecture

The implementation keeps HTTP handling separate from event business logic:

```text
HTTP request
    ↓
Bearer-token authentication
    ↓
Fastify route
    ↓
Custom event service
    ↓
MongoDB
```

Routes are responsible for request validation and HTTP responses. The service layer owns event business rules and database operations, while `ical.ts` handles calendar serialization.

## Authorization and data isolation

Each event stores its owning user's identifier.

Database operations are scoped by both the requested event ID and the authenticated user's ID. This means that knowing another user's event UUID is not enough to access or modify it.

For example, if Bob requests Alice's event, the lookup behaves as:

```text
_id = event ID
AND
userId = Bob
```

Since Alice's event does not satisfy both conditions, the API returns `404`.

## Time handling

Clients send RFC 3339 timestamps.

MongoDB stores them as date values so chronological queries and indexes operate on actual time values. Responses are serialized as ISO 8601 timestamps.

Date-range queries use event overlap rather than only checking the start time:

```text
event.endAt > from
AND
event.startAt < to
```

This includes events that started before the requested window but continue into it.

## Extra feature: iCalendar export

The service supports:

```text
GET /events/export.ics
```

The export generates iCalendar `VEVENT` records containing the event's UID, timestamps, title, and optional description/location fields.

I chose iCalendar export as the extra feature because it is directly useful for timetable events while keeping the core data model simple. Recurring events would introduce additional complexity around recurrence rules, exceptions, and time zones.

## Local development

### Requirements

- Bun 1.4.2+
- Docker Desktop (optional for running the persistent MongoDB service)

### Install dependencies

```bash
bun install
```

### Run the development server

```bash
bun run dev
```

The API runs at:

```text
http://localhost:3000
```

Swagger UI:

```text
http://localhost:3000/documentation
```

Scalar:

```text
http://localhost:3000/reference
```

By default, development uses an in-memory MongoDB instance.

### Run the tests

```bash
bun test
```

### Run static checks

```bash
bun run compile
bun run check
```

## Docker

The complete application can be run with:

```bash
docker compose up --build
```

This starts:

- the Fastify API
- a MongoDB instance
- a healthcheck so the API waits for MongoDB to become ready

The MongoDB data directory is stored in a Docker volume so it survives container restarts.

## Demo authentication

The development authentication provides two users:

```text
Alice: Bearer alice-dev-token
Bob:   Bearer bob-dev-token
```

These tokens are only for local development and testing.

## Tests

The test suite covers:

- unauthenticated requests
- event creation and retrieval
- partial updates
- deletion
- per-user isolation
- invalid event ranges
- iCalendar export
- MongoDB initialization and collection registration

## Design notes

### Why MongoDB?

The supplied USThing starter already provides MongoDB integration and in-memory MongoDB support for development and tests. Reusing that infrastructure keeps the implementation focused on the requested timetable feature.

### Why PATCH?

Events can be modified field-by-field, so `PATCH` matches the partial-update behavior of the API.

### Why a `(userId, startAt)` index?

The main list operation is scoped to a single user and ordered by event start time. The compound index matches that access pattern.

### Why return 404 for another user's event?

The service queries by both event ID and authenticated user ID. Returning `404` makes an unauthorized event indistinguishable from a nonexistent one.

### Production considerations

For a production deployment, I would replace the development bearer tokens with the university's real identity provider, move credentials entirely outside source control, add pagination for large event collections, and add rate limiting and audit logging.

## Project structure

```text
src/
  app.ts
  options.ts
  auth/
    users.ts
  plugins/
    auth.ts
    init-mongo.ts
    sensible.ts
  routes/
    events/
      index.ts
  services/
    custom-events.ts
    ical.ts
  types/
    custom-event.ts

test/
  routes/
    events.test.ts
  auth-schema.test.ts
  init-mongo.test.ts
  mongo.test.ts
  options.test.ts
```