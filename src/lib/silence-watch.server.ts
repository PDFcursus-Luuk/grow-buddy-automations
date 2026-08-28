import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { composeNudge } from "./nudge-draft.server";

export type SilenceResult = {
  checked: number;
  nudged: number;
  cooled: number;
  tokensIn: number;
  tokensOut: number;
};

/** Hoeveel stille contacten er per run maximaal een concept krijgen. */
const MAX_NUDGES_PER_RUN = 5;

/** Fases waarin stilte geen probleem is: daar is bewust geen opvolging meer. */
const IGNORED_STAGES = new Set(["cold", "lost"]);

type SilentContact = {
  id: string;
  full_name: string;
  email: string | null;
  stage: string;
  last_contact_at: string | null;
  last_nudge_at: string | null;
  created_at: string;
};

function daysSince(value: string | null): number | null {
  if (!value) return null;
  return Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
}

/**
 * Zoekt contacten die te lang stil zijn en zet daar een voorstel voor klaar.
 *
 * Dit is bewust onderdeel van de cron-run: zonder dit gebeurt er niets zolang
 * een contact zelf niet mailt, en verdwijnt een lead stilletjes uit beeld.
 * Er wordt niets verstuurd en niets automatisch gewijzigd -- alles landt als
 * voorstel dat je zelf goedkeurt.
 */
export async function watchSilentContacts(
  userId: string,
  silenceDays: number,
): Promise<SilenceResult> {
  const empty: SilenceResult = { checked: 0, nudged: 0, cooled: 0, tokensIn: 0, tokensOut: 0 };

  const { data: rows } = await supabaseAdmin
    .from("contacts")
    .select("id, full_name, email, stage, last_contact_at, last_nudge_at, created_at")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .eq("is_internal", false)
    .eq("track", "cursus")
    .not("email", "is", null);

  const contacts = (rows ?? []) as unknown as SilentContact[];
  if (contacts.length === 0) return empty;

  // Contacten die al een openstaand voorstel of concept hebben, slaan we over:
  // anders stapelen dezelfde herinneringen zich op.
  const { data: pendingSuggestions } = await supabaseAdmin
    .from("suggestions")
    .select("contact_id")
    .eq("user_id", userId)
    .eq("status", "pending");
  const { data: openDrafts } = await supabaseAdmin
    .from("email_drafts")
    .select("contact_id")
    .eq("user_id", userId)
    .in("status", ["pending", "created"]);

  const busy = new Set<string>();
  for (const row of pendingSuggestions ?? [])
    if (row.contact_id) busy.add(row.contact_id as string);
  for (const row of openDrafts ?? []) if (row.contact_id) busy.add(row.contact_id as string);

  const silent = contacts
    .filter((c) => !IGNORED_STAGES.has(c.stage))
    .filter((c) => !busy.has(c.id))
    .map((c) => ({ contact: c, days: daysSince(c.last_contact_at ?? c.created_at) ?? 0 }))
    .filter(({ contact, days }) => {
      if (days < silenceDays) return false;
      // Niet opnieuw porren binnen dezelfde stiltetermijn.
      const sinceNudge = daysSince(contact.last_nudge_at);
      return sinceNudge === null || sinceNudge >= silenceDays;
    })
    .sort((a, b) => b.days - a.days);

  let nudged = 0;
  let cooled = 0;
  let tokensIn = 0;
  let tokensOut = 0;

  for (const { contact, days } of silent.slice(0, MAX_NUDGES_PER_RUN)) {
    // Heel lang stil en nog steeds geen beweging: voorstellen om af te koelen
    // in plaats van eindeloos blijven mailen.
    if (days >= silenceDays * 3) {
      const { error } = await supabaseAdmin.from("suggestions").insert({
        user_id: userId,
        contact_id: contact.id,
        type: "stage_change",
        from_stage: contact.stage,
        to_stage: "cold",
        reason: `Al ${days} dagen geen contact, ondanks eerdere opvolging. Voorstel: op koud zetten zodat je lijst schoon blijft.`,
        confidence: 0.6,
        source_summary: `Stil sinds ${String(contact.last_contact_at ?? contact.created_at).slice(0, 10)}.`,
      } as never);
      if (!error) cooled += 1;
      await supabaseAdmin
        .from("contacts")
        .update({ last_nudge_at: new Date().toISOString() } as never)
        .eq("id", contact.id);
      continue;
    }

    try {
      const out = await composeNudge(userId, contact.id, {
        contextNote: `Dit contact is al ${days} dagen stil. Doel is de relatie warm houden, niet pushen.`,
      });
      tokensIn += out.tokensIn;
      tokensOut += out.tokensOut;

      const { error } = await supabaseAdmin.from("suggestions").insert({
        user_id: userId,
        contact_id: contact.id,
        type: "draft",
        reason: `Al ${days} dagen geen contact. Concept om het gesprek weer op gang te brengen.`,
        draft_subject: out.subject,
        draft_body: out.body,
        confidence: 0.7,
        source_summary: `Stil sinds ${String(contact.last_contact_at ?? contact.created_at).slice(0, 10)}.`,
      } as never);
      if (error) {
        console.error("[silence] suggestion insert", error.message);
        continue;
      }

      await supabaseAdmin
        .from("contacts")
        .update({ last_nudge_at: new Date().toISOString() } as never)
        .eq("id", contact.id);
      nudged += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[silence] concept mislukt voor ${contact.id}: ${message}`);
    }
  }

  return { checked: silent.length, nudged, cooled, tokensIn, tokensOut };
}
