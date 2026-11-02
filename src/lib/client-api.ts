export interface Chat {
  id: string;
  title: string;
  model: string;
  temperature: number;
  topP: number;
  promptId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface Prompt {
  id: string;
  name: string;
  content: string;
}

export const MODELS = [
  { value: "gpt-4", label: "GPT-4" },
  { value: "claude", label: "Claude" },
  { value: "local-llama", label: "Local Llama" },
];

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new Error("Serveriga ei õnnestunud ühendust luua. Kontrolli internetiühendust.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Midagi läks valesti. Palun proovi uuesti.");
  return data as T;
}
