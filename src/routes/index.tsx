import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlarmClock,
  ArrowRight,
  Check,
  Inbox,
  Mail,
  MoveRight,
  Sparkles,
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
  useCompleteTask,
  useContacts,
  usePendingSuggestions,
  useResolveSuggestion,
  useSettings,
  useTasks,
  type Contact,
  type Suggestion,
} from "@/hooks/useCrmData";
import { STAGE_META, daysSince, formatDate, stageLabel } from "@/lib/crm";

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
        <ContactFormDialog />
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Inbox} label="Open voorstellen" value={suggestions.data?.length ?? 0} />
        <Stat icon={Users} label="Actieve leads & klanten" value={active.length} />
        <Stat icon={AlarmClock} label={`Stil ≥ ${silenceDays} dagen`} value={stale.length} />
        <Stat icon={Check} label="Open taken" value={tasks.data?.length ?? 0} />
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
          <h2 className="text-2xl">Open taken</h2>
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
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <Card className="shadow-soft">
      <CardContent className="flex items-center gap-4 py-5">
        <span className="flex size-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-display text-3xl leading-none">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StaleRow({ contact }: { contact: Contact }) {
  const days = daysSince(contact.last_contact_at ?? contact.created_at);
  return (
    <Link
      to="/contacten/$contactId"
      params={{ contactId: contact.id }}
      className="flex items-center gap-3 p-4 transition-colors hover:bg-secondary/50"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{contact.full_name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {contact.email ?? "geen e-mail"} · {STAGE_META[contact.stage].label}
        </p>
      </div>
      <Badge variant="outline">{days} dagen</Badge>
    </Link>
  );
}
