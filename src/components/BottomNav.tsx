import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Receipt, Plus, CalendarClock, FileCheck2 } from "lucide-react";

const itens: { to: "/" | "/gastos" | "/lancar" | "/vencimentos" | "/ordens"; label: string; icon: typeof LayoutDashboard; destaque?: boolean }[] = [
  { to: "/", label: "Painel", icon: LayoutDashboard },
  { to: "/gastos", label: "Gastos", icon: Receipt },
  { to: "/lancar", label: "Lançar", icon: Plus, destaque: true },
  { to: "/vencimentos", label: "Vencer", icon: CalendarClock },
  { to: "/ordens", label: "Ordens", icon: FileCheck2 },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md flex items-end justify-around px-2 pt-2 pb-2">
        {itens.map((it) => {
          const Icon = it.icon;
          const ativo = pathname === it.to;
          if (it.destaque) {
            return (
              <Link
                key={it.to}
                to={it.to}
                className="-mt-8 flex flex-col items-center gap-1"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition active:scale-95">
                  <Icon className="h-7 w-7" />
                </span>
                <span className="text-[11px] font-semibold text-foreground">{it.label}</span>
              </Link>
            );
          }
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition ${
                ativo ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[11px] font-medium">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
