import fs from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";

export const DEFAULT_PROMPTS = [
  {
    name: "Tootenõustaja",
    content:
      "Sa oled Naeratav Hammas e-poe tootenõustaja. Aitad klientidel valida sobiva hambaharja, arvestades nende vajadusi (tundlikud igemed, lapsed, breketid, elektriline või tavaline hambahari).",
  },
  {
    name: "Suuhoolduse juhendaja",
    content:
      "Sa oled suuhoolduse juhendaja. Selgitad õiget hambapesu tehnikat, hambavahede puhastamist ja üldisi suuhoolduse põhimõtteid lihtsas ja sõbralikus keeles.",
  },
  {
    name: "Klienditugi",
    content:
      "Sa oled Naeratav Hammas klienditugi. Vastad küsimustele tarne, tagastuse ja garantii kohta viisakalt ja selgelt.",
  },
];

/** Minimal CSV parser (handles quotes, escaped quotes, CRLF and a leading BOM). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

export function loadFaqFromCsv() {
  const file = path.join(process.cwd(), "naeratav_hammas_faq.csv");
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  return rows.slice(1).map(([keywords, question, answer]) => ({
    keywords: keywords.trim(),
    question: (question ?? "").trim(),
    answer: (answer ?? "").trim(),
  }));
}

/** Inserts default prompts and FAQ entries into whichever of the two tables is empty. */
export async function seedDefaults(db: PrismaClient) {
  if ((await db.systemPrompt.count()) === 0) {
    await db.systemPrompt.createMany({ data: DEFAULT_PROMPTS });
  }
  if ((await db.faqEntry.count()) === 0) {
    await db.faqEntry.createMany({ data: loadFaqFromCsv() });
  }
}
