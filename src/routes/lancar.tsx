import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { addMeses, brl, CATEGORIAS, dataBR, hoje, type Categoria } from "@/lib/format";
import { usePerfil } from "@/lib/perfil";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/lancar")({
  component: NovoLancamento,
});

function NovoLancamento() {
  const { perfil } = usePerfil();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [categoria, setCategoria] = useState<Categoria>("material");
  const [descricao, setDescricao] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [valor, setValor] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [unidade, setUnidade] = useState("");
  const [data, setData] = useState(hoje());
  const [observacao, setObservacao] = useState("");
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [parcelado, setParcelado] = useState(false);
  const [numParcelas, setNumParcelas] = useState(2);
  const [primeiroVenc, setPrimeiroVenc] = useState(hoje());

  const valorNum = Number(valor.replace(",", ".")) || 0;

  const previewParcelas = useMemo(() => {
    if (!parcelado) {
      return [{ numero: 1, valor: valorNum, vencimento: data }];
    }
    const base = Math.floor((valorNum * 100) / numParcelas) / 100;
    const resto = Math.round((valorNum - base * numParcelas) * 100) / 100;
    return Array.from({ length: numParcelas }, (_, i) => ({
      numero: i + 1,
      valor: i === 0 ? base + resto : base,
      vencimento: addMeses(primeiroVenc, i),
    }));
  }, [parcelado, valorNum, numParcelas, primeiroVenc, data]);

  const salvar = useMutation({
    mutationFn: async () => {
      if (!perfil) throw new Error("Sem perfil");
      if (!descricao.trim()) throw new Error("Descrição é obrigatória");
      if (valorNum <= 0) throw new Error("Valor deve ser maior que zero");

      let comprovante_url: string | null = null;
      if (comprovante) {
        const ext = comprovante.name.split(".").pop() || "jpg";
        const path = `${data}/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from("comprovantes").upload(path, comprovante, {
          contentType: comprovante.type,
        });
        if (up.error) throw up.error;
        comprovante_url = path;
      }

      const db = supabase as unknown as {
        from: (t: string) => {
          insert: (v: unknown) => {
            select: () => { single: () => Promise<{ data: { id: string } | null; error: Error | null }> };
          } & Promise<{ error: Error | null }>;
        };
      };

      const { data: lanc, error } = await db
        .from("lancamentos")
        .insert({
          categoria,
          descricao: descricao.trim(),
          fornecedor: fornecedor.trim() || null,
          subcategoria: subcategoria.trim() || null,
          valor: valorNum,
          quantidade: quantidade ? Number(quantidade.replace(",", ".")) : null,
          unidade: unidade.trim() || null,
          data,
          responsavel: perfil,
          comprovante_url,
          observacao: observacao.trim() || null,
        })
        .select()
        .single();
      if (error) throw error;

      const parcelas = previewParcelas.map((p) => ({
        lancamento_id: (lanc as { id: string }).id,
        numero: p.numero,
        valor: p.valor,
        vencimento: p.vencimento,
        pago: false,
      }));
      const { error: e2 } = await db.from("parcelas").insert(parcelas);
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Lançamento salvo!");
      navigate({ to: "/gastos" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cat = CATEGORIAS[categoria];

  return (
    <AppLayout titulo="Novo lançamento" subtitulo="Registrar gasto da obra">
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(CATEGORIAS) as Categoria[]).map((c) => {
          const info = CATEGORIAS[c];
          const ativo = categoria === c;
          return (
            <button
              key={c}
              onClick={() => setCategoria(c)}
              className={`rounded-2xl p-3 border-2 transition ${
                ativo ? "border-primary bg-primary/5" : "border-border bg-card"
              }`}
              style={ativo ? { borderColor: `var(--${info.color})`, backgroundColor: `color-mix(in oklch, var(--${info.color}) 12%, transparent)` } : undefined}
            >
              <div className="text-2xl">{info.emoji}</div>
              <div className="text-[11px] font-medium mt-1">{info.label}</div>
            </button>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          salvar.mutate();
        }}
        className="mt-4 space-y-3"
      >
        <Campo label="Descrição *">
          <input
            required
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex: Cimento CP-II 50kg"
            className="input"
          />
        </Campo>

        <div className="grid grid-cols-2 gap-3">
          <Campo label="Fornecedor">
            <input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} className="input" />
          </Campo>
          <Campo label="Subcategoria">
            <input value={subcategoria} onChange={(e) => setSubcategoria(e.target.value)} className="input" placeholder="opcional" />
          </Campo>
        </div>

        <Campo label="Valor total (R$) *">
          <input
            required
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
            className="input text-lg font-semibold"
          />
        </Campo>

        <div className="grid grid-cols-3 gap-3">
          <Campo label="Quantidade">
            <input inputMode="decimal" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="input" />
          </Campo>
          <Campo label="Unidade">
            <input value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="sc, m³..." className="input" />
          </Campo>
          <Campo label="Data *">
            <input required type="date" value={data} onChange={(e) => setData(e.target.value)} className="input" />
          </Campo>
        </div>

        <Campo label="Comprovante (foto)">
          <label className="flex items-center gap-3 rounded-xl border-2 border-dashed border-border bg-card p-3 cursor-pointer">
            <Camera className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground flex-1 truncate">
              {comprovante ? comprovante.name : "Tirar foto ou escolher arquivo"}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setComprovante(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
        </Campo>

        <div className="rounded-2xl border border-border bg-card p-3">
          <label className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Pagamento parcelado?</div>
              <div className="text-xs text-muted-foreground">Gera duplicatas mensais</div>
            </div>
            <input
              type="checkbox"
              checked={parcelado}
              onChange={(e) => setParcelado(e.target.checked)}
              className="h-6 w-11 appearance-none rounded-full bg-muted checked:bg-primary transition-all relative before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:h-5 before:w-5 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-5"
            />
          </label>

          {parcelado && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Campo label="Nº de parcelas">
                <input
                  type="number"
                  min={2}
                  max={36}
                  value={numParcelas}
                  onChange={(e) => setNumParcelas(Math.max(2, Number(e.target.value) || 2))}
                  className="input"
                />
              </Campo>
              <Campo label="1º vencimento">
                <input
                  type="date"
                  value={primeiroVenc}
                  onChange={(e) => setPrimeiroVenc(e.target.value)}
                  className="input"
                />
              </Campo>
            </div>
          )}

          {valorNum > 0 && (
            <div className="mt-3 rounded-xl bg-muted/50 p-2 space-y-1 max-h-40 overflow-auto">
              {previewParcelas.map((p) => (
                <div key={p.numero} className="flex justify-between text-xs">
                  <span>
                    {p.numero}/{previewParcelas.length} · {dataBR(p.vencimento)}
                  </span>
                  <span className="font-medium">{brl(p.valor)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <Campo label="Observação">
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={2}
            className="input resize-none"
          />
        </Campo>

        <button
          type="submit"
          disabled={salvar.isPending}
          className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {salvar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar {cat.emoji} {brl(valorNum)}
        </button>
      </form>

      <style>{`
        .input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border-radius: 0.75rem;
          background: var(--card);
          border: 1px solid var(--border);
          font-size: 0.9rem;
          outline: none;
        }
        .input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in oklch, var(--primary) 20%, transparent); }
      `}</style>
    </AppLayout>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}
