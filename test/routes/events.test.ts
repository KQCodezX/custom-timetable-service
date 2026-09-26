import { afterAll, beforeAll, test } from "bun:test";
import * as assert from "node:assert/strict";
import Fastify from "fastify";
import fp from "fastify-plugin";
import App from "../../src/app.js";

let app: ReturnType<typeof Fastify>;

beforeAll(async () => {
  app = Fastify({ pluginTimeout: 5 * 60 * 1000 });
  await app.register(fp(App), {
    mongoUri: undefined,
    mongoTestUri: undefined,
    authSkip: false,
  });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

test("unauthenticated requests are rejected", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/events",
  });

  assert.equal(response.statusCode, 401);
});

test("custom events support CRUD and are isolated per user", async () => {
  const create = await app.inject({
    method: "POST",
    url: "/events",
    headers: { authorization: "Bearer alice-dev-token" },
    payload: {
      title: "Study Session",
      description: "Algorithms practice",
      location: "Library",
      startAt: "2026-10-01T09:00:00+08:00",
      endAt: "2026-10-01T11:00:00+08:00",
    },
  });

  assert.equal(create.statusCode, 201);
  const created = create.json() as { id: string; title: string };
  assert.equal(created.title, "Study Session");

  const aliceList = await app.inject({
    method: "GET",
    url: "/events?from=2026-10-01T00:00:00%2B08:00&to=2026-10-02T00:00:00%2B08:00",
    headers: { authorization: "Bearer alice-dev-token" },
  });
  assert.equal(aliceList.statusCode, 200);
  assert.equal(aliceList.json().length, 1);

  const bobList = await app.inject({
    method: "GET",
    url: "/events",
    headers: { authorization: "Bearer bob-dev-token" },
  });
  assert.equal(bobList.statusCode, 200);
  assert.equal(bobList.json().length, 0);

  const bobGet = await app.inject({
    method: "GET",
    url: `/events/${created.id}`,
    headers: { authorization: "Bearer bob-dev-token" },
  });
  assert.equal(bobGet.statusCode, 404);

  const update = await app.inject({
    method: "PATCH",
    url: `/events/${created.id}`,
    headers: { authorization: "Bearer alice-dev-token" },
    payload: {
      title: "Algorithms Practice",
      endAt: "2026-10-01T12:00:00+08:00",
    },
  });
  assert.equal(update.statusCode, 200);
  assert.equal(update.json().title, "Algorithms Practice");

  const ics = await app.inject({
    method: "GET",
    url: "/events/export.ics",
    headers: { authorization: "Bearer alice-dev-token" },
  });
  assert.equal(ics.statusCode, 200);
  assert.match(ics.headers["content-type"] ?? "", /^text\/calendar/);
  assert.match(ics.payload, /BEGIN:VCALENDAR/);
  assert.match(ics.payload, /SUMMARY:Algorithms Practice/);

  const deleted = await app.inject({
    method: "DELETE",
    url: `/events/${created.id}`,
    headers: { authorization: "Bearer alice-dev-token" },
  });
  assert.equal(deleted.statusCode, 204);

  const afterDelete = await app.inject({
    method: "GET",
    url: `/events/${created.id}`,
    headers: { authorization: "Bearer alice-dev-token" },
  });
  assert.equal(afterDelete.statusCode, 404);
});

test("invalid event ranges are rejected", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/events",
    headers: { authorization: "Bearer alice-dev-token" },
    payload: {
      title: "Broken Event",
      startAt: "2026-10-01T12:00:00+08:00",
      endAt: "2026-10-01T11:00:00+08:00",
    },
  });

  assert.equal(response.statusCode, 400);
});
