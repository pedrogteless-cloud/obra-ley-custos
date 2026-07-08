import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PERFIS, usePerfil, type Perfil } from "@/lib/perfil";
import { Delete } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { perfil, pronto, entrar } = usePerfil();
  const navigate = useNavigate();
  const [escolhido, setEscolhido] = useState<Perfil | null>(null);
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (pronto && perfil) navigate({ to: "/" });
  }, [pronto, perfil, navigate]);

  useEffect(() => {
    if (!escolhido) return;
    if (pin.length === 4) {
      const alvo = PERFIS.find((p) => p.nome === escolhido);
      if (alvo && alvo.pin === pin) {
        entrar(escolhido);
        navigate({ to: "/" });
      } else {
        setErro(true);
        setTimeout(() => {
          setPin("");
          setErro(false);
        }, 600);
      }
    }
  }, [pin, escolhido, entrar, navigate]);

  const digitar = (d: string) => {
    if (pin.length < 4) setPin(pin + d);
  };
  const apagar = () => setPin(pin.slice(0, -1));

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 via-background to-background flex flex-col">
      <div className="mx-auto w-full max-w-md flex-1 flex flex-col px-6 pt-12 pb-8">
        <div className="mb-8 text-center">
          <div className="text-4xl mb-2">🏗️</div>
          <h1 className="text-2xl font-bold tracking-tight">Custos da Obra</h1>
          <p className="text-sm text-muted-foreground mt-1">Grupo Ley · Eusébio-CE</p>
        </div>

        {!escolhido ? (
          <div className="flex-1 flex flex-col justify-center gap-3">
            <p className="text-sm font-medium text-muted-foreground text-center mb-2">
              Quem está usando?
            </p>
            {PERFIS.map((p) => (
              <button
                key={p.nome}
                onClick={() => setEscolhido(p.nome)}
                className="flex items-center gap-4 rounded-2xl bg-card border border-border p-4 shadow-sm active:scale-[0.98] transition"
              >
                <span className="text-3xl">{p.emoji}</span>
                <div className="text-left">
                  <div className="font-semibold text-base">{p.nome}</div>
                  <div className="text-xs text-muted-foreground">{p.papel}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <button
              onClick={() => {
                setEscolhido(null);
                setPin("");
              }}
              className="text-sm text-muted-foreground self-start mb-4"
            >
              ← Trocar usuário
            </button>
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground">Olá,</p>
              <p className="text-xl font-semibold">{escolhido}</p>
              <p className="text-xs text-muted-foreground mt-4">Digite seu PIN</p>
            </div>

            <div
              className={`flex justify-center gap-3 mb-8 ${erro ? "animate-pulse" : ""}`}
            >
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-4 w-4 rounded-full border-2 ${
                    erro
                      ? "bg-destructive border-destructive"
                      : pin.length > i
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 mt-auto">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <button
                  key={d}
                  onClick={() => digitar(d)}
                  className="h-16 rounded-2xl bg-card border border-border text-2xl font-semibold active:bg-accent active:scale-95 transition"
                >
                  {d}
                </button>
              ))}
              <div />
              <button
                onClick={() => digitar("0")}
                className="h-16 rounded-2xl bg-card border border-border text-2xl font-semibold active:bg-accent active:scale-95 transition"
              >
                0
              </button>
              <button
                onClick={apagar}
                className="h-16 rounded-2xl flex items-center justify-center text-muted-foreground active:bg-accent active:scale-95 transition"
              >
                <Delete className="h-6 w-6" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
