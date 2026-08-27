import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createGmailDraft, getMessage } from "./gmail.server";
import { createTodoistTask, todoistEnabled } from "./todoist.server";

export async function pushPendingDrafts(userId: string): Promise<{ created: number; failed: number }> {
  const { data: drafts } = await supabaseAdmin
    .from("email_drafts")
    .select("id, subject, body, contact_id, gmail_thread_id")
    .eq("user_id", userId)
    .eq("status", "pending")
    .limit(20);

  let created = 0;
  let failed = 0;

  for (const draft of drafts ?? []) {
    try {
      let to: string | null = null;
      let threadId: string | null = draft.gmail_thread_id ?? null;

      if (draft.contact_id) {
        const { data: contact } = await supabaseAdmin
          .from("contacts")
          .select("email")
          .eq("id", draft.contact_id)
          .maybeSingle();
        to = contact?.email ?? null;

        if (!threadId) {
          const { data: lastEmail } = await supabaseAdmin
            .from("timeline_events")
            .select("source_ref")
            .eq("user_id", userId)
            .eq("contact_id", draft.contact_id)
            .eq("source", "gmail")
            .in("kind", ["email_in", "email_out"])
            .order("occurred_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (lastEmail?.source_ref) {
            try {
              const message = await getMessage(lastEmail.source_ref);
              threadId = message.threadId ?? null;
            } catch {
              threadId = null;
            }
          }
        }
      }

      if (!to) throw new Error("Geen e-mailadres bij dit contact");

      const result = await createGmailDraft({
        to,
        subject: draft.subject,
        body: draft.body,
        threadId,
      });

      await supabaseAdmin
        .from("email_drafts")
        .update({
          status: "created",
          gmail_draft_id: result.id,
          gmail_thread_id: result.message?.threadId ?? threadId,
          error: null,
        } as never)
        .eq("id", draft.id);

      await supabaseAdmin.from("timeline_events").insert({
        user_id: userId,
        contact_id: draft.contact_id,
        kind: "draft",
        title: `Concept klaargezet: ${draft.subject}`,
        body: draft.body,
        source: "gmail",
      } as never);

      created += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      await supabaseAdmin
        .from("email_drafts")
        .update({ status: "failed", error: message } as never)
        .eq("id", draft.id);
    }
  }

  return { created, failed };
}

export async function pushOpenTasks(userId: string): Promise<{ created: number; enabled: boolean }> {
  if (!todoistEnabled()) return { created: 0, enabled: false };

  const { data: settings } = await supabaseAdmin
    .from("crm_settings")
    .select("todoist_project_id")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: tasks } = await supabaseAdmin
    .from("tasks")
    .select("id, title, notes, due_date, contact_id")
    .eq("user_id", userId)
    .eq("status", "open")
    .is("todoist_task_id", null)
    .limit(30);

  let created = 0;
  for (const task of tasks ?? []) {
    let contactName: string | null = null;
    if (task.contact_id) {
      const { data: contact } = await supabaseAdmin
        .from("contacts")
        .select("full_name")
        .eq("id", task.contact_id)
        .maybeSingle();
      contactName = contact?.full_name ?? null;
    }

    const todoistId = await createTodoistTask({
      content: contactName ? `${contactName}: ${task.title}` : task.title,
      description: task.notes,
      dueDate: task.due_date,
      projectId: settings?.todoist_project_id ?? null,
    });
    if (!todoistId) continue;

    await supabaseAdmin
      .from("tasks")
      .update({ todoist_task_id: todoistId } as never)
      .eq("id", task.id);
    created += 1;
  }

  return { created, enabled: true };
}
