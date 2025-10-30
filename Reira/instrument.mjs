import * as Sentry from "@sentry/node";
// Ensure to call this before importing any other modules!
Sentry.init({
  dsn: "https://3d5386eafdc6868b20b5ccd7f5d3f81d@o4510277314347008.ingest.de.sentry.io/4510277322342480",
  // Add Tracing by setting tracesSampleRate
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});
