import { getDb } from "./db";
import { seedDefaults } from "./seed-data";

let seeding: Promise<void> | null = null;

/**
 * The Railway start script only runs migrations, so a fresh database is seeded
 * once on first use (only when both the prompt and FAQ tables are empty).
 */
export function ensureSeeded(): Promise<void> {
  if (!seeding) {
    seeding = (async () => {
      const db = getDb();
      const [prompts, faq] = await Promise.all([db.systemPrompt.count(), db.faqEntry.count()]);
      if (prompts === 0 && faq === 0) await seedDefaults(db);
    })().catch((e) => {
      seeding = null;
      throw e;
    });
  }
  return seeding;
}
