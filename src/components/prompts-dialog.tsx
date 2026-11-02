"use client";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { api, type Prompt } from "@/lib/client-api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompts: Prompt[];
  onChanged: () => Promise<void> | void;
  onError: (message: string) => void;
}

const field =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500";

export function PromptsDialog({ open, onOpenChange, prompts, onChanged, onError }: Props) {
  const [editing, setEditing] = useState<{ id?: string; name: string; content: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      await onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Viga");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!editing || !editing.name.trim() || !editing.content.trim()) return;
    await run(() =>
      api("/api/prompts", {
        method: editing.id ? "PUT" : "POST",
        body: JSON.stringify(editing),
      }),
    );
    setEditing(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setEditing(null);
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogTitle>Halda prompte</DialogTitle>
        <DialogDescription>Lisa, muuda või kustuta assistendi rollid.</DialogDescription>

        {editing ? (
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="p-name">
                Nimi
              </label>
              <input
                id="p-name"
                className={field}
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="p-content">
                Sisu
              </label>
              <textarea
                id="p-content"
                rows={6}
                className={field}
                value={editing.content}
                onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Tühista
              </Button>
              <Button onClick={save} disabled={busy || !editing.name.trim() || !editing.content.trim()}>
                Salvesta
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <ul className="space-y-2">
              {prompts.map((p) => (
                <li key={p.id} className="flex items-start gap-2 rounded-lg border border-slate-200 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">{p.name}</p>
                    <p className="line-clamp-2 text-xs text-slate-500">{p.content}</p>
                  </div>
                  <Button variant="ghost" size="icon" aria-label="Muuda" onClick={() => setEditing(p)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Kustuta"
                    disabled={busy}
                    onClick={() => run(() => api(`/api/prompts?id=${encodeURIComponent(p.id)}`, { method: "DELETE" }))}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </li>
              ))}
              {prompts.length === 0 && <li className="text-sm text-slate-500">Prompte pole.</li>}
            </ul>
            <Button onClick={() => setEditing({ name: "", content: "" })}>
              <Plus className="h-4 w-4" /> Lisa prompt
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
