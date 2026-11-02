# Naeratav Hammas – suuhoolduse assistent

Estonian-language chatbot for a toothbrush and oral care e-shop. Next.js (App Router) + Tailwind + shadcn-style components + Prisma + PostgreSQL.

## Deployment (Railway)

- Railway builds from the `main` branch. `build` = `prisma generate && next build`, `start` = `prisma migrate deploy && next start` (listens on `PORT`).
- Set `DATABASE_URL` (Railway PostgreSQL) in the service variables. See `.env.example`.
- The build does not need a database. On first request a fresh database is seeded automatically
  (3 default system prompts + FAQ entries from `naeratav_hammas_faq.csv`). `prisma/seed.ts` does the same via `npx prisma db seed`.
- The mock AI answers by matching keywords against the `FaqEntry` table.
