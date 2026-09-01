import { createFileRoute } from "@tanstack/react-router";

async function authenticateScheduledRequest(request: Request): Promise<Response | null> {
  const match = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "");
  const token = match?.[1];
  if (!token) return new Response("Unauthorized", { status: 401 });

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("cron_secrets")
    .select("token")
    .eq("name", "assistant_run")
    .maybeSingle();

  const expected = data?.token;
  if (!expected) return new Response("Server configuration error", { status: 500 });

  const { createHash, timingSafeEqual } = await import("node:crypto");
  const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
  if (!timingSafeEqual(digest(token), digest(expected))) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}

async function handleRun() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { runAssistantForUser } = await import("@/lib/assistant-run.server");
  const { pushPendingDrafts, pushOpenTasks } = await import("@/lib/assistant-actions.server");
  const { syncDraftStatuses } = await import("@/lib/draft-status.server");

  const { data: users, error } = await supabaseAdmin
    .from("crm_settings")
    .select("user_id")
    .eq("auto_run_enabled", true);
  if (error) throw error;

  const results: Record<string, unknown>[] = [];
  for (const row of users ?? []) {
    const userId = row.user_id as string;
    try {
      const run = await runAssistantForUser(userId, "cron");
      const drafts = await pushPendingDrafts(userId);
      const tasks = await pushOpenTasks(userId);
      results.push({ userId, ...run, drafts, tasks });
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : String(runError);
      console.error(`[cron] run failed for ${userId}: ${message}`);
      results.push({ userId, error: message });
    }
  }

  return Response.json({ ok: true, runs: results });
}

export const Route = createFileRoute("/api/public/assistant-run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = await authenticateScheduledRequest(request);
        if (unauthorized) return unauthorized;
        return handleRun();
      },
    },
  },
});
