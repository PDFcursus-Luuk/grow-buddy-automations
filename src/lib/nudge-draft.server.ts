import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { stageLabel } from "./crm";

const nudgeSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

export type NudgeResult = { subject: string; draftId: string };
export type NudgeContent = { subject: string; body: string; tokensIn: number; tokensOut: number };

export type ComposeOptions = {
  /** Wat deze mail moet bereiken. Leeg = standaard "stil contact weer warm maken". */
  goal?: string | null;
  /** Hint voor de onderwerpregel, bv. uit een campagnestap. */
  subjectHint?: string | null;
  /** Extra regel context, bv. "Campagne: Vervolgtraining, stap 2 van 4". */
  contextNote?: string | null;
};

/**
 * Schrijft onderwerp + tekst voor een opvolgmail, maar slaat niets op.
 * Gedeeld door de handmatige knop, de stiltebewaking en de campagnemotor,
 * zodat alle drie dezelfde tone-of-voice en anti-verzinsel-regels volgen.
 */
export async function composeNudge(
  userId: string,
  contactId: string,
  options: ComposeOptions = {},
): Promise<NudgeContent> {
  const lovableApiKey = process.env["LOVABLE_API_KEY"];
  if (!lovableApiKey) throw new Error("Ontbrekende configuratie: LOVABLE_API_KEY");

  const { data: contact, error: contactError } = await supabaseAdmin
    .from("contacts")
    .select("id, full_name, email, stage, ai_summary, next_step, last_contact_at, notes")
    .eq("id", contactId)
    .eq("user_id", userId)
    .maybeSingle();
  if (contactError) throw contactError;
  if (!contact) throw new Error("Contact niet gevonden");
  if (!contact.email) throw new Error("Dit contact heeft geen e-mailadres");

  const { data: settings } = await supabaseAdmin
    .from("crm_settings")
    .select("tone_of_voice, signature, business_context, ai_model")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();
  const owner =
    [profile?.full_name, profile?.email].filter(Boolean).join(", ") ||
    "de eigenaar van deze mailbox";

  const { data: events } = await supabaseAdmin
    .from("timeline_events")
    .select("kind, title, body, occurred_at")
    .eq("user_id", userId)
    .eq("contact_id", contactId)
    .in("kind", ["email_in", "email_out", "note", "meeting"])
    .order("occurred_at", { ascending: false })
    .limit(5);

  const transcript = (events ?? [])
    .slice()
    .reverse()
    .map(
      (e) =>
        `[${String(e.occurred_at).slice(0, 10)}] ${
          e.kind === "email_in" ? "Van hen" : e.kind === "email_out" ? "Van mij" : "Notitie"
        }: ${e.title}\n${(e.body ?? "").slice(0, 1000)}`,
    )
    .join("\n\n");

  const silentDays = contact.last_contact_at
    ? Math.floor((Date.now() - new Date(contact.last_contact_at).getTime()) / 86_400_000)
    : null;

  const goal =
    options.goal?.trim() ||
    "Dit contact is stil gevallen. Maak het weer warm en zet een concrete vervolgstap in gang.";

  const prompt = [
    `Je werkt als assistent VOOR mij (${owner}). Ik ben de trainer/verkoper; het contact is de klant.`,
    settings?.business_context ? `Bedrijfscontext: ${settings.business_context}` : "",
    `Contact: ${contact.full_name} (${contact.email})`,
    `Huidige fase: ${stageLabel(contact.stage)}`,
    options.contextNote ? options.contextNote : "",
    contact.ai_summary ? `Samenvatting dossier: ${contact.ai_summary}` : "",
    contact.next_step ? `Openstaande volgende stap: ${contact.next_step}` : "",
    silentDays !== null
      ? `Er is al ${silentDays} dagen geen contact geweest.`
      : "Er is nog nooit contact geweest.",
    settings?.tone_of_voice ? `Tone-of-voice: ${settings.tone_of_voice}` : "",
    settings?.signature ? `Ondertekening: ${settings.signature}` : "",
    "",
    transcript
      ? `Laatste correspondentie:\n${transcript}`
      : "Er is geen eerdere correspondentie vastgelegd.",
    "",
    `Doel van deze mail: ${goal}`,
    "",
    "Schrijf een korte, vriendelijke mail in het Nederlands.",
    `- De mail is van MIJ (${owner}) AAN ${contact.full_name}. Begin met een aanhef aan het contact.`,
    "- Verzin NOOIT feiten, bedragen, data of toezeggingen die niet in de context hierboven staan.",
    "- Maximaal 130 woorden, één concrete vraag of vervolgstap aan het eind.",
    options.subjectHint
      ? `- Onderwerpregel in de richting van: "${options.subjectHint}".`
      : "- Geef een korte, concrete subject-regel.",
  ]
    .filter(Boolean)
    .join("\n");

  const model = (settings?.ai_model ?? "").startsWith("google/")
    ? (settings!.ai_model as string)
    : "google/gemini-3.1-flash-lite";
  const gateway = createLovableAiGatewayProvider(lovableApiKey, undefined, {
    structuredOutputs: true,
  });

  try {
    const result = await generateText({
      model: gateway(model),
      output: Output.object({ schema: nudgeSchema }),
      prompt,
    });
    return {
      subject: result.output.subject,
      body: result.output.body,
      tokensIn: result.usage?.inputTokens ?? 0,
      tokensOut: result.usage?.outputTokens ?? 0,
    };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      throw new Error("De AI gaf geen geldig concept terug, probeer opnieuw");
    }
    throw error;
  }
}

/** Handmatige knop op de contactpagina: schrijft het concept en zet het meteen klaar. */
export async function generateNudgeDraftForContact(
  userId: string,
  contactId: string,
): Promise<NudgeResult> {
  const { data: existing } = await supabaseAdmin
    .from("email_drafts")
    .select("id")
    .eq("user_id", userId)
    .eq("contact_id", contactId)
    .in("status", ["pending", "created"])
    .limit(1)
    .maybeSingle();
  if (existing) throw new Error("Er staat al een concept klaar voor dit contact");

  const out = await composeNudge(userId, contactId);

  const { data: draft, error: draftError } = await supabaseAdmin
    .from("email_drafts")
    .insert({
      user_id: userId,
      contact_id: contactId,
      subject: out.subject,
      body: out.body,
    } as never)
    .select("id")
    .single();
  if (draftError) throw draftError;

  await supabaseAdmin
    .from("contacts")
    .update({ last_nudge_at: new Date().toISOString() } as never)
    .eq("id", contactId);

  return { subject: out.subject, draftId: draft.id as string };
}
