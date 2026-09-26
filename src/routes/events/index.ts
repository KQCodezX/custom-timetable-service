import type { FastifyPluginAsync } from "fastify";
import { Type } from "typebox";
import type { FastifyTypebox } from "../../app.js";
import {
  CustomEventNotFoundError,
  createCustomEvent,
  deleteCustomEvent,
  getCustomEvent,
  InvalidEventTimeError,
  listCustomEvents,
  updateCustomEvent,
} from "../../services/custom-events.js";
import { renderIcs } from "../../services/ical.js";

const ErrorResponse = Type.Object({
  statusCode: Type.Integer(),
  error: Type.String(),
  message: Type.String(),
});

const EventFields = {
  title: Type.String({ minLength: 1, maxLength: 200 }),
  description: Type.Optional(Type.String({ maxLength: 5000 })),
  location: Type.Optional(Type.String({ maxLength: 500 })),
  startAt: Type.String({ format: "date-time" }),
  endAt: Type.String({ format: "date-time" }),
};

const EventResponse = Type.Object({
  id: Type.String({ format: "uuid" }),
  title: Type.String(),
  description: Type.Optional(Type.String()),
  location: Type.Optional(Type.String()),
  startAt: Type.String({ format: "date-time" }),
  endAt: Type.String({ format: "date-time" }),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
});

const CreateEventBody = Type.Object(EventFields);
const UpdateEventBody = Type.Object(
  {
    ...EventFields,
    title: Type.Optional(EventFields.title),
    startAt: Type.Optional(EventFields.startAt),
    endAt: Type.Optional(EventFields.endAt),
  },
  { minProperties: 1 },
);

const EventParams = Type.Object({
  id: Type.String({ format: "uuid" }),
});

const ListQuery = Type.Object({
  from: Type.Optional(Type.String({ format: "date-time" })),
  to: Type.Optional(Type.String({ format: "date-time" })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
});

const events: FastifyPluginAsync = async (
  fastify: FastifyTypebox,
): Promise<void> => {
  fastify.withAuth(async (scope) => {
    scope.post(
      "/",
      {
        schema: {
          summary: "Create a custom timetable event",
          tags: ["Custom Events"],
          security: [{ Auth: [] }],
          body: CreateEventBody,
          response: { 201: EventResponse, 400: ErrorResponse },
        },
      },
      async (request, reply) => {
        try {
          const event = await createCustomEvent(
            fastify.collections.customEvents,
            request.user.username,
            request.body,
          );
          return reply.code(201).send(event);
        } catch (error) {
          if (error instanceof InvalidEventTimeError) {
            return reply.badRequest(error.message);
          }
          throw error;
        }
      },
    );

    scope.get(
      "/",
      {
        schema: {
          summary: "List the current user's custom timetable events",
          tags: ["Custom Events"],
          security: [{ Auth: [] }],
          querystring: ListQuery,
          response: { 200: Type.Array(EventResponse) },
        },
      },
      async (request) => {
        return listCustomEvents(
          fastify.collections.customEvents,
          request.user.username,
          {
            from: request.query.from,
            to: request.query.to,
            limit: request.query.limit ?? 100,
          },
        );
      },
    );

    scope.get(
      "/export.ics",
      {
        schema: {
          summary: "Export the current user's custom events as iCalendar",
          tags: ["Custom Events"],
          security: [{ Auth: [] }],
          querystring: ListQuery,
        },
      },
      async (request, reply) => {
        const events = await listCustomEvents(
          fastify.collections.customEvents,
          request.user.username,
          {
            from: request.query.from,
            to: request.query.to,
            limit: request.query.limit ?? 100,
          },
        );

        const calendar = renderIcs(events);
        return reply
          .header("Content-Type", "text/calendar; charset=utf-8")
          .header("Content-Disposition", 'attachment; filename="timetable.ics"')
          .send(calendar);
      },
    );

    scope.get(
      "/:id",
      {
        schema: {
          summary: "Get one custom timetable event",
          tags: ["Custom Events"],
          security: [{ Auth: [] }],
          params: EventParams,
          response: { 200: EventResponse, 404: ErrorResponse },
        },
      },
      async (request, reply) => {
        try {
          return await getCustomEvent(
            fastify.collections.customEvents,
            request.user.username,
            request.params.id,
          );
        } catch (error) {
          if (error instanceof CustomEventNotFoundError) {
            return reply.notFound(error.message);
          }
          throw error;
        }
      },
    );

    scope.patch(
      "/:id",
      {
        schema: {
          summary: "Update one custom timetable event",
          tags: ["Custom Events"],
          security: [{ Auth: [] }],
          params: EventParams,
          body: UpdateEventBody,
          response: {
            200: EventResponse,
            400: ErrorResponse,
            404: ErrorResponse,
          },
        },
      },
      async (request, reply) => {
        try {
          return await updateCustomEvent(
            fastify.collections.customEvents,
            request.user.username,
            request.params.id,
            request.body,
          );
        } catch (error) {
          if (error instanceof CustomEventNotFoundError) {
            return reply.notFound(error.message);
          }
          if (error instanceof InvalidEventTimeError) {
            return reply.badRequest(error.message);
          }
          throw error;
        }
      },
    );

    scope.delete(
      "/:id",
      {
        schema: {
          summary: "Delete one custom timetable event",
          tags: ["Custom Events"],
          security: [{ Auth: [] }],
          params: EventParams,
          response: { 204: Type.Null(), 404: ErrorResponse },
        },
      },
      async (request, reply) => {
        try {
          await deleteCustomEvent(
            fastify.collections.customEvents,
            request.user.username,
            request.params.id,
          );
          return reply.code(204).send(null);
        } catch (error) {
          if (error instanceof CustomEventNotFoundError) {
            return reply.notFound(error.message);
          }
          throw error;
        }
      },
    );
  });
};

export default events;
