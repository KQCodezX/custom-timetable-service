import { randomUUID } from "node:crypto";
import type { Filter } from "mongodb";
import type {
  CreateCustomEventInput,
  CustomEventDocument,
  EventCollection,
  EventResponse,
  UpdateCustomEventInput,
} from "../types/custom-event.js";

export class CustomEventNotFoundError extends Error {
  constructor() {
    super("Custom event not found");
    this.name = "CustomEventNotFoundError";
  }
}

export class InvalidEventTimeError extends Error {
  constructor() {
    super("endAt must be later than startAt");
    this.name = "InvalidEventTimeError";
  }
}

function parseDate(value: string): Date {
  return new Date(value);
}

function assertValidTimeRange(startAt: Date, endAt: Date): void {
  if (
    Number.isNaN(startAt.getTime()) ||
    Number.isNaN(endAt.getTime()) ||
    endAt <= startAt
  ) {
    throw new InvalidEventTimeError();
  }
}

export function toEventResponse(event: CustomEventDocument): EventResponse {
  return {
    id: event._id,
    title: event.title,
    ...(event.description !== undefined
      ? { description: event.description }
      : {}),
    ...(event.location !== undefined ? { location: event.location } : {}),
    startAt: event.startAt.toISOString(),
    endAt: event.endAt.toISOString(),
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

export async function createCustomEvent(
  collection: EventCollection,
  userId: string,
  input: CreateCustomEventInput,
): Promise<EventResponse> {
  const startAt = parseDate(input.startAt);
  const endAt = parseDate(input.endAt);
  assertValidTimeRange(startAt, endAt);

  const now = new Date();
  const event: CustomEventDocument = {
    _id: randomUUID(),
    userId,
    title: input.title,
    ...(input.description !== undefined
      ? { description: input.description }
      : {}),
    ...(input.location !== undefined ? { location: input.location } : {}),
    startAt,
    endAt,
    createdAt: now,
    updatedAt: now,
  };

  await collection.insertOne(event);
  return toEventResponse(event);
}

export async function listCustomEvents(
  collection: EventCollection,
  userId: string,
  filters: { from?: string; to?: string; limit: number },
): Promise<EventResponse[]> {
  const query: Filter<CustomEventDocument> = { userId };

  if (filters.from !== undefined) {
    // An event overlaps the lower bound when it ends after the requested start.
    query.endAt = { $gt: parseDate(filters.from) };
  }

  if (filters.to !== undefined) {
    // An event overlaps the upper bound when it starts before the requested end.
    query.startAt = { $lt: parseDate(filters.to) };
  }

  const events = await collection
    .find(query)
    .sort({ startAt: 1, _id: 1 })
    .limit(filters.limit)
    .toArray();

  return events.map(toEventResponse);
}

export async function getCustomEvent(
  collection: EventCollection,
  userId: string,
  id: string,
): Promise<EventResponse> {
  const event = await collection.findOne({ _id: id, userId });
  if (event === null) {
    throw new CustomEventNotFoundError();
  }
  return toEventResponse(event);
}

export async function updateCustomEvent(
  collection: EventCollection,
  userId: string,
  id: string,
  input: UpdateCustomEventInput,
): Promise<EventResponse> {
  const existing = await collection.findOne({ _id: id, userId });
  if (existing === null) {
    throw new CustomEventNotFoundError();
  }

  const startAt =
    input.startAt !== undefined ? parseDate(input.startAt) : existing.startAt;
  const endAt =
    input.endAt !== undefined ? parseDate(input.endAt) : existing.endAt;
  assertValidTimeRange(startAt, endAt);

  const set: Partial<CustomEventDocument> = {
    startAt,
    endAt,
    updatedAt: new Date(),
  };

  if (input.title !== undefined) set.title = input.title;
  if (input.description !== undefined) set.description = input.description;
  if (input.location !== undefined) set.location = input.location;

  await collection.updateOne({ _id: id, userId }, { $set: set });

  const updated = await collection.findOne({ _id: id, userId });
  if (updated === null) {
    throw new CustomEventNotFoundError();
  }

  return toEventResponse(updated);
}

export async function deleteCustomEvent(
  collection: EventCollection,
  userId: string,
  id: string,
): Promise<void> {
  const result = await collection.deleteOne({ _id: id, userId });
  if (result.deletedCount === 0) {
    throw new CustomEventNotFoundError();
  }
}
