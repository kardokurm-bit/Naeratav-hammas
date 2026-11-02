import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ensureSeeded } from "@/lib/ensure-seed";
import { handle } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export function GET() {
  return handle(async () => {
    await ensureSeeded();
    const chats = await getDb().chatSession.findMany({ orderBy: { updatedAt: "desc" } });
    return NextResponse.json(chats);
  });
}

export function POST(req: Request) {
  return handle(async () => {
    await ensureSeeded();
    const body = await req.json().catch(() => ({}));
    const db = getDb();
    const prompt = await db.systemPrompt.findFirst({ orderBy: { createdAt: "asc" } });
    const chat = await db.chatSession.create({
      data: {
        model: typeof body.model === "string" ? body.model : undefined,
        promptId: typeof body.promptId === "string" ? body.promptId : prompt?.id,
      },
    });
    return NextResponse.json(chat, { status: 201 });
  });
}
