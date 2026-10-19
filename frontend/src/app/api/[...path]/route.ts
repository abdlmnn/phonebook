import type { NextRequest } from "next/server";

// Proxies /api requests to the Django backend.
// A route handler is used (not rewrites) because Next rewrites change the
// URL's trailing slash, which breaks POST and DELETE on Django.

const DJANGO_BASE = "http://localhost:8000";

// These response headers should not be sent on to the browser.
const DROPPED_RESPONSE_HEADERS = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
]);

async function proxy(request: NextRequest): Promise<Response> {
  const target = `${DJANGO_BASE}${request.nextUrl.pathname}${request.nextUrl.search}`;

  const response = await fetch(target, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    // Chrome/undici requires this when streaming a request body.
    duplex: "half",
  } as RequestInit);

  const headers = new Headers();
  response.headers.forEach((value, key) => {
    if (!DROPPED_RESPONSE_HEADERS.has(key)) {
      headers.set(key, value);
    }
  });

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

export {
  proxy as DELETE,
  proxy as GET,
  proxy as HEAD,
  proxy as OPTIONS,
  proxy as PATCH,
  proxy as POST,
  proxy as PUT,
};
