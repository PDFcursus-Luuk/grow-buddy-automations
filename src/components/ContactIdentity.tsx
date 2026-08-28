import { contactCompanyName, type ContactLike } from "@/lib/crm";

/**
 * Toont het bedrijf groot en dikgedrukt, met daaronder de naam van de
 * contactpersoon en het e-mailadres.
 */
export function ContactIdentity({
  contact,
  className,
}: {
  contact: ContactLike;
  className?: string;
}) {
  const company = contactCompanyName(contact);
  const secondary = [company ? contact.full_name : null, contact.email]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={`min-w-0 ${className ?? ""}`}>
      <p className="truncate text-sm font-semibold">{company ?? contact.full_name}</p>
      <p className="truncate text-xs text-muted-foreground">{secondary || "geen e-mail"}</p>
    </div>
  );
}
