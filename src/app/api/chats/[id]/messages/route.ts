import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { badRequest, handle, notFound } from "@/lib/api-helpers";
import { sendMessage } from "@/lib/mock-ai";
import { findOwnedChat } from "@/lib/owner";

export const dynamic = "force-dynamic";

const DEFAULT_TITLE = "Uus vestlus";

type Ctx = { params: Promise<{ id: string }> };

export function POST(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) return badRequest("Tühja sõnumit ei saa saata.");

    const db = getDb();
    const chat = await findOwnedChat(req, id);
    if (!chat) return notFound();

    const userMessage = await db.message.create({ data: { sessionId: id, role: "user", content } });
    const answer = await sendMessage(content, chat.model, { temperature: chat.temperature, topP: chat.topP });
    const assistantMessage = await db.message.create({
      data: { sessionId: id, role: "assistant", content: answer },
    });

    // Name the chat after its first message. Checking for the default title (instead of
    // counting messages) stays correct when two first messages arrive at the same time:
    // the conditional update below lets exactly one of them set the title.
    const firstUserMessage = await db.message.findFirst({
      where: { sessionId: id, role: "user" },
      orderBy: { createdAt: "asc" },
    });
    const source = firstUserMessage?.content.split("\n📎")[0].trim() || content;
    const title = source.length > 40 ? source.slice(0, 40) + "…" : source;
    await db.chatSession.updateMany({
      where: { id, title: DEFAULT_TITLE },
      data: { title },
    });
    const updated = await db.chatSession.update({ where: { id }, data: { updatedAt: new Date() } });

    return NextResponse.json({ userMessage, assistantMessage, chat: updated });
  });
}

/** Clears all messages of the chat ("Tühjenda vestlus"). */
export function DELETE(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    if (!(await findOwnedChat(req, id))) return notFound();
    const db = getDb();
    await db.message.deleteMany({ where: { sessionId: id } });
    await db.chatSession.updateMany({ where: { id }, data: { title: DEFAULT_TITLE } });
    return NextResponse.json({ ok: true });
  });
}
