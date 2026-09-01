import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { findSentMessageInThread, listGmailDraftIds } from "./gmail.server";

export type DraftSyncResult = {
  checked: number;
  sent: number;
  stillDraft: number;
  removed: number;
};

/**
 * Kijkt voor elk concept dat in de mailbox staat of het inmiddels verstuurd is,
 * nog als concept klaarstaat, of door de gebruiker weggegooid is.
 */
export async function syncDraftStatuses(userId: string): Promise<DraftSyncResult> {
  const { data: drafts } = await supabaseAdmin
    .from("email_drafts")
    .select("id, subject, body, contact_id, gmail_draft_id, gmail_thread_id, created_at")
    .eq("user_id", userId)
    .eq("status", "created")
    .not("gmail_draft_id", "is", null)
    .limit(100);

  const list = drafts ?? [];
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
        .update({ checked_at: now } as never)
        .eq("id", draft.id);
      continue;
    }

    let sentAt: string | null = null;
    if (draft.gmail_thread_id) {
      try {
        const message = await findSentMessageInThread(
          draft.gmail_thread_id,
          new Date(draft.created_at).getTime(),
        );
        if (message) {
          sentAt = new Date(Number(message.internalDate ?? Date.now())).toISOString();
        }
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
        occurred_at: sentAt,
      } as never);

      if (draft.contact_id) {
        await supabaseAdmin
          .from("contacts")
          .update({ last_contact_at: sentAt } as never)
          .eq("id", draft.contact_id);
      }
    } else {
      removed += 1;
      await supabaseAdmin
        .from("email_drafts")
        .update({ status: "deleted", checked_at: now } as never)
        .eq("id", draft.id);
    }
  }

  return { checked: list.length, sent, stillDraft, removed };
}
