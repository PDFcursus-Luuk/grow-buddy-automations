import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { ContactFormDialog } from "@/components/ContactFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KIND_LABEL, OWNER_LABEL, STAGES, STAGE_META, formatDate, formatDateTime } from "@/lib/crm";
import { useChangeStage, useContact, useTimeline } from "@/hooks/useCrmData";
import type { Stage } from "@/lib/crm";

export const Route = createFileRoute("/contacten/$contactId")({
  head: () => ({
    meta: [
      { title: "Contactdossier — CRM Buddy voor pdfcursus.nl" },
      {
        name: "description",
        content:
          "Alles over dit contact op één plek: fase, volgende stap, samenvatting van de assistent en de volledige tijdlijn van mail en notities.",
      },
      { property: "og:title", content: "Contactdossier — CRM Buddy" },
      {
        property: "og:description",
        content: "Fase, volgende stap en de volledige tijdlijn van mail, notities en meetings.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <ContactPage />
    </RequireAuth>
  ),
});

function ContactPage() {
  const { contactId } = Route.useParams();
  const contact = useContact(contactId);
  const timeline = useTimeline(contactId);
  const changeStage = useChangeStage();

  if (contact.isLoading) return <Skeleton className="h-96 w-full" />;
  if (!contact.data) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-muted-foreground">Dit contact bestaat niet meer.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/pipeline">Terug naar pipeline</Link>
        </Button>
      </div>
    );
  }

  const c = contact.data;

  return (
    <div className="space-y-8">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/pipeline">
          <ArrowLeft className="mr-1.5 size-4" /> Pipeline
        </Link>
      </Button>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl">{c.full_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[c.job_title, c.companies?.name, c.source && `via ${c.source}`].filter(Boolean).join(" · ") || "—"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {c.email && (
              <Button variant="outline" size="sm" asChild>
                <a href={`mailto:${c.email}`}>
                  <Mail className="mr-1.5 size-3.5" /> {c.email}
                </a>
              </Button>
            )}
            {c.phone && (
              <Button variant="outline" size="sm" asChild>
                <a href={`tel:${c.phone}`}>
                  <Phone className="mr-1.5 size-3.5" /> {c.phone}
                </a>
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={c.stage} onValueChange={(v) => changeStage.mutate({ contact: c, to: v as Stage })}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STAGE_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ContactFormDialog contact={c} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-display text-xl">Samenvatting van je assistent</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {c.ai_summary ??
                  "Nog geen samenvatting. Zodra de assistent mail of notities over dit contact heeft gelezen, staat de stand van zaken hier."}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-display text-xl">Tijdlijn</CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (timeline.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">Nog geen gebeurtenissen vastgelegd.</p>
              ) : (
                <ol className="relative space-y-6 border-l border-border pl-6">
                  {timeline.data!.map((e) => (
                    <li key={e.id}>
                      <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-background bg-primary" />
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{KIND_LABEL[e.kind] ?? e.kind}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDateTime(e.occurred_at)}</span>
                      </div>
                      <p className="mt-1.5 text-sm font-medium">{e.title}</p>
                      {e.body && (
                        <p className="mt-1 text-xs whitespace-pre-wrap text-muted-foreground">{e.body}</p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit shadow-soft">
          <CardHeader>
            <CardTitle className="text-display text-xl">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Volgende stap" value={c.next_step ?? "—"} />
            <Row label="Bal ligt bij" value={OWNER_LABEL[c.next_step_owner] ?? "—"} />
            <Row label="Uiterlijk op" value={formatDate(c.next_step_due)} />
            <Row label="Laatste contact" value={formatDate(c.last_contact_at)} />
            <Row label="Groepsgrootte" value={c.group_size ? `${c.group_size} personen` : "—"} />
            <Row label="Gewenste datum" value={formatDate(c.desired_training_date)} />
            <Row
              label="Waarde"
              value={c.deal_value ? `€ ${Number(c.deal_value).toLocaleString("nl-NL")}` : "—"}
            />
            {c.notes && (
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">Notities</p>
                <p className="mt-1 whitespace-pre-wrap">{c.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
