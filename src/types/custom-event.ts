import type { Collection } from "mongodb";

/** MongoDB representation of a user-created timetable event. */
export type CustomEventDocument = {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  location?: string;
  startAt: Date;
  endAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

/** The fields a client is allowed to provide when creating an event. */
export type CreateCustomEventInput = {
  title: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt: string;
};

/** All event fields are optional for a PATCH request. */
export type UpdateCustomEventInput = Partial<CreateCustomEventInput>;

export type EventResponse = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt: string;
  createdAt: string;
  updatedAt: string;
};

export type EventCollection = Collection<CustomEventDocument>;
