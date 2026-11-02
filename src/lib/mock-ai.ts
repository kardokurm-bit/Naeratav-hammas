import { getDb } from "./db";

export interface AiSettings {
  temperature: number;
  topP: number;
}

export const FALLBACK_ANSWER =
  "Vabandust, ma ei leidnud sellele küsimusele sobivat vastust. Palun võta ühendust meie klienditoega, kes aitab sind hea meelega edasi.";

/** Mock AI: waits 1.5s, then answers by keyword matching against the FaqEntry table. */
export async function sendMessage(text: string, model: string, settings: AiSettings): Promise<string> {
  void model;
  void settings;
  const [entries] = await Promise.all([
    getDb().faqEntry.findMany(),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]);

  const haystack = text.toLowerCase();
  let best: { answer: string; score: number } | null = null;
  for (const entry of entries) {
    const score = entry.keywords
      .split(/[;,]/)
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k && haystack.includes(k)).length;
    if (score > 0 && (!best || score > best.score)) best = { answer: entry.answer, score };
  }
  return best ? best.answer : FALLBACK_ANSWER;
}
