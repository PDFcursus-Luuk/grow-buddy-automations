export const STAGES = [
  "new_lead",
  "contacted",
  "demo_scheduled",
  "demo_done",
  "quote_sent",
  "scheduling",
  "training_scheduled",
  "customer",
  "repeat_customer",
  "cold",
  "lost",
] as const;

export type Stage = (typeof STAGES)[number];

export const TRACKS = ["cursus", "calculatie", "overig"] as const;
export type Track = (typeof TRACKS)[number];

export const TRACK_META: Record<Track, { label: string; hint: string }> = {
  cursus: { label: "Cursus", hint: "Hoort in de PDFcursus-pipeline" },
  calculatie: { label: "Calculatie", hint: "Calculatiewerk, buiten de cursus-pipeline" },
  overig: { label: "Overig", hint: "Partner, leverancier of intern" },
};

export function trackLabel(track: string | null | undefined) {
  if (!track) return "-";
  return TRACK_META[track as Track]?.label ?? track;
}

export const STAGE_META: Record<Stage, { label: string; hint: string; tone: string }> = {
  new_lead: {
    label: "Nieuwe lead",
    hint: "Aanvraag binnen, nog geen contact",
    tone: "bg-accent/20 text-accent-foreground",
  },
  contacted: {
    label: "Contact gelegd",
    hint: "Gereageerd, wacht op hun antwoord",
    tone: "bg-accent/15 text-accent-foreground",
  },
  demo_scheduled: {
    label: "Demo gepland",
    hint: "Demo of intake staat in de agenda",
    tone: "bg-chart-4/20 text-foreground",
  },
  demo_done: {
    label: "Demo gehad",
    hint: "Behoefte en groepsgrootte bekend",
    tone: "bg-chart-4/15 text-foreground",
  },
  quote_sent: {
    label: "Offerte uit",
    hint: "Voorstel verstuurd, in beslissing",
    tone: "bg-warning/25 text-warning-foreground",
  },
  scheduling: {
    label: "Datum plannen",
    hint: "Akkoord, datum wordt vastgezet",
    tone: "bg-warning/20 text-warning-foreground",
  },
  training_scheduled: {
    label: "Training ingepland",
    hint: "Datum staat, voorbereiding loopt",
    tone: "bg-primary/15 text-primary",
  },
  customer: {
    label: "Klant",
    hint: "Training uitgevoerd",
    tone: "bg-success/20 text-success",
  },
  repeat_customer: {
    label: "Herhaalklant",
    hint: "Kandidaat voor vervolgtraining",
    tone: "bg-success/25 text-success",
  },
  cold: {
    label: "Koud",
    hint: "Geen reactie of nu geen interesse - later opnieuw proberen",
    tone: "bg-muted text-muted-foreground",
  },
  lost: {
    label: "Verloren",
    hint: "Definitief niets meer te halen - geen opvolging",
    tone: "bg-destructive/15 text-destructive",
  },
};


export const OWNER_LABEL: Record<string, string> = {
  me: "Bij mij",
  them: "Bij hen",
  none: "Geen actie",
};

export const KIND_LABEL: Record<string, string> = {
  email_in: "Mail ontvangen",
  email_out: "Mail verstuurd",
  note: "Notitie",
  meeting: "Meeting",
  stage_change: "Fase gewijzigd",
  task: "Taak",
  draft: "Concept",
  system: "Systeem",
};

export function stageLabel(stage: string | null | undefined) {
  if (!stage) return "-";
  return STAGE_META[stage as Stage]?.label ?? stage;
}

export function daysSince(date: string | null | undefined): number | null {
  if (!date) return null;
  const ms = Date.now() - new Date(date).getTime();
  return Math.floor(ms / 86_400_000);
}

export function formatDate(date: string | null | undefined) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(date),
  );
}

export function formatDateTime(date: string | null | undefined) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
