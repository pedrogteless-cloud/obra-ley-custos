import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { db } from "@/lib/db";
import { AppLayout } from "@/components/AppLayout";
import { brl, dataBR, FORMAS_PAGAMENTO } from "@/lib/format";
import { usePerfil } from "@/lib/perfil";
import { toast } from "sonner";

export const Route = createFileRoute("/ordens")({
  component: Ordens,
});

type Status = "pendente" | "aprovada" | "paga";
type Ordem = {
  id: string;
  parcela_id: string;
  data_pagamento: string;
  valor: number;
  fornecedor: string | null;
  forma_pagamento: string | null;
  status: Status;
  aprovado_por: string | null;
  parcelas: {
    numero: number;
    lancamentos: { descricao: string } | null;
  } | null;
};

const FILTROS: { key: Status | "todas"; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "pendente", label: "Pendentes" },
  { key: "aprovada", label: "Aprovadas" },
  { key: "paga", label: "Pagas" },
];

function Ordens() {
  const { perfil } = usePerfil();
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<Status | "todas">("todas");

  const { data: ordens = [] } = useQuery({
    queryKey: ["ordens"],
    queryFn: async () => {
      const { data, error } = await db
        .from("ordens_pagamento")
        .select("*, parcelas(numero, lancamentos(descricao))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Ordem[];
    },
  });

  const filtradas = ordens.filter((o) => filtro === "todas" || o.status === filtro);

  const totais = {
    pendente: ordens.filter((o) => o.status === "pendente").length,
    aprovada: ordens.filter((o) => o.status === "aprovada").length,
    paga: ordens.filter((o) => o.status === "paga").length,
  };

  const setForma = useMutation({
    mutationFn: async ({ id, forma }: { id: string; forma: string }) => {
      const { error } = await db.from("ordens_pagamento").update({ forma_pagamento: forma }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ordens"] }),
  });

  const aprovar = useMutation({
    mutationFn: async (o: Ordem) => {
      const { error } = await db
        .from("ordens_pagamento")
        .update({ status: "aprovada", aprovado_por: perfil })
        .eq("id", o.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Ordem aprovada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const marcarPaga = useMutation({
    mutationFn: async (o: Ordem) => {
      const { error } = await db
        .from("ordens_pagamento")
        .update({ status: "paga" })
        .eq("id", o.id);
      if (error) throw error;
      const { error: e2 } = await db.from("parcelas").update({ pago: true }).eq("id", o.parcela_id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Pagamento registrado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppLayout titulo="Ordens de pagamento" subtitulo="Para o financeiro">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <ResumoCard label="Pendentes" valor={totais.pendente} tone="warning" />
        <ResumoCard label="Aprovadas" valor={totais.aprovada} tone="primary" />
        <ResumoCard label="Pagas" valor={totais.paga} tone="success" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-4 px-4">
        {FILTROS.map((f) => {
          const ativo = filtro === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`shrink-0 px-3 h-8 rounded-full text-xs font-medium transition ${
                ativo ? "bg-primary text-primary-foreground" : "bg-card border border-border"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {filtradas.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border p-8 text-center text-sm text-muted-foreground">
          Nenhuma ordem encontrada
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map((o) => (
            <div key={o.id} className="rounded-2xl bg-card border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">
                    {o.parcelas?.lancamentos?.descricao ?? "—"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {o.fornecedor ?? "Sem fornecedor"} · Parc. {o.parcelas?.numero ?? "?"}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Vencimento: {dataBR(o.data_pagamento)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold">{brl(o.valor)}</div>
                  <StatusBadge status={o.status} />
                </div>
              </div>

              {o.status !== "paga" && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {FORMAS_PAGAMENTO.map((f) => (
                    <button
                      key={f}
                      onClick={() => setForma.mutate({ id: o.id, forma: f })}
                      className={`px-2.5 h-7 rounded-full text-[11px] font-medium transition capitalize ${
                        o.forma_pagamento === f
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
              {o.status === "paga" && o.forma_pagamento && (
                <div className="mt-2 text-xs text-muted-foreground capitalize">
                  Forma: {o.forma_pagamento}
                </div>
              )}
              {o.aprovado_por && o.status !== "pendente" && (
                <div className="text-[11px] text-muted-foreground mt-1">
                  Aprovada por {o.aprovado_por}
                </div>
              )}

              <div className="flex gap-2 mt-3">
                {o.status === "pendente" && (
                  <button
                    onClick={() => aprovar.mutate(o)}
                    className="flex-1 h-9 rounded-xl text-xs font-semibold bg-primary/10 text-primary"
                  >
                    Aprovar
                  </button>
                )}
                {o.status !== "paga" && (
                  <button
                    onClick={() => marcarPaga.mutate(o)}
                    className="flex-1 h-9 rounded-xl text-xs font-semibold bg-success text-success-foreground"
                  >
                    Marcar paga
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

function ResumoCard({ label, valor, tone }: { label: string; valor: number; tone: "warning" | "primary" | "success" }) {
  const cls =
    tone === "warning"
      ? "bg-warning/15 text-warning"
      : tone === "success"
        ? "bg-success/15 text-success"
        : "bg-primary/10 text-primary";
  return (
    <div className={`rounded-2xl p-3 ${cls}`}>
      <div className="text-2xl font-bold">{valor}</div>
      <div className="text-[11px] font-medium">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    pendente: "bg-warning/20 text-warning",
    aprovada: "bg-primary/15 text-primary",
    paga: "bg-success/20 text-success",
  };
  return (
    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${map[status]}`}>
      {status}
    </span>
  );
}
