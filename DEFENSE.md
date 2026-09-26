# Technical-review cheat sheet

## What problem are you solving?

The existing timetable contains university-owned classes. This service adds a separate resource for user-created events without changing the university schedule source.

## Why REST endpoints?

Events are independent resources, so standard HTTP methods map naturally to CRUD:

- POST creates
- GET reads
- PATCH partially updates
- DELETE removes

The `/events/:id` shape also makes authorization straightforward because the server always knows which resource is being accessed.

## How does authorization work?

The starter authenticates a bearer token and puts the authenticated username on `request.user`.

That username becomes the `userId` stored with every custom event.

The important rule is not simply “check the user once.” Every event database query includes the authenticated user's ID. That prevents ID guessing from becoming an authorization bypass.

## Why return 404 for another user's event?

The service queries by both `_id` and `userId`. Therefore an event belonging to another user looks the same as a nonexistent event. This avoids exposing whether another user's resource exists.

## Why MongoDB?

The supplied template already provides MongoDB integration, local development support, and in-memory MongoDB tests. Reusing that infrastructure reduces unnecessary setup and keeps the focus on the requested feature.

## Why a string UUID instead of Mongo ObjectId?

The API does not need to expose a database-specific identifier format. UUIDs are easy for clients to generate and validate, are not tied to MongoDB semantics, and make the public API portable.

## Why store Date values in MongoDB?

Dates should be treated as time values rather than arbitrary strings. MongoDB Date values allow chronological comparison and efficient date indexes. The API converts them back to standard ISO 8601 strings at the HTTP boundary.

## How does date filtering work?

For a requested interval `[from, to)`, the service returns events that overlap that window:

```text
event.endAt > from
AND
event.startAt < to
```

This is better than only checking `startAt` because an event may begin before the requested window and continue into it.

## Why an index on `(userId, startAt)`?

Most reads are scoped to one user and sorted by start time. The compound index supports that access pattern and avoids scanning unrelated users' events as the dataset grows.

## Why PATCH instead of PUT?

The task says users can modify events. PATCH matches the implementation because clients can change only the fields they need to change. PUT would usually represent a complete replacement of the resource.

## Why is `.ics` the extra feature?

Calendar export is directly related to a timetable and gives users a useful interoperability feature without adding another complex data model. Recurring events would require recurrence rules, exceptions, and time-zone semantics.

## Why does the iCalendar export use UTC?

The stored event represents an absolute instant. Exporting UTC keeps that instant stable across calendar clients and user time zones. The calendar application can render it in the viewer's local time.

## Why have a service layer?

Routes should mostly translate HTTP into application operations. The service layer contains the business rules such as `endAt > startAt`, user scoping, and CRUD operations. That keeps similar logic from being duplicated across REST and export endpoints.

## What would you improve for production?

I would replace static development tokens with the university's real identity provider, store token secrets outside source control, add pagination/cursors, add rate limiting and request logging, consider soft deletion/audit history, and define stronger time-zone/recurrence semantics if those become product requirements.

## What did you deliberately not implement?

I did not implement recurring events or an MCP interface because neither is required for the core service, and each introduces extra semantics that would make a rushed implementation harder to test correctly. The `.ics` export satisfies the extra-feature requirement with a smaller surface area.
