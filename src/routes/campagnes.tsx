import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Mails, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/campagnes")({
  head: () => ({
    meta: [
      { title: "Campagnes — CRM Buddy voor pdfcursus.nl" },
      {
        name: "description",
        content:
          "Mailreeksen waarmee je leads en oud-klanten warm houdt: doel per stap, wachttijd in dagen en concepten die de assistent voor je opstelt.",
      },
      { property: "og:title", content: "Campagnes — CRM Buddy" },
      {
        property: "og:description",
        content: "Warmhoudreeksen voor leads en herhaalklanten, met concepten uit je assistent.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <CampaignsPage />
    </RequireAuth>
  ),
});

type Campaign = {
  id: string;
  name: string;
  goal: string | null;
  is_active: boolean;
};

type Step = {
  id: string;
  campaign_id: string;
  step_order: number;
  delay_days: number;
  subject_hint: string | null;
  content_goal: string;
};

function CampaignsPage() {
  const qc = useQueryClient();

  const campaigns = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, goal, is_active")
        .order("created_at");
      if (error) throw error;
      return data as Campaign[];
    },
  });

  const steps = useQuery({
    queryKey: ["campaign_steps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_steps")
        .select("id, campaign_id, step_order, delay_days, subject_hint, content_goal")
        .order("step_order");
      if (error) throw error;
      return data as Step[];
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("campaigns").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const removeStep = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaign_steps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaign_steps"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">Warm houden</p>
          <h1 className="mt-1 text-4xl">Campagnes</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Beschrijf per stap wat de mail moet bereiken. De assistent schrijft het concept op maat voor het
            contact en zet het klaar in je mailbox.
          </p>
        </div>
        <NewCampaignDialog />
      </header>

      {campaigns.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (campaigns.data?.length ?? 0) === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="py-14 text-center">
            <Mails className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Nog geen campagnes. Begin bijvoorbeeld met "Lead warm houden" of "Vervolgtraining bij oud-klanten".
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {campaigns.data!.map((c) => {
            const own = (steps.data ?? []).filter((s) => s.campaign_id === c.id);
            return (
              <Card key={c.id} className="shadow-soft">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-display text-2xl">{c.name}</CardTitle>
                      {c.goal && <p className="mt-1 text-sm text-muted-foreground">{c.goal}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={c.is_active ? "default" : "outline"}>
                        {c.is_active ? "Actief" : "Uit"}
                      </Badge>
                      <Switch
                        checked={c.is_active}
                        aria-label="Campagne aan of uit"
                        onCheckedChange={(v) => toggle.mutate({ id: c.id, is_active: v })}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {own.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nog geen stappen.</p>
                  ) : (
                    <ol className="space-y-2">
                      {own.map((s) => (
                        <li
                          key={s.id}
                          className="flex items-start gap-3 rounded-md border border-border bg-surface p-3"
                        >
                          <span className="flex size-6 shrink-0 items-center justify-center rounded bg-primary text-xs text-primary-foreground">
                            {s.step_order}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{s.subject_hint ?? "Onderwerp door assistent"}</p>
                            <p className="text-xs text-muted-foreground">{s.content_goal}</p>
                          </div>
                          <span className="text-xs whitespace-nowrap text-muted-foreground">
                            +{s.delay_days}d
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            aria-label="Stap verwijderen"
                            onClick={() => removeStep.mutate(s.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </li>
                      ))}
                    </ol>
                  )}
                  <NewStepDialog campaignId={c.id} nextOrder={own.length + 1} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NewCampaignDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Niet ingelogd");
      const { error } = await supabase
        .from("campaigns")
        .insert({ user_id: uid, name: name.trim(), goal: goal.trim() || null } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      setOpen(false);
      setName("");
      setGoal("");
      toast.success("Campagne aangemaakt");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 size-4" /> Campagne
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-display text-2xl">Nieuwe campagne</DialogTitle>
          <DialogDescription>Geef de reeks een naam en beschrijf wat je wil bereiken.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="campaign-name">Naam</Label>
            <Input
              id="campaign-name"
              required
              placeholder="Lead warm houden"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="campaign-goal">Doel</Label>
            <Textarea
              id="campaign-goal"
              rows={3}
              placeholder="Leads die na een demo stil vallen terugbrengen naar een offerte."
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              Aanmaken
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewStepDialog({ campaignId, nextOrder }: { campaignId: string; nextOrder: number }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [delay, setDelay] = useState("7");
  const [subject, setSubject] = useState("");
  const [goal, setGoal] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Niet ingelogd");
      const { error } = await supabase.from("campaign_steps").insert({
        user_id: uid,
        campaign_id: campaignId,
        step_order: nextOrder,
        delay_days: Number(delay) || 7,
        subject_hint: subject.trim() || null,
        content_goal: goal.trim(),
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign_steps"] });
      setOpen(false);
      setSubject("");
      setGoal("");
      toast.success("Stap toegevoegd");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 size-4" /> Stap toevoegen
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-display text-2xl">Stap {nextOrder}</DialogTitle>
          <DialogDescription>Wachttijd en doel van deze mail.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="step-delay">Wachttijd in dagen</Label>
            <Input
              id="step-delay"
              type="number"
              min={0}
              value={delay}
              onChange={(e) => setDelay(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="step-subject">Onderwerp-hint (optioneel)</Label>
            <Input id="step-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="step-goal">Wat moet deze mail bereiken?</Label>
            <Textarea
              id="step-goal"
              rows={3}
              required
              placeholder="Kort checken of de planning nog actueel is en een datum voorstellen."
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              Toevoegen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
