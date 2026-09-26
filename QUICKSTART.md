# 30-minute local verification checklist

After applying the overlay to the USThing starter:

## Install + static checks

```bash
bun install
bun run compile
bun run check
```

## Tests

```bash
bun test
```

## Run locally

```bash
bun run dev
```

Use the demo Alice token:

```bash
curl -i http://localhost:3000/events \
  -H 'Authorization: Bearer alice-dev-token'
```

Create an event:

```bash
curl -i -X POST http://localhost:3000/events \
  -H 'Authorization: Bearer alice-dev-token' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Study Session",
    "description": "Algorithms practice",
    "location": "Library",
    "startAt": "2026-10-01T09:00:00+08:00",
    "endAt": "2026-10-01T11:00:00+08:00"
  }'
```

Copy the returned `id` into the next commands.

List events:

```bash
curl -s http://localhost:3000/events \
  -H 'Authorization: Bearer alice-dev-token'
```

Fetch one event:

```bash
curl -s http://localhost:3000/events/<ID> \
  -H 'Authorization: Bearer alice-dev-token'
```

Patch it:

```bash
curl -i -X PATCH http://localhost:3000/events/<ID> \
  -H 'Authorization: Bearer alice-dev-token' \
  -H 'Content-Type: application/json' \
  -d '{"title":"Algorithms Practice"}'
```

Prove user isolation:

```bash
curl -i http://localhost:3000/events/<ID> \
  -H 'Authorization: Bearer bob-dev-token'
```

That should return `404`.

Export calendar data:

```bash
curl -i http://localhost:3000/events/export.ics \
  -H 'Authorization: Bearer alice-dev-token'
```

Delete it:

```bash
curl -i -X DELETE http://localhost:3000/events/<ID> \
  -H 'Authorization: Bearer alice-dev-token'
```

## Docker verification

```bash
docker compose up --build
```

Then repeat the curl commands against `localhost:3000`.

## Final quality check

```bash
git status
git diff --check
bun run compile
bun run check
bun test
```
