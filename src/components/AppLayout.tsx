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
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto max-w-md flex items-center justify-between px-4 py-3.5">
          <div>
            <h1 className="text-[21px] font-extrabold tracking-tight leading-none">{titulo}</h1>
            {subtitulo && <p className="text-[11.5px] text-muted-foreground mt-1">{subtitulo}</p>}
          </div>
          <div className="flex items-center gap-2">
            {acao}
            <button
              onClick={() => {
                sair();
                navigate({ to: "/login" });
              }}
              className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition active:scale-95"
              title={`Sair (${perfil})`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
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
