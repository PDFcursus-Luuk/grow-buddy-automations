import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";


export const runAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { runAssistantForUser } = await import("./assistant-run.server");
    return runAssistantForUser(context.userId, "manual");
  });

export const pushDraftsToGmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { pushPendingDrafts } = await import("./assistant-actions.server");
    return pushPendingDrafts(context.userId);
  });

export const pushTasksToTodoist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { pushOpenTasks } = await import("./assistant-actions.server");
    return pushOpenTasks(context.userId);
  });

export const generateNudgeDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ contactId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { generateNudgeDraftForContact } = await import("./nudge-draft.server");
    return generateNudgeDraftForContact(context.userId, data.contactId);
  });
