import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  findSentMessageInThread,
  findSentMessageToRecipient,
  listGmailDraftIds,
} from "./gmail.server";

export type DraftSyncResult = {
  checked: number;
  sent: number;
  stillDraft: number;
  removed: number;
};

type DraftRow = {
  id: string;
  subject: string;
  body: string;
  contact_id: string | null;
  gmail_draft_id: string | null;
  gmail_thread_id: string | null;
  created_at: string;
  status: string;
  contacts: { email: string | null } | null;
};

/**
 * Kijkt voor elk concept dat in de mailbox staat of het inmiddels verstuurd is,
 * nog als concept klaarstaat, of door de gebruiker weggegooid is.
 *
 * Concepten die eerder onterecht als weggegooid zijn gemarkeerd worden opnieuw
 * gecontroleerd: Superhuman verstuurt buiten het oorspronkelijke gesprek, dus
 * de eerste controle op gesprek-niveau kon dat niet zien.
 */
export async function syncDraftStatuses(userId: string): Promise<DraftSyncResult> {
  const since = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const { data: drafts } = await supabaseAdmin
    .from("email_drafts")
    .select(
      "id, subject, body, contact_id, gmail_draft_id, gmail_thread_id, created_at, status, contacts(email)",
    )
    .eq("user_id", userId)
    .in("status", ["created", "deleted"])
    .not("gmail_draft_id", "is", null)
    .gte("created_at", since)
    .limit(100);

  const list = (drafts ?? []) as unknown as DraftRow[];
  if (list.length === 0) return { checked: 0, sent: 0, stillDraft: 0, removed: 0 };

  const openDraftIds = await listGmailDraftIds();
  let sent = 0;
  let stillDraft = 0;
  let removed = 0;
  const now = new Date().toISOString();

  for (const draft of list) {
    if (draft.gmail_draft_id && openDraftIds.has(draft.gmail_draft_id)) {
      stillDraft += 1;
      await supabaseAdmin
        .from("email_drafts")
        .update({ status: "created", checked_at: now } as never)
        .eq("id", draft.id);
      continue;
    }

    const createdMs = new Date(draft.created_at).getTime();
    let sentAt: string | null = null;

    if (draft.gmail_thread_id) {
      try {
        const message = await findSentMessageInThread(draft.gmail_thread_id, createdMs);
        if (message) sentAt = new Date(Number(message.internalDate ?? Date.now())).toISOString();
      } catch {
        sentAt = null;
      }
    }

    // Superhuman verstuurt vaak als nieuw gesprek: dan is zoeken op ontvanger
    // de enige manier om te zien dat de mail echt de deur uit is.
    if (!sentAt && draft.contacts?.email) {
      try {
        const message = await findSentMessageToRecipient(draft.contacts.email, createdMs);
        if (message) sentAt = new Date(Number(message.internalDate ?? Date.now())).toISOString();
      } catch {
        sentAt = null;
      }
    }

    if (sentAt) {
      sent += 1;
      await supabaseAdmin
        .from("email_drafts")
        .update({ status: "sent", sent_at: sentAt, checked_at: now, error: null } as never)
        .eq("id", draft.id);

      await supabaseAdmin.from("timeline_events").insert({
        user_id: userId,
        contact_id: draft.contact_id,
        kind: "email_out",
        title: `Verstuurd: ${draft.subject}`,
        body: draft.body,
        source: "gmail",
        source_ref: `draft:${draft.id}`,
        occurred_at: sentAt,
      } as never);

      if (draft.contact_id) {
        await supabaseAdmin
          .from("contacts")
          .update({ last_contact_at: sentAt } as never)
          .eq("id", draft.contact_id)
          .or(`last_contact_at.is.null,last_contact_at.lt.${sentAt}`);
      }
    } else if (draft.status !== "deleted") {
      removed += 1;
      await supabaseAdmin
        .from("email_drafts")
        .update({ status: "deleted", checked_at: now } as never)
        .eq("id", draft.id);
    } else {
      await supabaseAdmin
        .from("email_drafts")
        .update({ checked_at: now } as never)
        .eq("id", draft.id);
    }
  }

  return { checked: list.length, sent, stillDraft, removed };
}
