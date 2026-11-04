import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { handle, notFound } from "@/lib/api-helpers";
import { findOwnedChat } from "@/lib/owner";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// Every handler first checks that the chat belongs to the current browser;
// other browsers' chats answer 404 as if they did not exist.

export function GET(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    if (!(await findOwnedChat(req, id))) return notFound();
    const chat = await getDb().chatSession.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    return chat ? NextResponse.json(chat) : notFound();
  });
}

const clamp = (n: unknown) =>
  typeof n === "number" && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : undefined;

export function PATCH(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    if (!(await findOwnedChat(req, id))) return notFound();
    const chat = await getDb().chatSession.update({
      where: { id },
      data: {
        model: typeof body.model === "string" ? body.model : undefined,
        temperature: clamp(body.temperature),
        topP: clamp(body.topP),
        promptId: typeof body.promptId === "string" ? body.promptId : undefined,
      },
    });
    return NextResponse.json(chat);
  });
}

export function DELETE(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    if (!(await findOwnedChat(req, id))) return notFound();
    await getDb().chatSession.deleteMany({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
