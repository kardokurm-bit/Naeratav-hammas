import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { badRequest, handle, notFound } from "@/lib/api-helpers";
import { sendMessage } from "@/lib/mock-ai";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) return badRequest("Tühja sõnumit ei saa saata.");

    const db = getDb();
    const chat = await db.chatSession.findUnique({ where: { id } });
    if (!chat) return notFound();

    const userMessage = await db.message.create({ data: { sessionId: id, role: "user", content } });
    const answer = await sendMessage(content, chat.model, { temperature: chat.temperature, topP: chat.topP });
    const assistantMessage = await db.message.create({
      data: { sessionId: id, role: "assistant", content: answer },
    });

    const isFirst = (await db.message.count({ where: { sessionId: id, role: "user" } })) === 1;
    const updated = await db.chatSession.update({
      where: { id },
      data: isFirst ? { title: content.length > 40 ? content.slice(0, 40) + "…" : content } : { updatedAt: new Date() },
    });

    return NextResponse.json({ userMessage, assistantMessage, chat: updated });
  });
}

/** Clears all messages of the chat ("Tühjenda vestlus"). */
export function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    const db = getDb();
    await db.message.deleteMany({ where: { sessionId: id } });
    await db.chatSession.updateMany({ where: { id }, data: { title: "Uus vestlus" } });
    return NextResponse.json({ ok: true });
  });
}
