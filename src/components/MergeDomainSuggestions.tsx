import { useEffect, useState } from "react";
import { Building2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { findDomainGroups, stageLabel, type DomainGroup } from "@/lib/crm";
import { useGroupUnderCompany, useMergeContacts, type Contact } from "@/hooks/useCrmData";

const DISMISS_KEY = "crm-merge-dismissed-domains";

function readDismissed(): string[] {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Vraagt of contacten met hetzelfde zakelijke maildomein tot één klant
 * samengevoegd moeten worden.
 */
export function MergeDomainSuggestions({ contacts }: { contacts: Contact[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [openGroup, setOpenGroup] = useState<DomainGroup<Contact> | null>(null);

  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  const groups = findDomainGroups(contacts).filter((g) => !dismissed.includes(g.domain));
  if (groups.length === 0) return null;

  const dismiss = (domain: string) => {
    const next = [...dismissed, domain];
    setDismissed(next);
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
    } catch {
      /* localStorage niet beschikbaar */
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Building2 className="size-4 text-primary" />
        <h2 className="text-2xl">Zelfde bedrijf?</h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((group) => (
          <Card key={group.domain} className="shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {group.label}
                <span className="ml-2 text-xs font-normal text-muted-foreground">@{group.domain}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {group.contacts.length} contactpersonen delen dit maildomein. Samenvoegen tot één klant?
              </p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {group.contacts.map((c) => (
                  <li key={c.id} className="truncate">
                    {c.full_name} · {c.email} · {stageLabel(c.stage)}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setOpenGroup(group)}>
                  <Users className="mr-1.5 size-3.5" /> Samenvoegen
                </Button>
                <Button size="sm" variant="ghost" onClick={() => dismiss(group.domain)}>
                  Niet samenvoegen
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {openGroup && (
        <MergeDialog
          group={openGroup}
          onClose={() => setOpenGroup(null)}
          onDone={() => {
            setOpenGroup(null);
          }}
        />
      )}
    </section>
  );
}

function MergeDialog({
  group,
  onClose,
  onDone,
}: {
  group: DomainGroup<Contact>;
  onClose: () => void;
  onDone: () => void;
}) {
  const merge = useMergeContacts();
  const groupOnly = useGroupUnderCompany();
  const [primary, setPrimary] = useState(group.contacts[0]?.id ?? "");
  const [companyName, setCompanyName] = useState(group.label);

  const ids = group.contacts.map((c) => c.id);
  const sourceIds = ids.filter((id) => id !== primary);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Samenvoegen tot één klant</DialogTitle>
          <DialogDescription>
            Alle mail, notities, taken en concepten van de andere contactpersonen komen bij het
            hoofdcontact te staan. De losse contacten verdwijnen uit de pipeline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="merge-company">Bedrijfsnaam</Label>
            <Input
              id="merge-company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Hoofdcontactpersoon</Label>
            <RadioGroup value={primary} onValueChange={setPrimary} className="space-y-1">
              {group.contacts.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <RadioGroupItem value={c.id} id={`primary-${c.id}`} />
                  <Label htmlFor={`primary-${c.id}`} className="text-sm font-normal">
                    {c.full_name} · {c.email} · {stageLabel(c.stage)}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={groupOnly.isPending}
            onClick={async () => {
              await groupOnly.mutateAsync({ contactIds: ids, companyName: companyName.trim() });
              onDone();
            }}
          >
            Alleen onder één bedrijf
          </Button>
          <Button
            disabled={merge.isPending || sourceIds.length === 0 || !companyName.trim()}
            onClick={async () => {
              await merge.mutateAsync({
                targetId: primary,
                sourceIds,
                companyName: companyName.trim(),
              });
              onDone();
            }}
          >
            {merge.isPending ? "Samenvoegen…" : "Samenvoegen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
