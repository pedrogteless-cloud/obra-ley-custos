import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { AppLayout } from "@/components/AppLayout";
import { brl, CATEGORIAS, dataBR, statusVencimento, type Categoria } from "@/lib/format";
import { TrendingUp, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Painel,
});

function Painel() {
  const { data: lancamentos = [] } = useQuery({
    queryKey: ["lancamentos"],
    queryFn: async () => {
      const { data, error } = await db.from("lancamentos").select("*");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; categoria: Categoria; valor: number; descricao: string; fornecedor: string | null }>;
    },
  });
  const { data: parcelas = [] } = useQuery({
    queryKey: ["parcelas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcelas" as never)
        .select("*, lancamentos(descricao, fornecedor, categoria)")
        .order("vencimento", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        valor: number;
        vencimento: string;
        pago: boolean;
        lancamentos: { descricao: string; fornecedor: string | null; categoria: Categoria } | null;
      }>;
    },
  });

  const total = lancamentos.reduce((s, l) => s + Number(l.valor), 0);
  const aPagar = parcelas.filter((p) => !p.pago).reduce((s, p) => s + Number(p.valor), 0);
  const jaPago = parcelas.filter((p) => p.pago).reduce((s, p) => s + Number(p.valor), 0);
  const hoje = new Date().toISOString().slice(0, 10);
  const vencidas = parcelas.filter((p) => !p.pago && p.vencimento < hoje);
  const vencidoTotal = vencidas.reduce((s, p) => s + Number(p.valor), 0);

  const porCategoria = (Object.keys(CATEGORIAS) as Categoria[]).map((cat) => ({
    cat,
    total: lancamentos.filter((l) => l.categoria === cat).reduce((s, l) => s + Number(l.valor), 0),
  }));
  const maxCat = Math.max(1, ...porCategoria.map((c) => c.total));

  const proximos = parcelas.filter((p) => !p.pago).slice(0, 5);

  return (
    <AppLayout titulo="Painel" subtitulo="Obra Eusébio-CE">
      <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-5 shadow-lg shadow-primary/20">
        <div className="flex items-center gap-2 text-xs opacity-90">
          <TrendingUp className="h-4 w-4" /> Total gasto na obra
        </div>
        <div className="text-3xl font-bold mt-2">{brl(total)}</div>
        <div className="text-xs opacity-80 mt-1">{lancamentos.length} lançamentos</div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <KPI icon={<Clock className="h-4 w-4" />} label="A pagar" valor={brl(aPagar)} tone="warning" />
        <KPI icon={<CheckCircle2 className="h-4 w-4" />} label="Já pago" valor={brl(jaPago)} tone="success" />
        <KPI
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Vencido"
          valor={brl(vencidoTotal)}
          badge={vencidas.length > 0 ? vencidas.length : undefined}
          tone="destructive"
        />
      </div>

      <section className="mt-5 rounded-2xl bg-card border border-border p-4">
        <h2 className="font-semibold text-sm mb-3">Gasto por categoria</h2>
        <div className="space-y-3">
          {porCategoria.map(({ cat, total: v }) => {
            const c = CATEGORIAS[cat];
            const pct = Math.round((v / maxCat) * 100);
            return (
              <div key={cat}>
                <div className="flex justify-between text-xs mb-1">
                  <span>
                    {c.emoji} {c.label}
                  </span>
                  <span className="font-medium">{brl(v)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-${c.color}`}
                    style={{ width: `${pct}%`, backgroundColor: `var(--${c.color})` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-sm">Próximos vencimentos</h2>
          <Link to="/vencimentos" className="text-xs text-primary font-medium">
            Ver todos
          </Link>
        </div>
        {proximos.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-6 text-center text-sm text-muted-foreground">
            Nenhum vencimento em aberto 🎉
          </div>
        ) : (
          <div className="space-y-2">
            {proximos.map((p) => {
              const st = statusVencimento(p.vencimento, p.pago);
              return (
                <div key={p.id} className="rounded-2xl bg-card border border-border p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {p.lancamentos?.descricao ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.lancamentos?.fornecedor ?? "Sem fornecedor"} · {dataBR(p.vencimento)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm">{brl(p.valor)}</div>
                    <div
                      className={`text-[10px] mt-0.5 ${
                        st.tone === "vencido"
                          ? "text-destructive"
                          : st.tone === "hoje"
                            ? "text-warning"
                            : "text-muted-foreground"
                      }`}
                    >
                      {st.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </AppLayout>
  );
}

function KPI({
  icon,
  label,
  valor,
  tone,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string;
  tone: "warning" | "success" | "destructive";
  badge?: number;
}) {
  const bg =
    tone === "warning"
      ? "bg-warning/15 text-warning"
      : tone === "success"
        ? "bg-success/15 text-success"
        : "bg-destructive/15 text-destructive";
  return (
    <div className="rounded-2xl bg-card border border-border p-3 relative">
      <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${bg}`}>
        {icon} {label}
      </div>
      <div className="text-sm font-bold mt-2 tabular-nums">{valor}</div>
      {badge != null && (
        <span className="absolute top-2 right-2 min-w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
          {badge}
        </span>
      )}
    </div>
  );
}
