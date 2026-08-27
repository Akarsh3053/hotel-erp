# Hotel ERP

Multi-property hotel management — reservations, rooms, and housekeeping. Built
mobile-first as an installable PWA; see [specs.md](specs.md) for the full
product spec.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui**
- **Clerk** — authentication (one Organization per property)
- **Neon Postgres** + **Drizzle ORM**
- **Cloudinary** — image storage (private/authenticated delivery, signed URLs)
- **Serwist** — PWA / service worker
- **Zod** — validation shared by client and server

## Prerequisites

- Node.js 20+ (developed on 22)
- Accounts: [Clerk](https://dashboard.clerk.com),
  [Neon](https://console.neon.tech), and [Cloudinary](https://cloudinary.com).

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in real values
```

Fill in `.env.local` (all keys are documented inline in `.env.example`):

- **Clerk** — publishable + secret keys, and a webhook signing secret. In the
  Clerk dashboard add a webhook endpoint pointing at `/api/webhooks/clerk`
  subscribed to `user.created`, `user.updated`, `user.deleted`. For local
  testing, expose your dev server with a tunnel (e.g. `ngrok`) and use that URL.
- **Neon** — the pooled `DATABASE_URL`.
- **Cloudinary** — the `CLOUDINARY_URL` (Dashboard → API Environment
  variable). Uploads land in the `id-docs` folder and ID photos are stored
  privately (authenticated delivery), never public.

## Database

The full schema lives in [`lib/db/schema.ts`](lib/db/schema.ts).

```bash
npm run db:push       # push schema straight to the database (fast, dev)
# or, migration-based:
npm run db:generate   # generate SQL migrations from the schema
npm run db:migrate    # apply migrations
npm run db:studio     # browse data in Drizzle Studio
```

## Run

```bash
npm run dev           # http://localhost:3000
```

Verify:

- `GET /api/health` → `{ "ok": true }` confirms the database connection.
- Sign up via `/sign-up`; the Clerk webhook creates a matching `users` row.

## Scripts

| Script                | What it does                          |
| --------------------- | ------------------------------------- |
| `npm run dev`         | Start the dev server                  |
| `npm run build`       | Production build (generates the SW)   |
| `npm run start`       | Serve the production build            |
| `npm run lint`        | ESLint                                |
| `npm run typecheck`   | `tsc --noEmit`                        |
| `npm run db:push`     | Push schema to the database           |
| `npm run db:generate` | Generate SQL migrations               |
| `npm run db:migrate`  | Apply migrations                      |
| `npm run db:studio`   | Open Drizzle Studio                   |

## PWA

The app is installable and works offline for the app shell. The service worker
is **disabled in development** and generated at build time — test it with
`npm run build && npm run start`, then use Chrome DevTools → Application.

## Notes

- All authorization is enforced **server-side** (`lib/auth/rbac.ts`); client-side
  role gating is UX only.
- Every tenant-scoped query is filtered by `property_id`.
- ID photos and other uploads are private — stored as Cloudinary
  `authenticated` assets and served via server-generated signed URLs, never
  publicly reachable.
