import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { findFolderId, listNoteFilesSince, readNoteText } from "./drive.server";
import {
  getMessage,
  getMyAddress,
  header,
  isDraftMessage,
  isNoiseSender,
  listMessageIdsSince,
  messageText,
  parseAddress,
} from "./gmail.server";

import { STAGES } from "./crm";

export type RunResult = {
  runId: string;
  emails: number;
  notes: number;
  analyzed: number;
  suggestions: number;
  skippedReason?: string;
};

type SettingsRow = {
  user_id: string;
  drive_folder_id: string | null;
  drive_folder_name: string | null;
  silence_days: number;
  tone_of_voice: string;
  signature: string | null;
  ai_model: string;
  monthly_token_cap: number;
  business_context: string;
  ignore_patterns: string[] | null;
};

type ContactRow = {
  id: string;
  full_name: string;
  email: string | null;
  stage: string;
  track: string;
  is_internal: boolean;
  ai_summary: string | null;
  next_step: string | null;
  last_contact_at: string | null;
};

const analysisSchema = z.object({
  summary: z.string(),
  stage_suggestion: z.enum([...STAGES] as [string, ...string[]]).nullable(),
  stage_reason: z.string().nullable(),
  confidence: z.number().nullable(),
  next_action: z.string().nullable(),
  next_action_due_days: z.number().nullable(),
  draft_needed: z.boolean(),
  draft_subject: z.string().nullable(),
  draft_body: z.string().nullable(),
});

function isIgnored(email: string | null | undefined, patterns: string[]): boolean {
  if (!email) return false;
  const value = email.toLowerCase();
  return patterns.some((raw) => {
    const pattern = raw.trim().toLowerCase();
    if (!pattern) return false;
    return value === pattern || value.endsWith(`@${pattern}`) || value.includes(pattern);
  });
}

function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

async function loadSettings(userId: string): Promise<SettingsRow> {
  const { data } = await supabaseAdmin
    .from("crm_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) return data as unknown as SettingsRow;
  const { data: created, error } = await supabaseAdmin
    .from("crm_settings")
    .insert({ user_id: userId } as never)
    .select("*")
    .single();
  if (error) throw error;
  return created as unknown as SettingsRow;
}

async function getCursor(userId: string, source: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("sync_state")
    .select("cursor_value")
    .eq("user_id", userId)
    .eq("source", source)
    .maybeSingle();
  return data?.cursor_value ?? null;
}

async function setCursor(userId: string, source: string, value: string): Promise<void> {
  await supabaseAdmin.from("sync_state").upsert(
    {
      user_id: userId,
      source,
      cursor_value: value,
      last_run_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "user_id,source" },
  );
}

async function knownRefs(userId: string, refs: string[]): Promise<Set<string>> {
  if (refs.length === 0) return new Set();
  const { data } = await supabaseAdmin
    .from("timeline_events")
    .select("source_ref")
    .eq("user_id", userId)
    .in("source_ref", refs);
  return new Set((data ?? []).map((row) => row.source_ref as string));
}

async function findOrCreateContact(
  userId: string,
  contacts: ContactRow[],
  person: { name: string; email: string },
): Promise<ContactRow> {
  const existing = contacts.find((c) => c.email?.toLowerCase() === person.email);
  if (existing) return existing;
  const { data, error } = await supabaseAdmin
    .from("contacts")
    .insert({
      user_id: userId,
      full_name: person.name,
      email: person.email,
      stage: "new_lead",
      source: "gmail",
    } as never)
    .select("id, full_name, email, stage, track, is_internal, ai_summary, next_step, last_contact_at")
    .single();
  if (error) throw error;
  const created = data as unknown as ContactRow;
  contacts.push(created);
  return created;
}

async function syncGmail(
  userId: string,
  contacts: ContactRow[],
  ignorePatterns: string[],
): Promise<number> {
  const cursor = await getCursor(userId, "gmail");
  const after = cursor ? Number(cursor) : Math.floor((Date.now() - 14 * 86_400_000) / 1000);
  const myAddress = await getMyAddress();

  const ids = await listMessageIdsSince(after);
  if (ids.length === 0) return 0;
  const seen = await knownRefs(userId, ids);
  const fresh = ids.filter((id) => !seen.has(id)).slice(0, 60);

  let stored = 0;
  let newest = after;

  for (const id of fresh) {
    const message = await getMessage(id);
    const internal = Math.floor(Number(message.internalDate ?? "0") / 1000);
    if (internal > newest) newest = internal;
    if (isDraftMessage(message)) continue;


    const fromRaw = header(message, "From");
    const toRaw = header(message, "To");
    if (isNoiseSender(fromRaw)) continue;

    const from = parseAddress(fromRaw);
    const to = parseAddress(toRaw);
    if (!from) continue;

    const outbound = from.email === myAddress;
    const counterpart = outbound ? to : from;
    if (!counterpart || counterpart.email === myAddress) continue;
    if (isNoiseSender(counterpart.email)) continue;
    if (isIgnored(counterpart.email, ignorePatterns)) continue;

    const body = messageText(message);
    if (!body && !message.snippet) continue;

    const contact = await findOrCreateContact(userId, contacts, counterpart);
    const occurredAt = new Date(internal * 1000 || Date.now()).toISOString();

    const { error } = await supabaseAdmin.from("timeline_events").insert({
      user_id: userId,
      contact_id: contact.id,
      kind: outbound ? "email_out" : "email_in",
      title: header(message, "Subject") || "(geen onderwerp)",
      body: body || message.snippet || "",
      source: "gmail",
      source_ref: message.id,
      occurred_at: occurredAt,
    } as never);
    if (error) {
      console.error("[run] timeline insert", error.message);
      continue;
    }
    stored += 1;

    const patch: Record<string, unknown> = { last_contact_at: occurredAt };
    if (!outbound) patch["last_inbound_at"] = occurredAt;
    await supabaseAdmin.from("contacts").update(patch as never).eq("id", contact.id);
    contact.last_contact_at = occurredAt;

    // Concepten voor dit contact in de juiste thread laten landen.
    await supabaseAdmin
      .from("email_drafts")
      .update({ gmail_thread_id: message.threadId } as never)
      .eq("user_id", userId)
      .eq("contact_id", contact.id)
      .is("gmail_thread_id", null)
      .eq("status", "pending");
  }

  await setCursor(userId, "gmail", String(newest + 1));
  return stored;
}

async function syncDrive(
  userId: string,
  settings: SettingsRow,
  contacts: ContactRow[],
): Promise<number> {
  let folderId = settings.drive_folder_id;
  if (!folderId && settings.drive_folder_name) {
    folderId = await findFolderId(settings.drive_folder_name);
    if (folderId) {
      await supabaseAdmin
        .from("crm_settings")
        .update({ drive_folder_id: folderId } as never)
        .eq("user_id", userId);
    }
  }
  if (!folderId) return 0;

  const cursor = await getCursor(userId, "drive");
  const files = await listNoteFilesSince(folderId, cursor);
  if (files.length === 0) return 0;

  const refs = files.map((f) => `${f.id}:${f.version ?? f.modifiedTime}`);
  const seen = await knownRefs(userId, refs);

  let stored = 0;
  let newest = cursor;

  for (const file of files) {
    const ref = `${file.id}:${file.version ?? file.modifiedTime}`;
    if (!newest || file.modifiedTime > newest) newest = file.modifiedTime;
    if (seen.has(ref)) continue;

    const text = await readNoteText(file);
    if (!text) continue;

    const haystack = `${file.name}\n${text}`.toLowerCase();
    const match = matchContactInText(haystack, contacts);


    const { error } = await supabaseAdmin.from("timeline_events").insert({
      user_id: userId,
      contact_id: match?.id ?? null,
      kind: "note",
      title: file.name,
      body: text,
      source: "drive",
      source_ref: ref,
      occurred_at: file.modifiedTime,
    } as never);
    if (error) {
      console.error("[run] drive insert", error.message);
      continue;
    }
    stored += 1;
  }

  if (newest) await setCursor(userId, "drive", newest);
  return stored;
}

async function tokensUsedThisMonth(userId: string): Promise<number> {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const { data } = await supabaseAdmin
    .from("run_logs")
    .select("tokens_in, tokens_out")
    .eq("user_id", userId)
    .gte("started_at", start.toISOString());
  return (data ?? []).reduce((sum, r) => sum + (r.tokens_in ?? 0) + (r.tokens_out ?? 0), 0);
}

function pickModel(configured: string): string {
  return configured.startsWith("google/") ? configured : "google/gemini-3.1-flash-lite";
}

async function analyseContacts(
  userId: string,
  settings: SettingsRow,
  contacts: ContactRow[],
): Promise<{ analyzed: number; suggestions: number; tokensIn: number; tokensOut: number }> {
  const lovableApiKey = process.env["LOVABLE_API_KEY"];
  if (!lovableApiKey) throw new Error("Ontbrekende configuratie: LOVABLE_API_KEY");

  const { data: pending } = await supabaseAdmin
    .from("timeline_events")
    .select("id, contact_id, kind, title, body, occurred_at")
    .eq("user_id", userId)
    .is("processed_at", null)
    .not("contact_id", "is", null)
    .in("kind", ["email_in", "email_out", "note"])
    .order("occurred_at", { ascending: true })
    .limit(120);

  const grouped = new Map<string, typeof pending extends null ? never : NonNullable<typeof pending>>();
  for (const event of pending ?? []) {
    const key = event.contact_id as string;
    const list = grouped.get(key) ?? [];
    list.push(event);
    grouped.set(key, list);
  }
  if (grouped.size === 0) return { analyzed: 0, suggestions: 0, tokensIn: 0, tokensOut: 0 };

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();
  const owner = [profile?.full_name, profile?.email].filter(Boolean).join(", ") || "de eigenaar van deze mailbox";

  const gateway = createLovableAiGatewayProvider(lovableApiKey, undefined, { structuredOutputs: true });
  const model = gateway(pickModel(settings.ai_model));


  let analyzed = 0;
  let suggestions = 0;
  let tokensIn = 0;
  let tokensOut = 0;

  for (const [contactId, events] of Array.from(grouped.entries()).slice(0, 20)) {
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) continue;
    if (contact.is_internal || contact.track !== "cursus") {
      await supabaseAdmin
        .from("timeline_events")
        .update({ processed_at: new Date().toISOString() } as never)
        .in(
          "id",
          events.map((e) => e.id as string),
        );
      continue;
    }

    const transcript = events
      .slice(-6)
      .map(
        (e) =>
          `[${e.occurred_at.slice(0, 10)}] ${e.kind === "email_in" ? "Van hen" : e.kind === "email_out" ? "Van mij" : "Notitie"}: ${e.title}\n${(e.body ?? "").slice(0, 1200)}`,
      )
      .join("\n\n");

    const prompt = [
      `Je werkt als assistent VOOR mij (${owner}). Ik ben de trainer/verkoper; het contact is de klant.`,
      `Bedrijfscontext: ${settings.business_context}`,
      `Pipelinefases (in volgorde): ${STAGES.join(", ")}`,
      `Contact: ${contact.full_name} (${contact.email ?? "geen e-mail"})`,
      `Huidige fase: ${contact.stage}`,
      `Bestaande samenvatting: ${contact.ai_summary ?? "geen"}`,
      `Tone-of-voice voor concepten: ${settings.tone_of_voice}`,
      settings.signature ? `Ondertekening: ${settings.signature}` : "",
      "",
      "Nieuwe correspondentie en notities:",
      transcript,
      "",
      "Beoordeel dit. Antwoord in het Nederlands. Houd de samenvatting onder 60 woorden.",
      "Stel alleen een fase voor als de correspondentie dat duidelijk onderbouwt, anders null.",
      "Regels voor het concept (draft_needed):",
      `- Het concept wordt door MIJ (${owner}) geschreven en is gericht AAN ${contact.full_name}. Nooit andersom: schrijf nooit een mail alsof het contact mij antwoordt, en adresseer het concept nooit aan mij.`,
      "- Begin met een aanhef aan het contact, niet met 'Beste Luuk'.",
      "- Verzin NOOIT feiten, bedragen, data, toezeggingen of gebeurtenissen die niet letterlijk in de correspondentie of notities hierboven staan. Bij twijfel: stel een korte vraag in plaats van een aanname.",
      "- Zet draft_needed=false als een reactie van mij niet logisch is of als je te weinig informatie hebt.",
      "- Houd het concept onder 150 woorden en volg de tone-of-voice.",
    ]
      .filter(Boolean)
      .join("\n");


    try {
      const result = await generateText({
        model,
        output: Output.object({ schema: analysisSchema }),
        prompt,
      });
      const out = result.output;
      tokensIn += result.usage?.inputTokens ?? 0;
      tokensOut += result.usage?.outputTokens ?? 0;
      analyzed += 1;

      await supabaseAdmin
        .from("contacts")
        .update({ ai_summary: out.summary } as never)
        .eq("id", contact.id);

      const rows: Record<string, unknown>[] = [];
      if (out.stage_suggestion && out.stage_suggestion !== contact.stage) {
        rows.push({
          user_id: userId,
          contact_id: contact.id,
          type: "stage_change",
          from_stage: contact.stage,
          to_stage: out.stage_suggestion,
          reason: out.stage_reason ?? out.summary,
          confidence: out.confidence,
          source_summary: out.summary,
        });
      }
      if (out.next_action) {
        rows.push({
          user_id: userId,
          contact_id: contact.id,
          type: "follow_up",
          reason: out.stage_reason ?? out.summary,
          proposed_action: out.next_action,
          proposed_due_date: isoDaysFromNow(out.next_action_due_days ?? 3),
          confidence: out.confidence,
          source_summary: out.summary,
        });
      }
      if (out.draft_needed && out.draft_subject && out.draft_body) {
        rows.push({
          user_id: userId,
          contact_id: contact.id,
          type: "draft",
          reason: out.stage_reason ?? out.summary,
          draft_subject: out.draft_subject,
          draft_body: out.draft_body,
          confidence: out.confidence,
          source_summary: out.summary,
        });
      }
      if (rows.length > 0) {
        const { error } = await supabaseAdmin.from("suggestions").insert(rows as never);
        if (error) console.error("[run] suggestion insert", error.message);
        else suggestions += rows.length;
      }
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        console.error(
          "[run] model gaf geen geldig antwoord voor",
          contact.id,
          "text:",
          error.text?.slice(0, 300),
          "msg:",
          error.message?.slice(0, 300),
          "cause:",
          String(error.cause).slice(0, 400),
        );
      } else {
        throw error;
      }
    } finally {
      await supabaseAdmin
        .from("timeline_events")
        .update({ processed_at: new Date().toISOString() } as never)
        .in(
          "id",
          events.map((e) => e.id as string),
        );
    }
  }

  return { analyzed, suggestions, tokensIn, tokensOut };
}

export async function runAssistantForUser(userId: string, trigger: string): Promise<RunResult> {
  const { data: log, error: logError } = await supabaseAdmin
    .from("run_logs")
    .insert({ user_id: userId, trigger, status: "running" } as never)
    .select("id")
    .single();
  if (logError) throw logError;
  const runId = log.id as string;

  try {
    const settings = await loadSettings(userId);
    const { data: contactRows } = await supabaseAdmin
      .from("contacts")
      .select("id, full_name, email, stage, track, is_internal, ai_summary, next_step, last_contact_at")
      .eq("user_id", userId)
      .eq("is_archived", false);
    const contacts = (contactRows ?? []) as unknown as ContactRow[];

    const ignorePatterns = settings.ignore_patterns ?? [];
    const emails = await syncGmail(userId, contacts, ignorePatterns);
    const notes = await syncDrive(userId, settings, contacts);

    const used = await tokensUsedThisMonth(userId);
    let analysis = { analyzed: 0, suggestions: 0, tokensIn: 0, tokensOut: 0 };
    let skippedReason: string | undefined;
    if (used >= settings.monthly_token_cap) {
      skippedReason = "Maandelijks tokenplafond bereikt — alleen mail en notities zijn opgehaald.";
    } else {
      analysis = await analyseContacts(userId, settings, contacts);
    }

    await supabaseAdmin
      .from("run_logs")
      .update({
        status: "done",
        emails_seen: emails,
        notes_seen: notes,
        contacts_analyzed: analysis.analyzed,
        suggestions_created: analysis.suggestions,
        tokens_in: analysis.tokensIn,
        tokens_out: analysis.tokensOut,
        error: skippedReason ?? null,
        finished_at: new Date().toISOString(),
      } as never)
      .eq("id", runId);

    return {
      runId,
      emails,
      notes,
      analyzed: analysis.analyzed,
      suggestions: analysis.suggestions,
      ...(skippedReason ? { skippedReason } : {}),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabaseAdmin
      .from("run_logs")
      .update({ status: "error", error: message, finished_at: new Date().toISOString() } as never)
      .eq("id", runId);
    throw error;
  }
}
