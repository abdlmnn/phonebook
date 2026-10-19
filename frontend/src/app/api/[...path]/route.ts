import type { NextRequest } from "next/server";

/*
 * Explicit proxy to Django.
 *
 * Why not `rewrites()`? Next's rewrite machinery normalizes trailing slashes,
 * which breaks POST/DELETE to trailing-slash URLs (/api/contacts/ -> Django
 * sees /api/contacts -> redirect loop). This handler forwards the path exactly
 * as the browser sent it, so both sides keep the documented contract.
 */

const DJANGO_BASE = "http://localhost:8000";

// Hop-by-hop / misleading headers that must not be copied to the response.
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
