import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { handle, notFound } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    const chat = await getDb().chatSession.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    return chat ? NextResponse.json(chat) : notFound();
  });
}

const clamp = (n: unknown) =>
  typeof n === "number" && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : undefined;

export function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const db = getDb();
    if (!(await db.chatSession.findUnique({ where: { id }, select: { id: true } }))) return notFound();
    const chat = await db.chatSession.update({
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

export function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    await getDb().chatSession.deleteMany({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
