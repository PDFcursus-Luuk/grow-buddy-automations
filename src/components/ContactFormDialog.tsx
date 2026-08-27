import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STAGES, STAGE_META } from "@/lib/crm";
import { useSaveContact, type Contact } from "@/hooks/useCrmData";

export function ContactFormDialog({ contact }: { contact?: Contact }) {
  const [open, setOpen] = useState(false);
  const save = useSaveContact();
  const [form, setForm] = useState({
    full_name: contact?.full_name ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    job_title: contact?.job_title ?? "",
    stage: contact?.stage ?? "new_lead",
    source: contact?.source ?? "",
    group_size: contact?.group_size?.toString() ?? "",
    deal_value: contact?.deal_value?.toString() ?? "",
    next_step: contact?.next_step ?? "",
    next_step_due: contact?.next_step_due ?? "",
    notes: contact?.notes ?? "",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await save.mutateAsync({
      id: contact?.id,
      values: {
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        job_title: form.job_title.trim() || null,
        stage: form.stage,
        source: form.source.trim() || null,
        group_size: form.group_size ? Number(form.group_size) : null,
        deal_value: form.deal_value ? Number(form.deal_value) : null,
        next_step: form.next_step.trim() || null,
        next_step_due: form.next_step_due || null,
        notes: form.notes.trim() || null,
      },
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {contact ? (
          <Button variant="outline" size="sm">
            Bewerken
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="mr-2 size-4" /> Contact
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-display text-2xl">
            {contact ? "Contact bewerken" : "Nieuw contact"}
          </DialogTitle>
          <DialogDescription>
            Alleen naam is verplicht. De assistent vult de rest aan uit mail en notities.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Naam</Label>
              <Input
                id="full_name"
                required
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefoon</Label>
              <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job_title">Functie / organisatie</Label>
              <Input id="job_title" value={form.job_title} onChange={(e) => set("job_title", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stage">Fase</Label>
              <Select value={form.stage} onValueChange={(v) => set("stage", v)}>
                <SelectTrigger id="stage">
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Bron</Label>
              <Input
                id="source"
                placeholder="website, netwerk, ..."
                value={form.source}
                onChange={(e) => set("source", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group_size">Groepsgrootte</Label>
              <Input
                id="group_size"
                type="number"
                min={1}
                value={form.group_size}
                onChange={(e) => set("group_size", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deal_value">Waarde (€)</Label>
              <Input
                id="deal_value"
                type="number"
                min={0}
                step="0.01"
                value={form.deal_value}
                onChange={(e) => set("deal_value", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="next_step">Volgende stap</Label>
              <Input id="next_step" value={form.next_step} onChange={(e) => set("next_step", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="next_step_due">Uiterlijk op</Label>
              <Input
                id="next_step_due"
                type="date"
                value={form.next_step_due ?? ""}
                onChange={(e) => set("next_step_due", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notities</Label>
            <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>
              Opslaan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
