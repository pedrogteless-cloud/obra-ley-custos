import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { db } from "@/lib/db";
import { AppLayout } from "@/components/AppLayout";
import { brl, CATEGORIAS, dataBR, statusVencimento, type Categoria } from "@/lib/format";
import { toast } from "sonner";
import { CheckCircle2, FilePlus } from "lucide-react";

export const Route = createFileRoute("/vencimentos")({
  component: Vencimentos,
});

type Parcela = {
  id: string;
  numero: number;
  valor: number;
  vencimento: string;
  pago: boolean;
  lancamento_id: string;
  lancamentos: { descricao: string; fornecedor: string | null; categoria: Categoria } | null;
};

const FILTROS = [
  { key: "aberto", label: "Em aberto" },
  { key: "vencidas", label: "Vencidas" },
  { key: "pagas", label: "Pagas" },
  { key: "todas", label: "Todas" },
] as const;
type Filtro = (typeof FILTROS)[number]["key"];

function Vencimentos() {
  const [filtro, setFiltro] = useState<Filtro>("aberto");
  const qc = useQueryClient();

  const { data: parcelas = [] } = useQuery({
    queryKey: ["parcelas-full"],
    queryFn: async () => {
      const { data, error } = await db
        .from("parcelas")
        .select("*, lancamentos(descricao, fornecedor, categoria)")
        .order("vencimento", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Parcela[];
    },
  });

  const hojeISO = new Date().toISOString().slice(0, 10);
  const filtrado = parcelas.filter((p) => {
    if (filtro === "pagas") return p.pago;
    if (filtro === "aberto") return !p.pago;
    if (filtro === "vencidas") return !p.pago && p.vencimento < hojeISO;
    return true;
  });

  const togglePago = useMutation({
    mutationFn: async (p: Parcela) => {
      const { error } = await db.from("parcelas").update({ pago: !p.pago }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Parcela atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const gerarOrdem = useMutation({
    mutationFn: async (p: Parcela) => {
      const { error } = await db.from("ordens_pagamento").insert({
        parcela_id: p.id,
        data_pagamento: p.vencimento,
        valor: p.valor,
        fornecedor: p.lancamentos?.fornecedor ?? null,
        status: "pendente",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Ordem gerada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppLayout titulo="Vencimentos" subtitulo="Duplicatas e parcelas">
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

      {filtrado.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border p-8 text-center text-sm text-muted-foreground">
          Nenhuma parcela nesse filtro
        </div>
      ) : (
        <div className="space-y-2">
          {filtrado.map((p) => {
            const st = statusVencimento(p.vencimento, p.pago);
            const cat = p.lancamentos ? CATEGORIAS[p.lancamentos.categoria] : null;
            return (
              <div key={p.id} className="rounded-2xl bg-card border border-border p-3">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{cat?.emoji ?? "💰"}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {p.lancamentos?.descricao ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.lancamentos?.fornecedor ?? "Sem fornecedor"} · Parc. {p.numero}
                    </div>
                    <div
                      className={`text-[11px] mt-1 font-medium ${
                        st.tone === "vencido"
                          ? "text-destructive"
                          : st.tone === "hoje"
                            ? "text-warning"
                            : st.tone === "pago"
                              ? "text-success"
                              : "text-muted-foreground"
                      }`}
                    >
                      {st.label}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-bold">{brl(p.valor)}</div>
                    <div className="text-[10px] text-muted-foreground">{dataBR(p.vencimento)}</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => togglePago.mutate(p)}
                    className={`flex-1 h-9 rounded-xl text-xs font-medium flex items-center justify-center gap-1 ${
                      p.pago
                        ? "bg-muted text-muted-foreground"
                        : "bg-success/15 text-success"
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {p.pago ? "Desmarcar pago" : "Marcar como pago"}
                  </button>
                  {!p.pago && (
                    <button
                      onClick={() => gerarOrdem.mutate(p)}
                      className="flex-1 h-9 rounded-xl text-xs font-medium bg-primary/10 text-primary flex items-center justify-center gap-1"
                    >
                      <FilePlus className="h-3.5 w-3.5" />
                      Gerar ordem
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
