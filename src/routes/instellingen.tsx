import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useSaveSettings, useSettings } from "@/hooks/useCrmData";
import { formatDateTime } from "@/lib/crm";

export const Route = createFileRoute("/instellingen")({
  head: () => ({
    meta: [
      { title: "Instellingen — CRM Buddy voor pdfcursus.nl" },
      {
        name: "description",
        content:
          "Stel in hoe je assistent werkt: stiltedrempel, tone-of-voice voor mailconcepten, Drive-map, taalmodel en maandelijks tokenplafond.",
      },
      { property: "og:title", content: "Instellingen — CRM Buddy" },
      {
        property: "og:description",
        content: "Stiltedrempel, tone-of-voice, Drive-map, model en tokenplafond van je assistent.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <SettingsPage />
    </RequireAuth>
  ),
});

const MODELS = [
  { value: "google/gemini-3.1-flash-lite", label: "Flash Lite — goedkoopst, ruim genoeg" },
  { value: "google/gemini-3.7-flash", label: "Flash — scherper voor mailconcepten" },
  { value: "google/gemini-3.1-pro-preview", label: "Pro — beste kwaliteit, duurder" },
];

function SettingsPage() {
  const settings = useSettings();
  const save = useSaveSettings();
  const [form, setForm] = useState<Record<string, string | boolean>>({});

  useEffect(() => {
    if (settings.data) {
      const d = settings.data as Record<string, unknown>;
      setForm({
        drive_folder_id: (d["drive_folder_id"] as string) ?? "",
        drive_folder_name: (d["drive_folder_name"] as string) ?? "",
        silence_days: String(d["silence_days"] ?? 14),
        tone_of_voice: (d["tone_of_voice"] as string) ?? "",
        signature: (d["signature"] as string) ?? "",
        todoist_project_id: (d["todoist_project_id"] as string) ?? "",
        ai_model: (d["ai_model"] as string) ?? "google/gemini-3.1-flash-lite",
        monthly_token_cap: String(d["monthly_token_cap"] ?? 4000000),
        business_context: (d["business_context"] as string) ?? "",
        auto_run_enabled: Boolean(d["auto_run_enabled"]),
      });
    }
  }, [settings.data]);

  const runs = useQuery({
    queryKey: ["run_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("run_logs")
        .select("id, trigger, status, emails_seen, notes_seen, suggestions_created, tokens_in, tokens_out, started_at")
        .order("started_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const monthTokens = (runs.data ?? []).reduce(
    (sum, r) => sum + (r.tokens_in ?? 0) + (r.tokens_out ?? 0),
    0,
  );

  if (settings.isLoading) return <Skeleton className="h-96 w-full" />;

  function set(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="max-w-3xl space-y-8">
      <header>
        <p className="text-xs tracking-widest text-muted-foreground uppercase">Configuratie</p>
        <h1 className="mt-1 text-4xl">Instellingen</h1>
      </header>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-display text-2xl">Zo werkt je assistent</CardTitle>
          <CardDescription>
            Deze context gebruikt de assistent bij het beoordelen van mail en notities.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business_context">Wat doe je?</Label>
            <Textarea
              id="business_context"
              rows={3}
              value={(form["business_context"] as string) ?? ""}
              onChange={(e) => set("business_context", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tone_of_voice">Tone-of-voice voor mailconcepten</Label>
            <Textarea
              id="tone_of_voice"
              rows={2}
              value={(form["tone_of_voice"] as string) ?? ""}
              onChange={(e) => set("tone_of_voice", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signature">Ondertekening</Label>
            <Textarea
              id="signature"
              rows={2}
              placeholder={"Met vriendelijke groet,\n..."}
              value={(form["signature"] as string) ?? ""}
              onChange={(e) => set("signature", e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="silence_days">Stil na hoeveel dagen?</Label>
              <Input
                id="silence_days"
                type="number"
                min={1}
                value={(form["silence_days"] as string) ?? ""}
                onChange={(e) => set("silence_days", e.target.value)}
              />
            </div>
            <div className="flex items-end justify-between gap-4 rounded-md border border-border p-3">
              <div>
                <Label htmlFor="auto_run_enabled">Dagelijkse runs</Label>
                <p className="mt-1 text-xs text-muted-foreground">Twee keer per dag automatisch draaien</p>
              </div>
              <Switch
                id="auto_run_enabled"
                checked={Boolean(form["auto_run_enabled"])}
                onCheckedChange={(v) => set("auto_run_enabled", v)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-display text-2xl">Koppelingen</CardTitle>
          <CardDescription>
            Mail en Drive worden via je Google-account gekoppeld. Todoist en de map vul je hier in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="drive_folder_name">Naam Drive-map met notities</Label>
              <Input
                id="drive_folder_name"
                placeholder="CRM Notities"
                value={(form["drive_folder_name"] as string) ?? ""}
                onChange={(e) => set("drive_folder_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drive_folder_id">Map-ID (optioneel)</Label>
              <Input
                id="drive_folder_id"
                value={(form["drive_folder_id"] as string) ?? ""}
                onChange={(e) => set("drive_folder_id", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="todoist_project_id">Todoist-project</Label>
              <Input
                id="todoist_project_id"
                placeholder="project-ID of naam"
                value={(form["todoist_project_id"] as string) ?? ""}
                onChange={(e) => set("todoist_project_id", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-display text-2xl">Model en verbruik</CardTitle>
          <CardDescription>
            Een goedkoop model is voor dit werk ruim genoeg. Het plafond stopt de runs als het bereikt is.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ai_model">Taalmodel</Label>
              <Select
                value={(form["ai_model"] as string) ?? ""}
                onValueChange={(v) => set("ai_model", v)}
              >
                <SelectTrigger id="ai_model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly_token_cap">Tokenplafond per maand</Label>
              <Input
                id="monthly_token_cap"
                type="number"
                min={0}
                step={100000}
                value={(form["monthly_token_cap"] as string) ?? ""}
                onChange={(e) => set("monthly_token_cap", e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border border-border bg-surface p-4">
            <p className="text-sm font-medium">
              Verbruik laatste runs: {monthTokens.toLocaleString("nl-NL")} tokens
            </p>
            {runs.data && runs.data.length > 0 ? (
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                {runs.data.map((r) => (
                  <li key={r.id} className="flex justify-between gap-4">
                    <span>
                      {formatDateTime(r.started_at)} · {r.trigger} · {r.status}
                    </span>
                    <span>
                      {r.emails_seen} mails · {r.notes_seen} notities · {r.suggestions_created} voorstellen ·{" "}
                      {((r.tokens_in ?? 0) + (r.tokens_out ?? 0)).toLocaleString("nl-NL")} tokens
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">Nog geen runs uitgevoerd.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          disabled={save.isPending}
          onClick={() =>
            save.mutate({
              drive_folder_id: (form["drive_folder_id"] as string) || null,
              drive_folder_name: (form["drive_folder_name"] as string) || null,
              silence_days: Number(form["silence_days"]) || 14,
              tone_of_voice: form["tone_of_voice"] as string,
              signature: (form["signature"] as string) || null,
              todoist_project_id: (form["todoist_project_id"] as string) || null,
              ai_model: form["ai_model"] as string,
              monthly_token_cap: Number(form["monthly_token_cap"]) || 4000000,
              business_context: form["business_context"] as string,
              auto_run_enabled: Boolean(form["auto_run_enabled"]),
            })
          }
        >
          Opslaan
        </Button>
      </div>
    </div>
  );
}
