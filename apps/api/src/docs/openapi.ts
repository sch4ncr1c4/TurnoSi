export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "TurnoSi API",
    version: "1.0.0"
  },
  servers: [{ url: "/api/v1" }],
  components: {
    securitySchemes: {
      cookieAuth: { type: "apiKey", in: "cookie", name: "access_token" }
    }
  },
  paths: {
    "/health": {
      get: { summary: "API health", responses: { "200": { description: "Healthy" } } }
    },
    "/auth/register": {
      post: { summary: "Register account", responses: { "201": { description: "Created" } } }
    },
    "/auth/login": {
      post: { summary: "Create session", responses: { "200": { description: "Authenticated" } } }
    },
    "/auth/refresh": {
      post: { summary: "Rotate session", responses: { "200": { description: "Rotated" } } }
    },
    "/calendar/appointments": {
      get: {
        summary: "List appointments",
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "Appointments" } }
      }
    },
    "/availability/weekly": {
      get: {
        summary: "Get weekly availability",
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "Availability" } }
      },
      put: {
        summary: "Replace weekly availability",
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "Updated" } }
      }
    },
    "/public/booking/{organizationSlug}": {
      get: {
        summary: "Public booking page data",
        responses: { "200": { description: "Public organization and services" } }
      }
    }
  }
} as const;
