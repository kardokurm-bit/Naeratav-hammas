"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Menu, Paperclip, Send, Settings2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sidebar } from "@/components/sidebar";
import { PromptsDialog } from "@/components/prompts-dialog";
import { api, MODELS, type Chat, type Message, type Prompt } from "@/lib/client-api";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "Milline hambahari sobib tundlikele igemetele?",
  "Kas elektriline hambahari on parem kui tavaline?",
  "Kui tihti peaks hambaharja vahetama?",
];

const time = (iso: string) => new Date(iso).toLocaleTimeString("et-EE", { hour: "2-digit", minute: "2-digit" });

export function ChatApp() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [file, setFile] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [promptsOpen, setPromptsOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const tempCounter = useRef(0);

  const active = chats.find((c) => c.id === activeId) ?? null;
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : "Midagi läks valesti.");

  const loadPrompts = useCallback(async () => {
    setPrompts(await api<Prompt[]>("/api/prompts"));
  }, []);

  const openChat = useCallback(async (id: string) => {
    setActiveId(id);
    setSidebarOpen(false);
    setMessages([]);
    try {
      const chat = await api<Chat & { messages: Message[] }>(`/api/chats/${id}`);
      setMessages(chat.messages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vestluse laadimine ebaõnnestus.");
    }
  }, []);

  const createChat = useCallback(
    async (defaults?: { model?: string; promptId?: string | null }) => {
      const chat = await api<Chat>("/api/chats", {
        method: "POST",
        body: JSON.stringify({ model: defaults?.model, promptId: defaults?.promptId ?? undefined }),
      });
      setChats((prev) => [chat, ...prev]);
      setActiveId(chat.id);
      setMessages([]);
      setSidebarOpen(false);
      return chat;
    },
    [],
  );

  const init = useCallback(async () => {
    try {
      const [list] = await Promise.all([api<Chat[]>("/api/chats"), loadPrompts()]);
      setChats(list);
      if (list.length > 0) await openChat(list[0].id);
      else await createChat();
    } catch (e) {
      fail(e);
    } finally {
      setLoadingList(false);
    }
  }, [loadPrompts, openChat, createChat]);

  useEffect(() => {
    // Initial data load from the API on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void init();
  }, [init]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  function resizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  async function newChat() {
    setError(null);
    // Reuse an untouched empty chat instead of piling up blank sessions.
    if (active && messages.length === 0 && !sending) {
      setSidebarOpen(false);
      return;
    }
    try {
      await createChat({ model: active?.model, promptId: active?.promptId });
    } catch (e) {
      fail(e);
    }
  }

  async function deleteChat(id: string) {
    setError(null);
    try {
      await api(`/api/chats/${id}`, { method: "DELETE" });
      const rest = chats.filter((c) => c.id !== id);
      setChats(rest);
      if (id === activeId) {
        if (rest.length > 0) await openChat(rest[0].id);
        else await createChat();
      }
    } catch (e) {
      fail(e);
    }
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending || !active) return;
    const chatId = active.id;
    const fullContent = file ? `${content}\n📎 ${file}` : content;
    const temp: Message = {
      id: `temp-${++tempCounter.current}`,
      sessionId: chatId,
      role: "user",
      content: fullContent,
      createdAt: new Date().toISOString(),
    };
    setError(null);
    setMessages((m) => [...m, temp]);
    setInput("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    requestAnimationFrame(resizeTextarea);
    setSending(true);
    try {
      const res = await api<{ userMessage: Message; assistantMessage: Message; chat: Chat }>(
        `/api/chats/${chatId}/messages`,
        { method: "POST", body: JSON.stringify({ content: fullContent }) },
      );
      setChats((prev) => [res.chat, ...prev.filter((c) => c.id !== chatId)]);
      setMessages((m) =>
        activeIdRef.current === chatId
          ? [...m.filter((x) => x.id !== temp.id), res.userMessage, res.assistantMessage]
          : m,
      );
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== temp.id));
      setInput(content);
      fail(e);
    } finally {
      setSending(false);
    }
  }

  // Tracks the open chat so a late reply is not appended to a different chat.
  const activeIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  async function clearChat() {
    if (!active || sending) return;
    setError(null);
    try {
      await api(`/api/chats/${active.id}/messages`, { method: "DELETE" });
      setMessages([]);
      setChats((prev) => prev.map((c) => (c.id === active.id ? { ...c, title: "Uus vestlus" } : c)));
    } catch (e) {
      fail(e);
    }
  }

  async function updateSettings(patch: Partial<Pick<Chat, "model" | "temperature" | "topP" | "promptId">>, persist = true) {
    if (!active) return;
    const id = active.id;
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    if (!persist) return;
    try {
      await api(`/api/chats/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    } catch (e) {
      fail(e);
    }
  }

  const empty = messages.length === 0 && !sending;

  return (
    <div className="flex h-full bg-white text-slate-800">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[260px] border-r border-slate-200 transition-transform md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar
          chats={chats}
          activeId={activeId}
          loading={loadingList}
          onSelect={(id) => void openChat(id)}
          onDelete={(id) => void deleteChat(id)}
          onNew={() => void newChat()}
        />
      </aside>

      {/* Main panel */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Ava menüü"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold leading-tight text-slate-900">Naeratav Hammas</h1>
              <p className="truncate text-xs text-slate-500">Suuhoolduse assistent</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="w-40">
              <label className="mb-1 block text-xs font-medium text-slate-500">LLM Model</label>
              <Select
                value={active?.model ?? "gpt-4"}
                onValueChange={(model) => void updateSettings({ model })}
                disabled={!active}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-52">
              <label className="mb-1 block text-xs font-medium text-slate-500">System Prompt</label>
              <Select
                value={active?.promptId ?? undefined}
                onValueChange={(promptId) => void updateSettings({ promptId })}
                disabled={!active || prompts.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vali roll" />
                </SelectTrigger>
                <SelectContent>
                  {prompts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="secondary" className="h-9" onClick={() => setPromptsOpen(true)}>
              <Settings2 className="h-4 w-4" /> Halda prompte
            </Button>
          </div>

          <Accordion type="single" collapsible className="mt-3">
            <AccordionItem value="advanced">
              <AccordionTrigger>Täpsemad seaded</AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-5 sm:grid-cols-2">
                  {(
                    [
                      ["temperature", "Temperature"],
                      ["topP", "Top-P"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key}>
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="text-slate-600">{label}</span>
                        <span className="font-mono text-teal-700">{(active?.[key] ?? 0).toFixed(1)}</span>
                      </div>
                      <Slider
                        min={0}
                        max={1}
                        step={0.1}
                        disabled={!active}
                        value={[active?.[key] ?? 0]}
                        onValueChange={([v]) => void updateSettings({ [key]: v }, false)}
                        onValueCommit={([v]) => void updateSettings({ [key]: v })}
                        aria-label={label}
                      />
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </header>

        {error && (
          <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{error}</span>
            {chats.length === 0 && !loadingList && (
              <button
                className="font-medium underline"
                onClick={() => {
                  setLoadingList(true);
                  setError(null);
                  void init();
                }}
              >
                Proovi uuesti
              </button>
            )}
            <button aria-label="Sulge" onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Chat window */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 px-4 py-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {empty && active && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-700">
                  Tere! Mina olen Naeratav Hammas suuhoolduse assistent. Aitan sul valida sobiva hambaharja ja annan
                  nõu suuhoolduse kohta. Mida soovid teada?
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {EXAMPLES.map((q) => (
                    <button
                      key={q}
                      onClick={() => void send(q)}
                      className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-left text-sm text-teal-800 transition-colors hover:bg-teal-100"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                    m.role === "user" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-800",
                  )}
                >
                  {m.content}
                </div>
                <span className="mt-1 px-1 text-[11px] text-slate-400">{time(m.createdAt)}</span>
              </div>
            ))}

            {sending && (
              <div className="flex items-start">
                <div className="rounded-2xl bg-slate-200 px-4 py-2.5 text-sm italic text-slate-500">Kirjutab...</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input footer */}
        <footer className="border-t border-slate-200 bg-white p-3 sm:p-4">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm focus-within:ring-2 focus-within:ring-teal-500">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                placeholder="Kirjuta oma küsimus..."
                className="max-h-40 w-full resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-slate-400"
                onChange={(e) => {
                  setInput(e.target.value);
                  resizeTextarea();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
              />
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0]?.name ?? null)}
                />
                <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                  <Paperclip className="h-4 w-4" /> Lisa fail
                </Button>
                {file && (
                  <span className="flex min-w-0 items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    <span className="max-w-[10rem] truncate">{file}</span>
                    <button
                      aria-label="Eemalda fail"
                      onClick={() => {
                        setFile(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                <div className="ml-auto flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => void clearChat()} disabled={sending || messages.length === 0}>
                    Tühjenda vestlus
                  </Button>
                  <Button size="sm" onClick={() => void send(input)} disabled={sending || !input.trim() || !active}>
                    <Send className="h-4 w-4" /> Saada
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </main>

      <PromptsDialog
        open={promptsOpen}
        onOpenChange={setPromptsOpen}
        prompts={prompts}
        onChanged={loadPrompts}
        onError={setError}
      />
    </div>
  );
}
