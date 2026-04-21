export type ConversationEntry = {
  from: "user" | "admin";
  body: string;
  at: string;
};

export function parseConversation(raw: unknown): ConversationEntry[] {
  if (!raw || !Array.isArray(raw)) {
    return [];
  }
  const out: ConversationEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const rec = item as Record<string, unknown>;
    const from = rec.from === "user" || rec.from === "admin" ? rec.from : null;
    const body = typeof rec.body === "string" ? rec.body.trim() : "";
    const at = typeof rec.at === "string" ? rec.at : "";
    if (!from || !body || !at) {
      continue;
    }
    out.push({ from, body, at });
  }
  return out;
}

export function appendConversation(
  existing: unknown,
  entry: ConversationEntry,
): ConversationEntry[] {
  return [...parseConversation(existing), entry];
}
