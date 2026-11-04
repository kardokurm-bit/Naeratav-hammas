import { randomUUID } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { getDb } from "./db";

/**
 * Anonymous per-browser identity. Each browser gets a random ID in an httpOnly cookie,
 * and every chat is tied to the ID of the browser that created it. No login is involved,
 * so chats are only visible in the browser (and cookie) they were created in.
 */
const COOKIE_NAME = "nh_owner";
const ONE_YEAR = 60 * 60 * 24 * 365;
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The current browser's owner ID, or null if it has none yet (or a malformed one). */
export function readOwnerId(req: NextRequest): string | null {
  const value = req.cookies.get(COOKIE_NAME)?.value;
  return value && ID_PATTERN.test(value) ? value : null;
}

/** The current browser's owner ID, minting a new one if needed. Pass `isNew` results to `attachOwnerCookie`. */
export function getOrCreateOwnerId(req: NextRequest): { ownerId: string; isNew: boolean } {
  const existing = readOwnerId(req);
  return existing ? { ownerId: existing, isNew: false } : { ownerId: randomUUID(), isNew: true };
}

/** The chat with this ID if it belongs to the current browser, otherwise null (treated as "not found"). */
export async function findOwnedChat(req: NextRequest, id: string) {
  const ownerId = readOwnerId(req);
  if (!ownerId) return null;
  return getDb().chatSession.findFirst({ where: { id, ownerId } });
}

/** Stores a newly minted owner ID in the browser. */
export function attachOwnerCookie<T extends NextResponse>(res: T, ownerId: string, isNew: boolean): T {
  if (isNew) {
    res.cookies.set(COOKIE_NAME, ownerId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ONE_YEAR,
    });
  }
  return res;
}
