import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeftRight, ChevronLeft, ChevronRight } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { ContactFormDialog } from "@/components/ContactFormDialog";
import { ContactIdentity } from "@/components/ContactIdentity";
import { MergeDomainSuggestions } from "@/components/MergeDomainSuggestions";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { STAGES, STAGE_META, TRACKS, TRACK_META, daysSince, type Track } from "@/lib/crm";
import { useChangeStage, useContacts, type Contact } from "@/hooks/useCrmData";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline — CRM Buddy voor pdfcursus.nl" },
      {
        name: "description",
        content:
          "Alle leads en klanten per fase: van nieuwe aanvraag en demo tot offerte, ingeplande training en herhaalklant.",
      },
      { property: "og:title", content: "Pipeline — CRM Buddy" },
      {
        property: "og:description",
        content: "Bekijk je trainingspipeline per fase en verschuif contacten in één klik.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <PipelinePage />
    </RequireAuth>
  ),
});

function PipelinePage() {
  const [track, setTrack] = useState<Track | "alle">("cursus");
  const { data, isLoading } = useContacts(track);
  const [query, setQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = (data ?? []).filter((c) =>
    [c.full_name, c.email, c.job_title, c.source]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  const scrollBy = (dir: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">Overzicht</p>
          <h1 className="mt-1 text-4xl">Pipeline</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-md border border-border p-0.5">
            {([...TRACKS, "alle"] as const).map((t) => (
              <Button
                key={t}
                type="button"
                size="sm"
                variant={track === t ? "secondary" : "ghost"}
                onClick={() => setTrack(t)}
              >
                {t === "alle" ? "Alles" : TRACK_META[t].label}
              </Button>
            ))}
          </div>
          <Input
            placeholder="Zoek op naam, mail of bron"
            className="w-56"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ContactFormDialog />
        </div>
      </header>

      <MergeDomainSuggestions contacts={data ?? []} />

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="relative">
          <div className="mb-3 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => scrollBy(-1)}
              aria-label="Scroll naar links"
              className="size-9 shrink-0"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              Gebruik de pijlen om door de fases te bladeren
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => scrollBy(1)}
              aria-label="Scroll naar rechts"
              className="size-9 shrink-0"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-4 scroll-smooth">
          {STAGES.map((stage) => {
            const items = filtered.filter((c) => c.stage === stage);
            return (
              <div key={stage} className="w-72 shrink-0">
                <div className="mb-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">{STAGE_META[stage].label}</h2>
                    <Badge variant="outline">{items.length}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{STAGE_META[stage].hint}</p>
                </div>
                <div className="space-y-3">
                  {items.map((c) => (
                    <PipelineCard key={c.id} contact={c} />
                  ))}
                  {items.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                      Leeg
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      )}
    </div>
  );
}

function PipelineCard({ contact }: { contact: Contact }) {
  const changeStage = useChangeStage();
  const days = daysSince(contact.last_contact_at ?? contact.created_at);

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-soft">
      <Link
        to="/contacten/$contactId"
        params={{ contactId: contact.id }}
        className="block hover:underline"
      >
        <ContactIdentity contact={contact} />
      </Link>


      {contact.next_step && <p className="mt-3 text-xs text-foreground">→ {contact.next_step}</p>}

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {days !== null ? `${days}d stil` : "nieuw"}
          {contact.group_size ? ` · ${contact.group_size} pers.` : ""}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7" aria-label="Fase wijzigen">
              <ArrowLeftRight className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {STAGES.filter((s) => s !== contact.stage).map((s) => (
              <DropdownMenuItem key={s} onClick={() => changeStage.mutate({ contact, to: s })}>
                {STAGE_META[s].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
