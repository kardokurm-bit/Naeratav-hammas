import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ensureSeeded } from "@/lib/ensure-seed";
import { badRequest, handle, notFound } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

async function readPrompt(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  return { id: typeof body.id === "string" ? body.id : "", name, content };
}

export function GET() {
  return handle(async () => {
    await ensureSeeded();
    return NextResponse.json(await getDb().systemPrompt.findMany({ orderBy: { createdAt: "asc" } }));
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const { name, content } = await readPrompt(req);
    if (!name || !content) return badRequest("Nimi ja sisu on kohustuslikud.");
    return NextResponse.json(await getDb().systemPrompt.create({ data: { name, content } }), { status: 201 });
  });
}

export function PUT(req: Request) {
  return handle(async () => {
    const { id, name, content } = await readPrompt(req);
    if (!id || !name || !content) return badRequest("Nimi ja sisu on kohustuslikud.");
    const db = getDb();
    if (!(await db.systemPrompt.findUnique({ where: { id }, select: { id: true } }))) return notFound();
    return NextResponse.json(await db.systemPrompt.update({ where: { id }, data: { name, content } }));
  });
}

export function DELETE(req: Request) {
  return handle(async () => {
    const id = new URL(req.url).searchParams.get("id") ?? (await readPrompt(req)).id;
    if (!id) return badRequest("Puudub id.");
    await getDb().systemPrompt.deleteMany({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
