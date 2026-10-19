import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root (a stray package-lock.json in the user's home
  // directory otherwise confuses Turbopack's root detection).
  turbopack: {
    root: __dirname,
  },
  // /api/* requests are proxied to Django by src/app/api/[...path]/route.ts.
  // This disables Next's automatic /path/ <-> /path URL redirection inside the
  // app itself, so our proxy can forward the request with its original URL.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
