import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { db } from "@/lib/db";
import { AppLayout } from "@/components/AppLayout";
import { brl, CATEGORIAS, dataBR, type Categoria } from "@/lib/format";
import { ComprovanteImg } from "@/components/ComprovanteImg";
import { Search } from "lucide-react";

export const Route = createFileRoute("/gastos")({
  component: Gastos,
});

type Lanc = {
  id: string;
  categoria: Categoria;
  descricao: string;
  fornecedor: string | null;
  valor: number;
  data: string;
  responsavel: string;
  comprovante_url: string | null;
  parcelas: { pago: boolean }[];
};

function Gastos() {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Categoria | "todas">("todas");

  const { data: lancs = [] } = useQuery({
    queryKey: ["gastos"],
    queryFn: async () => {
      const { data, error } = await db
        .from("lancamentos")
        .select("*, parcelas(pago)")
        .order("data", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Lanc[];
    },
  });

  const filtrado = lancs.filter((l) => {
    if (filtro !== "todas" && l.categoria !== filtro) return false;
    if (busca) {
      const q = busca.toLowerCase();
      return (
        l.descricao.toLowerCase().includes(q) ||
        (l.fornecedor ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <AppLayout titulo="Gastos" subtitulo={`${filtrado.length} lançamentos`}>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar descrição ou fornecedor"
          className="w-full h-11 pl-9 pr-3 rounded-xl bg-card border border-border text-sm"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-4 px-4">
        {(["todas", ...Object.keys(CATEGORIAS)] as Array<Categoria | "todas">).map((c) => {
          const ativo = filtro === c;
          const label = c === "todas" ? "Todas" : `${CATEGORIAS[c].emoji} ${CATEGORIAS[c].label}`;
          return (
            <button
              key={c}
              onClick={() => setFiltro(c)}
              className={`shrink-0 px-3 h-8 rounded-full text-xs font-medium transition ${
                ativo ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {filtrado.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border p-8 text-center text-sm text-muted-foreground">
          Nenhum lançamento encontrado
        </div>
      ) : (
        <div className="space-y-2">
          {filtrado.map((l) => {
            const cat = CATEGORIAS[l.categoria];
            const total = l.parcelas?.length ?? 0;
            const pagas = l.parcelas?.filter((p) => p.pago).length ?? 0;
            return (
              <div key={l.id} className="rounded-2xl bg-card border border-border p-3 flex gap-3">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0 overflow-hidden"
                  style={{ backgroundColor: `color-mix(in oklch, var(--${cat.color}) 15%, transparent)` }}
                >
                  {l.comprovante_url ? (
                    <ComprovanteImg path={l.comprovante_url} className="w-full h-full object-cover" />
                  ) : (
                    cat.emoji
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-semibold truncate">{l.descricao}</div>
                    <div className="text-sm font-bold shrink-0">{brl(l.valor)}</div>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {l.fornecedor ?? "Sem fornecedor"}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                    <span>{dataBR(l.data)}</span>
                    <span>·</span>
                    <span>{l.responsavel}</span>
                    {total > 0 && (
                      <>
                        <span>·</span>
                        <span className={pagas === total ? "text-success font-medium" : ""}>
                          {pagas}/{total} pagas
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
