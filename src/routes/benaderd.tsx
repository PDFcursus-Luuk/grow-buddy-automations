import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck, RefreshCw } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSentDrafts, useSyncDrafts } from "@/hooks/useCrmData";
import { formatDateTime } from "@/lib/crm";

export const Route = createFileRoute("/benaderd")({
  head: () => ({
    meta: [
      { title: "Benaderd — CRM Buddy voor pdfcursus.nl" },
      {
        name: "description",
        content:
          "Overzicht van alle contacten die je daadwerkelijk hebt gemaild, met onderwerp en datum van verzending.",
      },
      { property: "og:title", content: "Benaderd — CRM Buddy" },
      {
        property: "og:description",
        content: "Wie heb je al gemaild? Alle daadwerkelijk verstuurde mails op één plek.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <ContactedPage />
    </RequireAuth>
  ),
});

function ContactedPage() {
  const sent = useSentDrafts();
  const sync = useSyncDrafts();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">Verzonden</p>
          <h1 className="mt-1 text-4xl">Benaderd</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Alleen concepten die je écht hebt verstuurd komen hier terecht. Concepten die nog in je mailbox
            staan blijven bij Mailconcepten.
          </p>
        </div>
        <Button variant="outline" disabled={sync.isPending} onClick={() => sync.mutate()}>
          <RefreshCw className={`mr-1.5 size-4 ${sync.isPending ? "animate-spin" : ""}`} />
          Controleer mailbox
        </Button>
      </header>

      {sent.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (sent.data?.length ?? 0) === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nog niets verstuurd. Klik op “Controleer mailbox” nadat je concepten hebt verzonden.
          </CardContent>
        </Card>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {sent.data!.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-3 p-4">
              <MailCheck className="size-4 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{d.contacts?.full_name ?? "Onbekend contact"}</p>
                <p className="truncate text-xs text-muted-foreground">{d.subject}</p>
              </div>
              <span className="text-xs text-muted-foreground">{formatDateTime(d.sent_at ?? d.created_at)}</span>
              {d.contact_id && (
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/contacten/$contactId" params={{ contactId: d.contact_id }}>
                    Bekijk
                  </Link>
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
