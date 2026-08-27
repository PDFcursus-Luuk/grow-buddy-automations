import { gmailFetch, gmailJson } from "./connector-gateway.server";

export type GmailMessage = {
  id: string;
  threadId: string;
  internalDate?: string;
  labelIds?: string[];
  snippet?: string;
  payload?: GmailPart;
};

type GmailPart = {
  mimeType?: string;
  filename?: string;
  headers?: { name: string; value: string }[];
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
};

const NOISE_PATTERNS = [
  /no-?reply/i,
  /noreply/i,
  /mailer-daemon/i,
  /nieuwsbrief/i,
  /newsletter/i,
  /notifications?@/i,
  /postmaster/i,
  /support@google/i,
  /billing@/i,
];

export function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function header(message: GmailMessage, name: string): string {
  const found = message.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return found?.value ?? "";
}

export function parseAddress(value: string): { name: string; email: string } | null {
  const match = /<([^>]+)>/.exec(value);
  const email = (match?.[1] ?? value).trim().toLowerCase();
  if (!email.includes("@")) return null;
  const name = value.replace(/<[^>]*>/, "").replace(/["']/g, "").trim();
  return { name: name || email.split("@")[0]!, email };
}

export function isNoiseSender(value: string): boolean {
  return NOISE_PATTERNS.some((pattern) => pattern.test(value));
}

function collectText(part: GmailPart | undefined, out: string[]): void {
  if (!part) return;
  if (part.mimeType === "text/plain" && part.body?.data) {
    out.push(decodeBase64Url(part.body.data));
  } else if (part.mimeType === "text/html" && part.body?.data && out.length === 0) {
    out.push(
      decodeBase64Url(part.body.data)
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " "),
    );
  }
  part.parts?.forEach((child) => collectText(child, out));
}

/** Nieuwe tekst uit een bericht, zonder quotes, signatures en disclaimers. */
export function messageText(message: GmailMessage, maxChars = 2500): string {
  const out: string[] = [];
  collectText(message.payload, out);
  const raw = out.join("\n");
  const lines = raw.split(/\r?\n/);
  const kept: string[] = [];
  for (const line of lines) {
    if (/^>/.test(line)) continue;
    if (/^\s*(op .*schreef|on .*wrote|van:|from:|verzonden:|sent:)/i.test(line)) break;
    if (/^-{2,}\s*$/.test(line.trim()) || /^__+$/.test(line.trim())) break;
    if (/(disclaimer|vertrouwelijk|uitschrijven|unsubscribe)/i.test(line)) continue;
    kept.push(line);
  }
  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxChars);
}

export async function getMyAddress(): Promise<string> {
  const profile = await gmailJson<{ emailAddress: string }>("/users/me/profile");
  return profile.emailAddress.toLowerCase();
}

export async function listMessageIdsSince(afterEpochSeconds: number): Promise<string[]> {
  const query = encodeURIComponent(
    `after:${afterEpochSeconds} -in:chats -in:spam -category:promotions -category:social -category:forums`,
  );
  const data = await gmailJson<{ messages?: { id: string }[] }>(
    `/users/me/messages?maxResults=80&q=${query}`,
  );
  return (data.messages ?? []).map((m) => m.id);
}

export async function getMessage(id: string): Promise<GmailMessage> {
  return gmailJson<GmailMessage>(`/users/me/messages/${id}?format=full`);
}

export async function createGmailDraft(input: {
  to: string;
  subject: string;
  body: string;
  threadId?: string | null;
}): Promise<{ id: string; message?: { threadId?: string } }> {
  const mime = [
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "MIME-Version: 1.0",
    "",
    input.body,
  ].join("\r\n");

  const payload: Record<string, unknown> = { message: { raw: encodeBase64Url(mime) } };
  if (input.threadId) {
    (payload["message"] as Record<string, unknown>)["threadId"] = input.threadId;
  }

  const response = await gmailFetch("/users/me/drafts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return (await response.json()) as { id: string; message?: { threadId?: string } };
}
