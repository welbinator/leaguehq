# LeagueHQ

> Sports league management made simple. The modern alternative to TeamSnap.

LeagueHQ is a full-featured SaaS platform for sports league administrators. Manage teams, rosters, schedules, standings, payments, and communications — all in one place.

## Features

- **Multi-division leagues** — Set up A/B/C divisions with separate pricing
- **Flexible roster management** — Assign control to coaches, captains, or both
- **Player registration** — With Stripe payments, per-player or per-team pricing
- **Scheduling & standings** — Auto-calculated rankings after score entry
- **Team chat** — Private team rooms + custom league-wide channels
- **Referee management** — Optional in-app referee registration
- **PWA** — Install on iOS, Android, or desktop from the browser

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js (email/password, role-based)
- **Payments:** Stripe
- **Chat:** Socket.io
- **Hosting:** Railway

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL running locally (or use Railway's dev DB)

### Setup

```bash
git clone https://github.com/welbinator/leaguehq.git
cd leaguehq
npm install
cp .env.example .env
# Fill in your .env values
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random secret for NextAuth (generate with `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Your app URL (http://localhost:3000 for local) |
| `STRIPE_SECRET_KEY` | Stripe secret key (from Stripe dashboard) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

## Deployment to Railway

1. Push to GitHub
2. Create a new Railway project → **Deploy from GitHub repo**
3. Add a **PostgreSQL** database service to the same project
4. Set environment variables in Railway dashboard (Railway auto-injects `DATABASE_URL`)
5. Set `NEXTAUTH_URL` to your Railway public domain
6. Generate `NEXTAUTH_SECRET`: `openssl rand -base64 32`
7. Add your Stripe keys
8. Railway auto-deploys on every push to `main`

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── (auth)/           # Login & register
│   ├── dashboard/        # League admin dashboard
│   ├── leagues/[slug]/   # Per-league pages
│   └── api/              # API routes
├── components/
│   ├── ui/               # Reusable UI primitives
│   ├── layout/           # Navbar, Sidebar, Footer
│   └── league/           # League-specific components
├── lib/                  # Prisma, Auth, Stripe clients
└── types/                # TypeScript types
```

## License

MIT
