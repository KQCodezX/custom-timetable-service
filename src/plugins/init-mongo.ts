import mongodb from "@fastify/mongodb";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { Collection } from "mongodb";
import packageJson from "../../package.json" with { type: "json" };
import type { CustomEventDocument } from "../types/custom-event.js";

export type ResolveMongoUriOptions = {
  test?: boolean;
  mongoUri?: string;
  mongoTestUri?: string;
};

const PRODUCTION_DEFAULT_URI = "mongodb://localhost:27018";

function parseMongoConnectionString(uri: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch (cause) {
    throw new Error("Invalid MongoDB URI", { cause });
  }

  if (parsed.protocol !== "mongodb:" && parsed.protocol !== "mongodb+srv:") {
    throw new Error(
      `Invalid MongoDB URI: expected a "mongodb://" or "mongodb+srv://" scheme, got "${uri}"`,
    );
  }

  return parsed;
}

function setMongoDatabase(connectionString: URL, databaseName: string): string {
  const hasCredentials =
    connectionString.username !== "" || connectionString.password !== "";

  if (hasCredentials && !connectionString.searchParams.has("authSource")) {
    const currentDatabase =
      decodeURIComponent(connectionString.pathname.slice(1)) || "admin";
    connectionString.searchParams.set("authSource", currentDatabase);
  }

  connectionString.pathname = `/${databaseName}`;
  return connectionString.toString();
}

export function withDefaultMongoDatabase(
  uri: string,
  databaseName: string,
): string {
  const connectionString = parseMongoConnectionString(uri);

  if (connectionString.pathname === "" || connectionString.pathname === "/") {
    return setMongoDatabase(connectionString, databaseName);
  }

  return uri;
}

export async function resolveMongoUri(
  fastify: FastifyInstance,
  databaseName: string,
  opts: ResolveMongoUriOptions = {},
): Promise<string> {
  const explicitUri = opts.test ? opts.mongoTestUri : opts.mongoUri;

  if (explicitUri !== undefined) {
    return withDefaultMongoDatabase(explicitUri, databaseName);
  }

  if (Bun.env.NODE_ENV === "production") {
    return withDefaultMongoDatabase(PRODUCTION_DEFAULT_URI, databaseName);
  }

  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const mongod = await MongoMemoryServer.create();

  fastify.addHook("onClose", async () => {
    await mongod.stop();
  });

  return withDefaultMongoDatabase(mongod.getUri(), databaseName);
}

export type MongoPluginOptions = {
  databaseName: string;
} & ResolveMongoUriOptions;

export const mongoPlugin = fp<MongoPluginOptions>(async (fastify, opts) => {
  const uri = await resolveMongoUri(fastify, opts.databaseName, opts);

  await fastify.register(mongodb, {
    url: uri,
    forceClose: true,
  });
});

export type InitMongoPluginOptions = {
  mongoUri: string | undefined;
  mongoTestUri: string | undefined;
  test?: boolean;
};

export default fp<InitMongoPluginOptions>(async (fastify, opts) => {
  await fastify.register(mongoPlugin, {
    databaseName: packageJson.name,
    mongoUri: opts.mongoUri,
    mongoTestUri: opts.mongoTestUri,
    test: opts.test,
  });

  fastify.addHook("onReady", async () => {
    const db = fastify.mongo.db;

    if (!db) {
      throw new Error(
        "MongoDB database handle is unavailable; mongoPlugin did not connect. Check MONGO_URI and the MongoDB server.",
      );
    }

    const customEvents = db.collection<CustomEventDocument>("customEvents");
    await customEvents.createIndex({ userId: 1, startAt: 1 });

    fastify.decorate("collections", { customEvents });
  });
});

declare module "fastify" {
  export interface FastifyInstance {
    collections: {
      customEvents: Collection<CustomEventDocument>;
    };
  }
}
