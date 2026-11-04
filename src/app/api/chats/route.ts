import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { ensureSeeded } from "@/lib/ensure-seed";
import { handle } from "@/lib/api-helpers";
import { attachOwnerCookie, getOrCreateOwnerId } from "@/lib/owner";

export const dynamic = "force-dynamic";

/** Lists only the chats that belong to the current browser. */
export function GET(req: NextRequest) {
  return handle(async () => {
    await ensureSeeded();
    const { ownerId, isNew } = getOrCreateOwnerId(req);
    const chats = isNew
      ? []
      : await getDb().chatSession.findMany({ where: { ownerId }, orderBy: { updatedAt: "desc" } });
    return attachOwnerCookie(NextResponse.json(chats), ownerId, isNew);
  });
}

export function POST(req: NextRequest) {
  return handle(async () => {
    await ensureSeeded();
    const { ownerId, isNew } = getOrCreateOwnerId(req);
    const body = await req.json().catch(() => ({}));
    const db = getDb();
    const prompt = await db.systemPrompt.findFirst({ orderBy: { createdAt: "asc" } });
    const chat = await db.chatSession.create({
      data: {
        ownerId,
        model: typeof body.model === "string" ? body.model : undefined,
        promptId: typeof body.promptId === "string" ? body.promptId : prompt?.id,
      },
    });
    return attachOwnerCookie(NextResponse.json(chat, { status: 201 }), ownerId, isNew);
  });
}
