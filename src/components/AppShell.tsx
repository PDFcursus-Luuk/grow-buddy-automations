import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { CalendarCheck, KanbanSquare, ListChecks, LogOut, MailCheck, Mails, Settings, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Vandaag", icon: CalendarCheck },
  { to: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { to: "/overzicht", label: "Overzicht", icon: ListChecks },
  { to: "/campagnes", label: "Campagnes", icon: Mails },
  { to: "/benaderd", label: "Benaderd", icon: MailCheck },
  { to: "/instellingen", label: "Instellingen", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            <span className="text-display text-lg leading-none">CRM Buddy</span>
          </Link>

          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            {NAV.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                    active
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:block">{user?.email}</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Uitloggen"
              onClick={async () => {
                await signOut();
                navigate({ to: "/auth" });
              }}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
