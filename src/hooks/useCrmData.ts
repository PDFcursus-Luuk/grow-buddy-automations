import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Stage, Track } from "@/lib/crm";
import { pushDraftsToGmail, pushTasksToTodoist, runAssistant } from "@/lib/assistant.functions";

export type Contact = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  stage: Stage;
  track: Track;
  is_internal: boolean;
  next_step: string | null;
  next_step_owner: "me" | "them" | "none";
  next_step_due: string | null;
  last_contact_at: string | null;
  last_inbound_at: string | null;
  ai_summary: string | null;
  group_size: number | null;
  desired_training_date: string | null;
  deal_value: number | null;
  source: string | null;
  notes: string | null;
  is_archived: boolean;
  company_id: string | null;
  companies?: { id: string; name: string } | null;
  created_at: string;
};

export type Suggestion = {
  id: string;
  contact_id: string | null;
  type: "stage_change" | "follow_up" | "draft" | "enrich";
  status: "pending" | "approved" | "rejected" | "expired";
  from_stage: Stage | null;
  to_stage: Stage | null;
  reason: string;
  confidence: number | null;
  proposed_action: string | null;
  proposed_due_date: string | null;
  draft_subject: string | null;
  draft_body: string | null;
  source_summary: string | null;
  created_at: string;
  contacts?: { id: string; full_name: string; email: string | null; stage: Stage } | null;
};

export type TimelineEvent = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  source: string;
  occurred_at: string;
};

export type CrmTask = {
  id: string;
  title: string;
  notes: string | null;
  due_date: string | null;
  status: "open" | "done" | "cancelled";
  contact_id: string | null;
  todoist_task_id: string | null;
  contacts?: { id: string; full_name: string } | null;
};

export function useContacts(track: Track | "alle" = "cursus") {
  return useQuery({
    queryKey: ["contacts", track],
    queryFn: async () => {
      let query = supabase
        .from("contacts")
        .select("*, companies(id, name)")
        .eq("is_archived", false)
        .eq("is_internal", false);
      if (track !== "alle") query = query.eq("track", track);
      const { data, error } = await query.order("updated_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Contact[];
    },
  });
}

export function useSetTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contactId, track }: { contactId: string; track: Track }) => {
      const { error } = await supabase.from("contacts").update({ track }).eq("id", contactId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contact", vars.contactId] });
      toast.success(`Verplaatst naar spoor ${vars.track}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ["contact", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*, companies(id, name)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Contact | null;
    },
  });
}

export function useTimeline(contactId: string) {
  return useQuery({
    queryKey: ["timeline", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timeline_events")
        .select("id, kind, title, body, source, occurred_at")
        .eq("contact_id", contactId)
        .order("occurred_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as TimelineEvent[];
    },
  });
}

export function usePendingSuggestions() {
  return useQuery({
    queryKey: ["suggestions", "pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suggestions")
        .select("*, contacts(id, full_name, email, stage)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Suggestion[];
    },
  });
}

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, contacts(id, full_name)")
        .eq("status", "open")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data as unknown as CrmTask[];
    },
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["crm_settings"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase.from("crm_settings").select("*").eq("user_id", uid).maybeSingle();
      if (error) throw error;
      if (data) return data;
      const { data: created, error: insertError } = await supabase
        .from("crm_settings")
        .insert({ user_id: uid })
        .select()
        .single();
      if (insertError) throw insertError;
      return created;
    },
  });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Niet ingelogd");
      const { error } = await supabase.from("crm_settings").update(patch as never).eq("user_id", uid);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm_settings"] });
      toast.success("Instellingen opgeslagen");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSaveContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string | undefined; values: Record<string, unknown> }) => {
      if (input.id) {
        const { error } = await supabase.from("contacts").update(input.values as never).eq("id", input.id);
        if (error) throw error;
        return input.id;
      }
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Niet ingelogd");
      const { data, error } = await supabase
        .from("contacts")
        .insert({ ...input.values, user_id: uid } as never)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (_id, vars) => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      if (vars.id) qc.invalidateQueries({ queryKey: ["contact", vars.id] });
      toast.success("Contact opgeslagen");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useChangeStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contact, to }: { contact: Contact; to: Stage }) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Niet ingelogd");
      const { error } = await supabase.from("contacts").update({ stage: to }).eq("id", contact.id);
      if (error) throw error;
      await supabase.from("timeline_events").insert({
        user_id: uid,
        contact_id: contact.id,
        kind: "stage_change",
        title: `Fase gewijzigd naar ${to}`,
        body: `Handmatig verplaatst vanuit ${contact.stage}.`,
        source: "manual",
      } as never);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contact", vars.contact.id] });
      qc.invalidateQueries({ queryKey: ["timeline", vars.contact.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useResolveSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ suggestion, approve }: { suggestion: Suggestion; approve: boolean }) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Niet ingelogd");

      if (approve && suggestion.contact_id) {
        if (suggestion.type === "stage_change" && suggestion.to_stage) {
          const { error } = await supabase
            .from("contacts")
            .update({ stage: suggestion.to_stage })
            .eq("id", suggestion.contact_id);
          if (error) throw error;
          await supabase.from("timeline_events").insert({
            user_id: uid,
            contact_id: suggestion.contact_id,
            kind: "stage_change",
            title: `Fase gewijzigd naar ${suggestion.to_stage}`,
            body: suggestion.reason,
            source: "assistant",
          } as never);
        }
        if (suggestion.type === "follow_up") {
          const { error } = await supabase.from("tasks").insert({
            user_id: uid,
            contact_id: suggestion.contact_id,
            title: suggestion.proposed_action ?? "Follow-up",
            notes: suggestion.reason,
            due_date: suggestion.proposed_due_date,
          } as never);
          if (error) throw error;
        }
        if (suggestion.type === "draft" && suggestion.draft_subject && suggestion.draft_body) {
          const { error } = await supabase.from("email_drafts").insert({
            user_id: uid,
            contact_id: suggestion.contact_id,
            suggestion_id: suggestion.id,
            subject: suggestion.draft_subject,
            body: suggestion.draft_body,
          } as never);
          if (error) throw error;
        }
      }

      const { error } = await supabase
        .from("suggestions")
        .update({ status: approve ? "approved" : "rejected", resolved_at: new Date().toISOString() })
        .eq("id", suggestion.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["suggestions", "pending"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(vars.approve ? "Goedgekeurd" : "Afgewezen");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("tasks").update({ status: "done" }).eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export type EmailDraft = {
  id: string;
  subject: string;
  body: string;
  status: "pending" | "created" | "failed" | "discarded";
  error: string | null;
  gmail_draft_id: string | null;
  created_at: string;
  contact_id: string | null;
  contacts?: { id: string; full_name: string; email: string | null } | null;
};

export function useDrafts() {
  return useQuery({
    queryKey: ["email_drafts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_drafts")
        .select("*, contacts(id, full_name, email)")
        .in("status", ["pending", "created", "failed"])
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as unknown as EmailDraft[];
    },
  });
}

export function useRunAssistant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => runAssistant(),
    onSuccess: (result) => {
      ["contacts", "suggestions", "tasks", "email_drafts", "run_logs"].forEach((key) =>
        qc.invalidateQueries({ queryKey: [key] }),
      );
      toast.success(
        `Run klaar: ${result.emails} mails, ${result.notes} notities, ${result.suggestions} voorstellen`,
        result.skippedReason ? { description: result.skippedReason } : undefined,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function usePushDrafts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => pushDraftsToGmail(),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["email_drafts"] });
      if (result.created > 0) toast.success(`${result.created} concept(en) staan in je mailbox`);
      else if (result.failed > 0) toast.error("Concepten konden niet worden aangemaakt");
      else toast.info("Geen concepten om klaar te zetten");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function usePushTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => pushTasksToTodoist(),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      if (!result.enabled) toast.info("Todoist is nog niet gekoppeld");
      else toast.success(`${result.created} taak/taken naar Todoist`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useNudgeDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contactId: string) => generateNudgeDraft({ data: { contactId } }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["email_drafts"] });
      toast.success("Concept klaargezet", { description: result.subject });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
