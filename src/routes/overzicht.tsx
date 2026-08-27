import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Check, X } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCompleteTask,
  useContacts,
  usePendingSuggestions,
  useResolveSuggestion,
  useSettings,
  useTasks,
  type Contact,
} from "@/hooks/useCrmData";
import { daysSince, formatDate, stageLabel } from "@/lib/crm";

const tabSchema = z.object({
  tab: z.enum(["voorstellen", "leads", "stil", "taken"]).default("voorstellen"),
});

export const Route = createFileRoute("/overzicht")({
  validateSearch: tabSchema,
  head: () => ({
    meta: [
      { title: "Overzicht — CRM Buddy voor pdfcursus.nl" },
      {
        name: "description",
        content:
          "Alle openstaande voorstellen, actieve leads en klanten, te lang stille contacten en open taken op één pagina.",
      },
      { property: "og:title", content: "Overzicht — CRM Buddy" },
      {
        property: "og:description",
        content: "Voorstellen, actieve leads, stille contacten en open taken in volledige lijsten.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <OverviewPage />
    </RequireAuth>
  ),
});

function OverviewPage() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
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
    <div className="space-y-8">
      <header>
        <p className="text-xs tracking-widest text-muted-foreground uppercase">Volledige lijsten</p>
        <h1 className="mt-1 text-4xl">Overzicht</h1>
      </header>

      <Tabs value={tab} onValueChange={(v) => navigate({ search: { tab: v as typeof tab } })}>
        <TabsList>
          <TabsTrigger value="voorstellen">Voorstellen ({suggestions.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="leads">Leads & klanten ({active.length})</TabsTrigger>
          <TabsTrigger value="stil">Te lang stil ({stale.length})</TabsTrigger>
          <TabsTrigger value="taken">Taken ({tasks.data?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="voorstellen" className="mt-6 space-y-3">
          {suggestions.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (suggestions.data ?? []).length === 0 ? (
            <Empty text="Geen openstaande voorstellen." />
          ) : (
            (suggestions.data ?? []).map((s) => (
              <Card key={s.id} className="shadow-soft">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {s.contacts ? (
                      <Link
                        to="/contacten/$contactId"
                        params={{ contactId: s.contacts.id }}
                        className="hover:underline"
                      >
                        {s.contacts.full_name}
                      </Link>
                    ) : (
                      "Zonder contact"
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{s.reason}</p>
                  {s.to_stage && (
                    <Badge variant="outline">
                      {stageLabel(s.from_stage)} → {stageLabel(s.to_stage)}
                    </Badge>
                  )}
                  {s.proposed_action && <p className="text-sm">→ {s.proposed_action}</p>}
                  {s.draft_subject && (
                    <div className="rounded-md border border-border bg-secondary/40 p-3 text-sm">
                      <p className="font-medium">{s.draft_subject}</p>
                      <p className="mt-1 whitespace-pre-line text-muted-foreground">{s.draft_body}</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => resolve.mutate({ suggestion: s, approve: true })}>
                      <Check className="mr-1.5 size-3.5" /> Goedkeuren
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolve.mutate({ suggestion: s, approve: false })}
                    >
                      <X className="mr-1.5 size-3.5" /> Afwijzen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="leads" className="mt-6">
          <ContactTable contacts={active} empty="Nog geen actieve leads of klanten." />
        </TabsContent>

        <TabsContent value="stil" className="mt-6">
          <ContactTable contacts={stale} empty="Niets staat te lang stil. Netjes." withDraft />
        </TabsContent>


        <TabsContent value="taken" className="mt-6 space-y-2">
          {(tasks.data ?? []).length === 0 ? (
            <Empty text="Geen open taken." />
          ) : (
            (tasks.data ?? []).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4"
              >
                <div>
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.contacts ? (
                      <Link
                        to="/contacten/$contactId"
                        params={{ contactId: t.contacts.id }}
                        className="hover:underline"
                      >
                        {t.contacts.full_name}
                      </Link>
                    ) : (
                      "Geen contact"
                    )}
                    {t.due_date ? ` · ${formatDate(t.due_date)}` : ""}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => complete.mutate(t.id)}>
                  <Check className="mr-1.5 size-3.5" /> Klaar
                </Button>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ContactTable({
  contacts,
  empty,
  withDraft = false,
}: {
  contacts: Contact[];
  empty: string;
  withDraft?: boolean;
}) {
  const nudge = useNudgeDraft();
  if (contacts.length === 0) return <Empty text={empty} />;
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-secondary/50 text-left text-xs text-muted-foreground uppercase">
          <tr>
            <th className="px-4 py-2 font-medium">Contact</th>
            <th className="px-4 py-2 font-medium">Fase</th>
            <th className="px-4 py-2 font-medium">Volgende stap</th>
            <th className="px-4 py-2 font-medium">Stil</th>
            {withDraft ? <th className="px-4 py-2 font-medium">Concept</th> : null}
          </tr>
        </thead>
        <tbody>
          {contacts.map((c) => {
            const days = daysSince(c.last_contact_at ?? c.created_at);
            return (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-2">
                  <Link
                    to="/contacten/$contactId"
                    params={{ contactId: c.id }}
                    className="font-medium hover:underline"
                  >
                    {c.full_name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{c.email ?? "geen e-mail"}</p>
                </td>
                <td className="px-4 py-2">
                  <Badge variant="outline">{stageLabel(c.stage)}</Badge>
                </td>
                <td className="px-4 py-2 text-muted-foreground">{c.next_step ?? "—"}</td>
                <td className="px-4 py-2 text-muted-foreground">{days !== null ? `${days}d` : "nieuw"}</td>
                {withDraft ? (
                  <td className="px-4 py-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!c.email || nudge.isPending}
                      onClick={() => nudge.mutate(c.id)}
                      title={c.email ? "AI-concept opstellen" : "Geen e-mailadres bekend"}
                    >
                      <Sparkles className="mr-1.5 size-3.5" /> Concept
                    </Button>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
