import { onTestFinished, test } from "bun:test";
import * as assert from "node:assert";
import Fastify from "fastify";
import fp from "fastify-plugin";
import App from "../src/app.js";

test("the custom events collection roundtrips documents in the in-memory MongoDB", async () => {
  const app = Fastify({ pluginTimeout: 5 * 60 * 1000 });
  onTestFinished(() => app.close());

  await app.register(fp(App), {
    mongoUri: undefined,
    mongoTestUri: undefined,
    authSkip: true,
  });
  await app.ready();

  const inserted = await app.collections.customEvents.insertOne({
    _id: "test-event",
    userId: "alice",
    title: "Test Event",
    startAt: new Date("2026-10-01T09:00:00Z"),
    endAt: new Date("2026-10-01T10:00:00Z"),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const found = await app.collections.customEvents.findOne({
    _id: inserted.insertedId,
  });

  assert.equal(found?.title, "Test Event");
});

test("the app reports ready with the custom events collection decorated", async () => {
  const app = Fastify({ pluginTimeout: 5 * 60 * 1000 });
  onTestFinished(() => app.close());

  await app.register(fp(App), {
    mongoUri: undefined,
    mongoTestUri: undefined,
    authSkip: true,
  });
  await app.ready();

  assert.ok(app.collections);
  assert.ok(app.collections.customEvents);
  assert.ok(typeof app.withAuth === "function");
});
