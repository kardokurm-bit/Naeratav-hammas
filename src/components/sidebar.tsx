"use client";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Chat } from "@/lib/client-api";

interface Props {
  chats: Chat[];
  activeId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export function formatStamp(iso: string) {
  return new Date(iso).toLocaleString("et-EE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Sidebar({ chats, activeId, loading, onSelect, onDelete, onNew }: Props) {
  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 px-4 py-4">
        <h2 className="text-sm font-semibold text-slate-800">Vestluste ajalugu</h2>
      </div>

      <ul className="flex-1 space-y-1 overflow-y-auto p-2">
        {loading && <li className="p-3 text-sm text-slate-400">Laen...</li>}
        {!loading && chats.length === 0 && <li className="p-3 text-sm text-slate-400">Vestlusi pole veel.</li>}
        {chats.map((c) => (
          <li key={c.id} className="group relative">
            <button
              onClick={() => onSelect(c.id)}
              className={cn(
                "flex w-full items-start gap-2 rounded-lg px-3 py-2 pr-10 text-left transition-colors hover:bg-slate-200/60",
                c.id === activeId && "bg-teal-50 ring-1 ring-teal-200 hover:bg-teal-50",
              )}
            >
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-700">{c.title}</span>
                <span className="block text-xs text-slate-400">{formatStamp(c.updatedAt)}</span>
              </span>
            </button>
            <button
              onClick={() => onDelete(c.id)}
              aria-label="Kustuta vestlus"
              className="absolute right-2 top-2 rounded-md p-1.5 text-slate-400 opacity-100 hover:bg-red-50 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <div className="sticky bottom-0 border-t border-slate-200 bg-slate-50 p-3">
        <Button className="w-full" onClick={onNew}>
          <Plus className="h-4 w-4" /> Uus vestlus
        </Button>
      </div>
    </div>
  );
}
