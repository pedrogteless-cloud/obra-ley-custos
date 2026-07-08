import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { usePerfil } from "@/lib/perfil";
import { BottomNav } from "./BottomNav";
import { LogOut } from "lucide-react";

export function AppLayout({
  titulo,
  subtitulo,
  acao,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  acao?: ReactNode;
  children: ReactNode;
}) {
  const { perfil, pronto, sair } = usePerfil();
  const navigate = useNavigate();

  useEffect(() => {
    if (pronto && !perfil) navigate({ to: "/login" });
  }, [pronto, perfil, navigate]);

  if (!pronto || !perfil) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-md flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{titulo}</h1>
            {subtitulo && <p className="text-xs text-muted-foreground">{subtitulo}</p>}
          </div>
          <div className="flex items-center gap-2">
            {acao}
            <button
              onClick={() => {
                sair();
                navigate({ to: "/login" });
              }}
              className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground"
              title={`Sair (${perfil})`}
            >
              <span>{perfil}</span>
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  );
}
