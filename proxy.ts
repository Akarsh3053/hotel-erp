import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Public routes — everything else requires an authenticated session.
 * Fine-grained role/property authorization is enforced server-side per
 * route handler / server action (spec §10); this proxy only gates auth.
 *
 * This is Next 16's `proxy` file convention (formerly `middleware`). Clerk's
 * `clerkMiddleware` is exported as the single default export, which the proxy
 * convention accepts.
 */
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/health",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static assets (incl. sw.js, manifest, icons)
    // unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ico|webp|avif|woff2?|ttf|otf|map|txt|xml|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
