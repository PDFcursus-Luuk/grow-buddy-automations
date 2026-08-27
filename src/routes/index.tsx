import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlarmClock,
  ArrowRight,
  Check,
  Inbox,
  ListChecks,
  Mail,
  Pencil,
  MoveRight,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { ContactFormDialog } from "@/components/ContactFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useCompleteTask,
  useDeleteDraft,
  useNudgeDraft,
  useUpdateDraft,

  useContacts,
  useDrafts,
  usePendingSuggestions,
  usePushDrafts,
  usePushTasks,
  useResolveSuggestion,
  useRunAssistant,
  useSettings,
  useTasks,
  type Contact,
  type EmailDraft,
  type Suggestion,
} from "@/hooks/useCrmData";
import { STAGE_META, daysSince, formatDate, formatDateTime, stageLabel } from "@/lib/crm";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vandaag — CRM Buddy voor pdfcursus.nl" },
      {
        name: "description",
        content:
          "Je dagelijkse overzicht: openstaande voorstellen van de assistent, stille leads en follow-ups voor je trainingen.",
      },
      { property: "og:title", content: "Vandaag — CRM Buddy" },
      {
        property: "og:description",
        content: "Voorstellen goedkeuren, stille leads opvolgen en concepten klaarzetten in je mailbox.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <TodayPage />
    </RequireAuth>
  ),
});

const TYPE_LABEL: Record<Suggestion["type"], string> = {
  stage_change: "Fase verschuiven",
  follow_up: "Follow-up",
  draft: "Mailconcept",
  enrich: "Gegevens aanvullen",
};

function TodayPage() {
  const contacts = useContacts();
  const suggestions = usePendingSuggestions();
  const tasks = useTasks();
  const settings = useSettings();
  const resolve = useResolveSuggestion();
  const complete = useCompleteTask();
  const run = useRunAssistant();
  const drafts = useDrafts();
  const pushDrafts = usePushDrafts();
  const pushTasks = usePushTasks();

  const silenceDays = settings.data?.silence_days ?? 14;
  const list = contacts.data ?? [];
  const active = list.filter((c) => c.stage !== "cold");
  const stale = active
    .filter((c) => {
      const d = daysSince(c.last_contact_at ?? c.created_at);
      return d !== null && d >= silenceDays;
    })
    .sort(
      (a, b) =>
        (daysSince(b.last_contact_at ?? b.created_at) ?? 0) -
        (daysSince(a.last_contact_at ?? a.created_at) ?? 0),
    );

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">Dagoverzicht</p>
          <h1 className="mt-1 text-4xl">Vandaag</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Je assistent leest mail en notities, en legt hier voorstellen neer. Jij keurt goed.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" disabled={run.isPending} onClick={() => run.mutate()}>
            <RefreshCw className={`mr-1.5 size-4 ${run.isPending ? "animate-spin" : ""}`} />
            {run.isPending ? "Assistent leest mee…" : "Nu draaien"}
          </Button>
          <ContactFormDialog />
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Inbox} label="Open voorstellen" value={suggestions.data?.length ?? 0} tab="voorstellen" />
        <Stat icon={Users} label="Actieve leads & klanten" value={active.length} tab="leads" />
        <Stat icon={AlarmClock} label={`Stil ≥ ${silenceDays} dagen`} value={stale.length} tab="stil" />
        <Stat icon={Check} label="Open taken" value={tasks.data?.length ?? 0} tab="taken" />
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h2 className="text-2xl">Voorstellen van je assistent</h2>
        </div>

        {suggestions.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (suggestions.data?.length ?? 0) === 0 ? (
          <Card className="border-dashed shadow-none">
            <CardContent className="py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Nog geen voorstellen. Zodra de assistent je mail en Drive-notities heeft gelezen, staan de
                fase-verschuivingen en concepten hier klaar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {suggestions.data!.map((s) => (
              <Card key={s.id} className="shadow-soft">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{TYPE_LABEL[s.type]}</Badge>
                    {s.confidence !== null && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(Number(s.confidence) * 100)}% zeker
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-display text-xl">
                    {s.contacts?.full_name ?? "Onbekend contact"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {s.type === "stage_change" && (
                    <p className="flex items-center gap-2 text-sm">
                      <span className="rounded bg-muted px-2 py-0.5">{stageLabel(s.from_stage)}</span>
                      <MoveRight className="size-4 text-muted-foreground" />
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-primary">
                        {stageLabel(s.to_stage)}
                      </span>
                    </p>
                  )}
                  {s.proposed_action && <p className="text-sm font-medium">{s.proposed_action}</p>}
                  {s.draft_subject && (
                    <div className="rounded-md border border-border bg-surface p-3">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <Mail className="size-3.5" /> {s.draft_subject}
                      </p>
                      <p className="mt-2 line-clamp-4 text-xs whitespace-pre-wrap text-muted-foreground">
                        {s.draft_body}
                      </p>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">{s.reason}</p>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      disabled={resolve.isPending}
                      onClick={() => resolve.mutate({ suggestion: s, approve: true })}
                    >
                      <Check className="mr-1.5 size-4" /> Goedkeuren
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={resolve.isPending}
                      onClick={() => resolve.mutate({ suggestion: s, approve: false })}
                    >
                      <X className="mr-1.5 size-4" /> Afwijzen
                    </Button>
                    {s.contact_id && (
                      <Button size="sm" variant="ghost" asChild className="ml-auto">
                        <Link to="/contacten/$contactId" params={{ contactId: s.contact_id }}>
                          Bekijk <ArrowRight className="ml-1.5 size-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl">Mailconcepten</h2>
          <Button
            size="sm"
            variant="outline"
            disabled={pushDrafts.isPending}
            onClick={() => pushDrafts.mutate()}
          >
            <Send className="mr-1.5 size-4" /> Zet in mijn mailbox
          </Button>
        </div>
        {drafts.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (drafts.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nog geen concepten. Keur een mailvoorstel goed, dan komt het hier en daarna in je mailbox.
          </p>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border bg-card">
            {drafts.data!.map((d) => (
              <DraftRow key={d.id} draft={d} />
            ))}
          </div>
        )}

      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-2xl">Te lang stil</h2>
          {contacts.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : stale.length === 0 ? (
            <p className="text-sm text-muted-foreground">Niets blijft liggen. Mooi.</p>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border bg-card">
              {stale.slice(0, 8).map((c) => (
                <StaleRow key={c.id} contact={c} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl">Open taken</h2>
            <Button
              size="sm"
              variant="ghost"
              disabled={pushTasks.isPending}
              onClick={() => pushTasks.mutate()}
            >
              <ListChecks className="mr-1.5 size-4" /> Naar Todoist
            </Button>
          </div>
          {tasks.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (tasks.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Geen open taken.</p>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border bg-card">
              {tasks.data!.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-4">
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-7"
                    aria-label="Taak afronden"
                    onClick={() => complete.mutate(t.id)}
                  >
                    <Check className="size-3.5" />
                  </Button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.contacts?.full_name ?? "Algemeen"} · {formatDate(t.due_date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tab,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tab: "voorstellen" | "leads" | "stil" | "taken";
}) {
  return (
    <Card className="shadow-soft transition-colors hover:border-primary/40">
      <Link to="/overzicht" search={{ tab }} className="block">
      <CardContent className="flex items-center gap-4 py-5">
        <span className="flex size-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-display text-3xl leading-none">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
      </Link>
    </Card>
  );
}

function StaleRow({ contact }: { contact: Contact }) {
  const days = daysSince(contact.last_contact_at ?? contact.created_at);
  const nudge = useNudgeDraft();
  const drafts = useDrafts();
  const hasDraft = (drafts.data ?? []).some((d) => d.contact_id === contact.id);
  return (
    <div className="flex items-center gap-3 p-4 transition-colors hover:bg-secondary/50">
      <Link
        to="/contacten/$contactId"
        params={{ contactId: contact.id }}
        className="min-w-0 flex-1"
      >
        <p className="truncate text-sm font-medium">{contact.full_name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {contact.email ?? "geen e-mail"} · {STAGE_META[contact.stage].label}
        </p>
      </Link>
      <Badge variant="outline">{days} dagen</Badge>
      <Button
        size="sm"
        variant="outline"
        disabled={!contact.email || nudge.isPending || hasDraft}
        onClick={() => nudge.mutate(contact.id)}
        title={
          !contact.email
            ? "Geen e-mailadres bekend"
            : hasDraft
              ? "Er staat al een concept klaar voor dit contact"
              : "AI-concept opstellen"
        }
      >
        <Sparkles className="mr-1.5 size-3.5" /> {hasDraft ? "Concept klaar" : "Concept"}
      </Button>
    </div>
  );
}


function DraftRow({ draft }: { draft: EmailDraft }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const update = useUpdateDraft();
  const remove = useDeleteDraft();

  return (
    <div className="space-y-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={draft.status === "created" ? "secondary" : draft.status === "failed" ? "destructive" : "outline"}
        >
          {draft.status === "created" ? "In mailbox" : draft.status === "failed" ? "Mislukt" : "Klaar om te zetten"}
        </Badge>
        <p className="text-sm font-medium">{draft.subject}</p>
        <span className="ml-auto text-xs text-muted-foreground">
          {draft.contacts?.full_name ?? "Onbekend"} · {formatDateTime(draft.created_at)}
        </span>
      </div>
      <p className="line-clamp-2 text-xs whitespace-pre-wrap text-muted-foreground">{draft.body}</p>
      {draft.error && <p className="text-xs text-destructive">{draft.error}</p>}
      <div className="flex items-center gap-2">
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next) {
              setSubject(draft.subject);
              setBody(draft.body);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost" disabled={draft.status === "created"}>
              <Pencil className="mr-1.5 size-3.5" /> Aanpassen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Concept aanpassen</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor={`subject-${draft.id}`}>Onderwerp</Label>
                <Input
                  id={`subject-${draft.id}`}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`body-${draft.id}`}>Bericht</Label>
                <Textarea
                  id={`body-${draft.id}`}
                  rows={14}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Annuleren
              </Button>
              <Button
                disabled={update.isPending || !subject.trim() || !body.trim()}
                onClick={() =>
                  update.mutate(
                    { id: draft.id, subject: subject.trim(), body: body.trim() },
                    { onSuccess: () => setOpen(false) },
                  )
                }
              >
                Opslaan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          disabled={remove.isPending}
          onClick={() => remove.mutate(draft.id)}
        >
          <Trash2 className="mr-1.5 size-3.5" /> Verwijderen
        </Button>
      </div>
    </div>
  );
}
