# Custom Timetable Implementation — setup on the USThing template

This is a drop-in implementation for `USThing/26-template-api`.

## 1. Start from the provided template

```bash
git clone https://github.com/USThing/26-template-api.git
cd 26-template-api
```

The template is already configured for Fastify, TypeScript, Bun, MongoDB, bearer-token auth, Swagger, Scalar, and in-memory MongoDB for development/tests.

## 2. Copy these files into the template

Copy the following folders/files from this overlay into the matching locations:

```text
src/types/custom-event.ts
src/services/custom-events.ts
src/services/ical.ts
src/routes/events/index.ts
test/routes/events.test.ts
Dockerfile
.dockerignore
compose.yaml
```

## 3. Register the MongoDB collection

Open `src/plugins/init-mongo.ts`.

Add:

```ts
import type { CustomEventDocument } from "../types/custom-event.js";
```

Inside the `onReady` hook, keep the existing database connection and create the event collection/index:

```ts
const customEvents = db.collection<CustomEventDocument>("customEvents");
await customEvents.createIndex({ userId: 1, startAt: 1 });
```

Then decorate the Fastify instance with the collection:

```ts
fastify.decorate("collections", { customEvents });
```

Finally, update the Fastify module declaration near the bottom so it exposes this collection:

```ts
import type { Collection } from "mongodb";
import type { CustomEventDocument } from "../types/custom-event.js";

declare module "fastify" {
  interface FastifyInstance {
    collections: {
      customEvents: Collection<CustomEventDocument>;
    };
  }
}
```

The cleanest final version removes the template's unused `example` collection at this point.

## 4. Update Swagger tags

In `src/app.ts`, add this tag inside the OpenAPI tags array:

```ts
{ name: "Custom Events", description: "User-created timetable events" },
```

## 5. Remove template scaffolding

After the new route tests pass, remove the unused template example routes/tests:

```bash
rm -rf src/routes/example src/routes/auth-example
auto_rm='test/routes/example.test.ts test/routes/auth-example.test.ts'
rm -f $auto_rm
```

Also remove the template's `example` collection from `src/plugins/init-mongo.ts` and update `test/mongo.test.ts` to assert that `app.collections.customEvents` exists.

## 6. Run everything

```bash
bun install
bun run compile
bun run check
bun test
```

The first test run may download the in-memory MongoDB binary used by the template.

## 7. Run the service

Development:

```bash
bun run dev
```

Docker:

```bash
docker compose up --build
```

Then open:

- `http://localhost:3000/documentation`
- `http://localhost:3000/reference`

The starter's development users are:

- Alice: `Bearer alice-dev-token`
- Bob: `Bearer bob-dev-token`

These are intentionally only demo tokens; the starter documents that they must be replaced before any real deployment.
