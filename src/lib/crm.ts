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

export type SuggestionEffectInput = {
  type: "stage_change" | "follow_up" | "draft" | "enrich";
  to_stage?: string | null;
  proposed_action?: string | null;
  proposed_due_date?: string | null;
  draft_subject?: string | null;
};

/** Legt in gewone taal uit wat er gebeurt als je dit voorstel goedkeurt. */
export function suggestionEffect(s: SuggestionEffectInput): string {
  switch (s.type) {
    case "stage_change":
      return `Het contact schuift in de pipeline naar "${stageLabel(s.to_stage)}". Er gaat geen mail uit.`;
    case "follow_up":
      return `Er komt een taak op je lijst${
        s.proposed_due_date ? ` met datum ${formatDate(s.proposed_due_date)}` : ""
      }: "${s.proposed_action ?? "Follow-up"}". Geen mail, geen faseverandering.`;
    case "draft":
      return "Er wordt een mailconcept aangemaakt bij Mailconcepten. Je kunt het daar aanpassen en pas met \u201eNaar mailbox\u201d gaat het als concept naar Gmail/Superhuman. Er wordt niets verstuurd.";
    case "enrich":
      return "Alleen een aantekening bij het contact. Er gaat geen mail uit en de fase blijft gelijk.";
    default:
      return "Er gebeurt niets automatisch buiten dit voorstel.";
  }
}

/** Vrije e-maildomeinen: die zeggen niets over een bedrijf. */
export const GENERIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "hotmail.nl",
  "outlook.com",
  "outlook.nl",
  "live.nl",
  "live.com",
  "icloud.com",
  "me.com",
  "yahoo.com",
  "ziggo.nl",
  "kpnmail.nl",
  "planet.nl",
  "home.nl",
  "upcmail.nl",
  "telfort.nl",
  "xs4all.nl",
  "casema.nl",
  "chello.nl",
  "protonmail.com",
]);

export function emailDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return domain.includes(".") ? domain : null;
}

/** Bedrijfsnaam afgeleid van het maildomein, bv. ditt.nl -> Ditt */
export function domainLabel(domain: string): string {
  const root = domain.split(".")[0] ?? domain;
  return root.charAt(0).toUpperCase() + root.slice(1);
}

export type ContactLike = {
  id: string;
  full_name: string;
  email: string | null;
  company_id?: string | null;
  companies?: { id: string; name: string } | null;
};

/** Naam van het bedrijf: uit het bedrijfsveld, anders uit het maildomein. */
export function contactCompanyName(contact: ContactLike): string | null {
  if (contact.companies?.name) return contact.companies.name;
  const domain = emailDomain(contact.email);
  if (!domain || GENERIC_EMAIL_DOMAINS.has(domain)) return null;
  return domainLabel(domain);
}

export type DomainGroup<T extends ContactLike> = {
  domain: string;
  label: string;
  contacts: T[];
};

/** Groepen contacten die hetzelfde zakelijke maildomein delen (2 of meer). */
export function findDomainGroups<T extends ContactLike>(contacts: T[]): DomainGroup<T>[] {
  const byDomain = new Map<string, T[]>();
  for (const c of contacts) {
    const domain = emailDomain(c.email);
    if (!domain || GENERIC_EMAIL_DOMAINS.has(domain)) continue;
    const list = byDomain.get(domain) ?? [];
    list.push(c);
    byDomain.set(domain, list);
  }
  return [...byDomain.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([domain, list]) => ({
      domain,
      label:
        list.find((c) => c.companies?.name)?.companies?.name ?? domainLabel(domain),
      contacts: list,
    }))
    .sort((a, b) => b.contacts.length - a.contacts.length);
}
