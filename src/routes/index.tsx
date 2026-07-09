import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { AppLayout } from "@/components/AppLayout";
import {
  addMeses,
  brl,
  CATEGORIAS,
  dataBR,
  hoje,
  statusVencimento,
  type Categoria,
} from "@/lib/format";
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
      return (data ?? []) as Array<{
        id: string;
        categoria: Categoria;
        valor: number;
        descricao: string;
        fornecedor: string | null;
        data: string;
      }>;
    },
  });
  const { data: parcelas = [] } = useQuery({
    queryKey: ["parcelas"],
    queryFn: async () => {
      const { data, error } = await db
        .from("parcelas")
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
  const hj = hoje();
  const vencidas = parcelas.filter((p) => !p.pago && p.vencimento < hj);
  const vencidoTotal = vencidas.reduce((s, p) => s + Number(p.valor), 0);

  const mesAtual = hj.slice(0, 7);
  const mesAnterior = addMeses(hj, -1).slice(0, 7);
  const totalMesAtual = lancamentos
    .filter((l) => l.data?.slice(0, 7) === mesAtual)
    .reduce((s, l) => s + Number(l.valor), 0);
  const totalMesAnterior = lancamentos
    .filter((l) => l.data?.slice(0, 7) === mesAnterior)
    .reduce((s, l) => s + Number(l.valor), 0);
  const variacaoMes =
    totalMesAnterior > 0
      ? Math.round(((totalMesAtual - totalMesAnterior) / totalMesAnterior) * 100)
      : null;

  const porCategoria = (Object.keys(CATEGORIAS) as Categoria[]).map((cat) => ({
    cat,
    total: lancamentos.filter((l) => l.categoria === cat).reduce((s, l) => s + Number(l.valor), 0),
  }));
  const maxCat = Math.max(1, ...porCategoria.map((c) => c.total));

  const proximos = parcelas.filter((p) => !p.pago).slice(0, 5);

  return (
    <AppLayout titulo="Painel" subtitulo="Obra Eusébio-CE">
      <div className="relative overflow-hidden rounded-3xl bg-primary-gradient text-primary-foreground p-6 shadow-primary-glow">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(140px 140px at 88% 8%, oklch(1 0 0 / 0.22), transparent 70%)",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-semibold opacity-90">
            <TrendingUp className="h-4 w-4" /> Total gasto na obra
          </div>
          <div className="text-4xl font-extrabold tracking-tight mt-2.5 tabular-nums">
            {brl(total)}
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs opacity-90">
            {variacaoMes !== null && (
              <span className="rounded-full bg-white/18 px-2.5 py-1 font-semibold backdrop-blur-sm">
                {variacaoMes >= 0 ? "↗" : "↘"} {Math.abs(variacaoMes)}% no mês
              </span>
            )}
            <span>{lancamentos.length} lançamentos</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <KPI
          icon={<Clock className="h-4 w-4" />}
          label="A pagar"
          valor={brl(aPagar)}
          tone="warning"
        />
        <KPI
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Já pago"
          valor={brl(jaPago)}
          tone="success"
        />
        <KPI
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Vencido"
          valor={brl(vencidoTotal)}
          badge={vencidas.length > 0 ? vencidas.length : undefined}
          tone="destructive"
        />
      </div>

      <section className="mt-5 rounded-2xl bg-card border border-border p-4 shadow-elev-sm">
        <h2 className="font-bold text-sm mb-4 tracking-tight">Gasto por categoria</h2>
        <div className="space-y-4">
          {porCategoria.map(({ cat, total: v }) => {
            const c = CATEGORIAS[cat];
            const pct = Math.round((v / maxCat) * 100);
            return (
              <div key={cat}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium flex items-center gap-1.5">
                    <span>{c.emoji}</span> {c.label}
                  </span>
                  <span className="font-bold tabular-nums">{brl(v)}</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
                    style={{ width: `${pct}%`, backgroundColor: `var(--${c.color})` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-5">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="font-bold text-sm tracking-tight">Próximos vencimentos</h2>
          <Link to="/vencimentos" className="text-xs text-primary font-semibold">
            Ver todos
          </Link>
        </div>
        {proximos.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-6 text-center text-sm text-muted-foreground shadow-elev-sm">
            Nenhum vencimento em aberto 🎉
          </div>
        ) : (
          <div className="rounded-2xl bg-card border border-border shadow-elev-sm divide-y divide-border">
            {proximos.map((p) => {
              const st = statusVencimento(p.vencimento, p.pago);
              const cat = p.lancamentos?.categoria;
              const c = cat ? CATEGORIAS[cat] : null;
              const pillCls =
                st.tone === "vencido"
                  ? "bg-destructive/10 text-destructive"
                  : st.tone === "hoje"
                    ? "bg-warning/15 text-warning"
                    : "bg-primary/10 text-primary";
              return (
                <div key={p.id} className="p-3.5 flex items-center gap-3">
                  <div
                    className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-lg"
                    style={{
                      backgroundColor: c
                        ? `color-mix(in oklch, var(--${c.color}) 16%, white)`
                        : undefined,
                    }}
                  >
                    {c?.emoji ?? "📄"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-semibold truncate">
                      {p.lancamentos?.descricao ?? "—"}
                    </div>
                    <div className="text-[11.5px] text-muted-foreground truncate mt-0.5">
                      {p.lancamentos?.fornecedor ?? "Sem fornecedor"} · {dataBR(p.vencimento)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-[13.5px] tabular-nums">{brl(p.valor)}</div>
                    <span
                      className={`inline-block mt-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full ${pillCls}`}
                    >
                      {st.label}
                    </span>
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
    <div className="rounded-2xl bg-card border border-border p-3.5 relative shadow-elev-sm">
      <div className={`h-8 w-8 rounded-[10px] flex items-center justify-center mb-2.5 ${bg}`}>
        {icon}
      </div>
      <div className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
      <div className="text-[15px] font-extrabold mt-1 tracking-tight tabular-nums">{valor}</div>
      {badge != null && (
        <span className="absolute top-2.5 right-2.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
          {badge}
        </span>
      )}
    </div>
  );
}
