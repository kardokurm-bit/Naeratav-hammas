# Project notes for Claude

## Deployment
- The app is deployed on Railway automatically from the `main` branch of this GitHub repo. Every push to `main` triggers a new deploy.
- The app does **not** run on the developer's computer.

## Database
- The database is a Railway PostgreSQL database.
- It is available only through the `DATABASE_URL` environment variable on Railway.
- Do **not** set up a local database or a local server (no local Postgres, Docker DB, dev server, etc.).

## Build requirement
- The Railway project is not set up yet, so `DATABASE_URL` may be missing at build time.
- `npm run build` must succeed **without a database connection**.
  - Pages and API routes that use the database must be dynamic (not pre-rendered at build time), e.g. `export const dynamic = "force-dynamic"` in Next.js.
  - Do not connect to the database at module load or during the build; create connections lazily inside request handlers.

## Workflow
- Before every push, run `npm run build` and make sure it passes.
- After each finished task, commit and push to GitHub (`main`) so Railway deploys the new version.
