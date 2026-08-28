import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Stage } from "./crm";
import { composeNudge } from "./nudge-draft.server";

export type CampaignResult = {
  enrolled: number;
  stepsSent: number;
  completed: number;
  tokensIn: number;
  tokensOut: number;
};

/** Hoeveel campagnestappen er per run maximaal verwerkt worden. */
const MAX_STEPS_PER_RUN = 8;

/** In deze fases loopt geen campagne: daar is geen relatie meer om te onderhouden. */
const BLOCKED_STAGES = new Set(["lost"]);

type CampaignRow = {
  id: string;
  name: string;
  goal: string | null;
  trigger_stage: Stage | null;
  stop_on_reply: boolean;
  is_active: boolean;
};

type StepRow = {
  id: string;
  campaign_id: string;
  step_order: number;
  delay_days: number;
  subject_hint: string | null;
  content_goal: string;
};

type EnrollmentRow = {
  id: string;
  campaign_id: string;
  contact_id: string;
  current_step: number;
  next_action_at: string | null;
};

function inDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

/**
 * Schrijft contacten automatisch in zodra ze in de triggerfase van een actieve
 * campagne staan. Zo start de vervolgtraining-reeks vanzelf als een lead klant wordt.
 */
async function autoEnroll(
  userId: string,
  campaigns: CampaignRow[],
  steps: StepRow[],
): Promise<number> {
  const triggered = campaigns.filter((c) => c.trigger_stage);
  if (triggered.length === 0) return 0;

  const { data: existing } = await supabaseAdmin
    .from("campaign_enrollments")
    .select("campaign_id, contact_id")
    .eq("user_id", userId);
  const already = new Set(
    (existing ?? []).map((row) => `${row.campaign_id as string}:${row.contact_id as string}`),
  );

  let enrolled = 0;

  for (const campaign of triggered) {
    const first = steps
      .filter((s) => s.campaign_id === campaign.id)
      .sort((a, b) => a.step_order - b.step_order)[0];
    if (!first) continue; // Campagne zonder stappen doet niets.

    const { data: candidates } = await supabaseAdmin
      .from("contacts")
      .select("id")
      .eq("user_id", userId)
      .eq("stage", campaign.trigger_stage!)
      .eq("is_archived", false)
      .eq("is_internal", false)
      .eq("track", "cursus")
      .not("email", "is", null);

    for (const candidate of candidates ?? []) {
      const contactId = candidate.id as string;
      if (already.has(`${campaign.id}:${contactId}`)) continue;

      const { error } = await supabaseAdmin.from("campaign_enrollments").insert({
        user_id: userId,
        campaign_id: campaign.id,
        contact_id: contactId,
        current_step: 0,
        next_action_at: inDays(first.delay_days),
      } as never);
      if (error) {
        console.error("[campaign] enroll", error.message);
        continue;
      }
      already.add(`${campaign.id}:${contactId}`);
      enrolled += 1;
    }
  }

  return enrolled;
}

/**
 * Verwerkt enrollments die aan de beurt zijn: schrijft het concept voor de
 * volgende stap en zet de enrollment door. Er wordt niets verstuurd -- elk
 * concept komt als voorstel op je scherm.
 */
async function processDueEnrollments(
  userId: string,
  campaigns: CampaignRow[],
  steps: StepRow[],
): Promise<{ stepsSent: number; completed: number; tokensIn: number; tokensOut: number }> {
  const { data: due } = await supabaseAdmin
    .from("campaign_enrollments")
    .select("id, campaign_id, contact_id, current_step, next_action_at")
    .eq("user_id", userId)
    .eq("is_paused", false)
    .is("completed_at", null)
    .not("next_action_at", "is", null)
    .lte("next_action_at", new Date().toISOString())
    .order("next_action_at", { ascending: true })
    .limit(MAX_STEPS_PER_RUN);

  const enrollments = (due ?? []) as unknown as EnrollmentRow[];
  if (enrollments.length === 0) {
    return { stepsSent: 0, completed: 0, tokensIn: 0, tokensOut: 0 };
  }

  let stepsSent = 0;
  let completed = 0;
  let tokensIn = 0;
  let tokensOut = 0;

  for (const enrollment of enrollments) {
    const campaign = campaigns.find((c) => c.id === enrollment.campaign_id);
    if (!campaign) continue;

    const ordered = steps
      .filter((s) => s.campaign_id === campaign.id)
      .sort((a, b) => a.step_order - b.step_order);

    const nextStep = ordered.find((s) => s.step_order > enrollment.current_step);
    if (!nextStep) {
      await supabaseAdmin
        .from("campaign_enrollments")
        .update({ completed_at: new Date().toISOString(), next_action_at: null } as never)
        .eq("id", enrollment.id);
      completed += 1;
      continue;
    }

    const { data: contact } = await supabaseAdmin
      .from("contacts")
      .select("id, stage, is_archived, email")
      .eq("id", enrollment.contact_id)
      .maybeSingle();

    // Contact is intussen verloren, gearchiveerd of heeft geen mailadres meer:
    // reeks stilzetten in plaats van doorgaan.
    if (
      !contact ||
      !contact.email ||
      contact.is_archived ||
      BLOCKED_STAGES.has(contact.stage as string)
    ) {
      await supabaseAdmin
        .from("campaign_enrollments")
        .update({ is_paused: true } as never)
        .eq("id", enrollment.id);
      continue;
    }

    try {
      const out = await composeNudge(userId, enrollment.contact_id, {
        goal: nextStep.content_goal,
        subjectHint: nextStep.subject_hint,
        contextNote: `Campagne "${campaign.name}", stap ${nextStep.step_order} van ${ordered.length}.${
          campaign.goal ? ` Doel van de campagne: ${campaign.goal}` : ""
        }`,
      });
      tokensIn += out.tokensIn;
      tokensOut += out.tokensOut;

      const { error } = await supabaseAdmin.from("suggestions").insert({
        user_id: userId,
        contact_id: enrollment.contact_id,
        type: "draft",
        reason: `Campagne "${campaign.name}" — stap ${nextStep.step_order}: ${nextStep.content_goal}`,
        draft_subject: out.subject,
        draft_body: out.body,
        confidence: 0.7,
        source_summary: campaign.goal,
      } as never);
      if (error) {
        console.error("[campaign] suggestion insert", error.message);
        continue;
      }

      const following = ordered.find((s) => s.step_order > nextStep.step_order);
      await supabaseAdmin
        .from("campaign_enrollments")
        .update({
          current_step: nextStep.step_order,
          next_action_at: following ? inDays(following.delay_days) : null,
          completed_at: following ? null : new Date().toISOString(),
        } as never)
        .eq("id", enrollment.id);

      stepsSent += 1;
      if (!following) completed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[campaign] stap mislukt voor enrollment ${enrollment.id}: ${message}`);
      // Een dag uitstellen zodat een tijdelijke storing de reeks niet blokkeert.
      await supabaseAdmin
        .from("campaign_enrollments")
        .update({ next_action_at: inDays(1) } as never)
        .eq("id", enrollment.id);
    }
  }

  return { stepsSent, completed, tokensIn, tokensOut };
}

/** Zet lopende campagnes voor dit contact op pauze, bv. omdat hij zelf mailt. */
export async function pauseEnrollmentsForContact(userId: string, contactId: string): Promise<void> {
  const { data: campaigns } = await supabaseAdmin
    .from("campaigns")
    .select("id")
    .eq("user_id", userId)
    .eq("stop_on_reply", true);
  const ids = (campaigns ?? []).map((c) => c.id as string);
  if (ids.length === 0) return;

  await supabaseAdmin
    .from("campaign_enrollments")
    .update({ is_paused: true } as never)
    .eq("user_id", userId)
    .eq("contact_id", contactId)
    .eq("is_paused", false)
    .is("completed_at", null)
    .in("campaign_id", ids);
}

export async function runCampaignsForUser(userId: string): Promise<CampaignResult> {
  const { data: campaignRows } = await supabaseAdmin
    .from("campaigns")
    .select("id, name, goal, trigger_stage, stop_on_reply, is_active")
    .eq("user_id", userId)
    .eq("is_active", true);

  const campaigns = (campaignRows ?? []) as unknown as CampaignRow[];
  if (campaigns.length === 0) {
    return { enrolled: 0, stepsSent: 0, completed: 0, tokensIn: 0, tokensOut: 0 };
  }

  const { data: stepRows } = await supabaseAdmin
    .from("campaign_steps")
    .select("id, campaign_id, step_order, delay_days, subject_hint, content_goal")
    .eq("user_id", userId)
    .order("step_order");
  const steps = (stepRows ?? []) as unknown as StepRow[];

  const enrolled = await autoEnroll(userId, campaigns, steps);
  const processed = await processDueEnrollments(userId, campaigns, steps);

  return { enrolled, ...processed };
}

/** Handmatig een contact in een campagne zetten, bv. voor een oude klant. */
export async function enrollContact(
  userId: string,
  contactId: string,
  campaignId: string,
): Promise<void> {
  const { data: first } = await supabaseAdmin
    .from("campaign_steps")
    .select("delay_days")
    .eq("user_id", userId)
    .eq("campaign_id", campaignId)
    .order("step_order")
    .limit(1)
    .maybeSingle();
  if (!first) throw new Error("Deze campagne heeft nog geen stappen");

  const { error } = await supabaseAdmin.from("campaign_enrollments").upsert(
    {
      user_id: userId,
      campaign_id: campaignId,
      contact_id: contactId,
      current_step: 0,
      next_action_at: inDays(first.delay_days as number),
      is_paused: false,
      completed_at: null,
    } as never,
    { onConflict: "campaign_id,contact_id" },
  );
  if (error) throw error;
}
