import { NextResponse } from "next/server";

export const DB_ERROR = "Andmebaasiga ei õnnestunud ühendust luua. Palun proovi hiljem uuesti.";

/** Wraps a route handler so database failures return a friendly JSON error instead of crashing. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: DB_ERROR }, { status: 503 });
  }
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound() {
  return NextResponse.json({ error: "Ei leitud" }, { status: 404 });
}
