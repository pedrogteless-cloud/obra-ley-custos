import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { AppLayout } from "@/components/AppLayout";
import { addDias, brl, CATEGORIAS, dataBR, hoje, type Categoria } from "@/lib/format";
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
  const [lendoNota, setLendoNota] = useState(false);
  const [parcelado, setParcelado] = useState(false);
  const [parcelasManuais, setParcelasManuais] = useState<{ vencimento: string; valor: string }[]>(
    [],
  );
  const [genN, setGenN] = useState(3);
  const [genIntervalo, setGenIntervalo] = useState(30);

  async function comprimirImagem(file: File, maxDim = 1600, quality = 0.75): Promise<string> {
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = () => rej(r.error);
      r.readAsDataURL(file);
    });
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Falha ao carregar imagem"));
      i.src = dataUrl;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  }

  async function onComprovanteChange(file: File | null) {
    setComprovante(file);
    if (!file) return;
    setLendoNota(true);
    try {
      const b64 = await comprimirImagem(file);
      const r = await fetch("/api/public/ler-nota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: b64 }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        toast.error(j.error || "Não foi possível ler a nota");
        return;
      }
      const d = j.dados || {};
      if (d.categoria && ["material", "mao_obra", "equipamento"].includes(d.categoria))
        setCategoria(d.categoria);
      if (d.descricao) setDescricao(String(d.descricao));
      if (d.fornecedor) setFornecedor(String(d.fornecedor));
      if (d.subcategoria) setSubcategoria(String(d.subcategoria));
      if (d.valor != null) setValor(String(d.valor).replace(".", ","));
      if (d.quantidade != null) setQuantidade(String(d.quantidade).replace(".", ","));
      if (d.unidade) setUnidade(String(d.unidade));
      if (d.data && /^\d{4}-\d{2}-\d{2}$/.test(d.data)) setData(d.data);

      const parcs = Array.isArray(d.parcelas) ? d.parcelas : [];
      if (d.condicao_pagamento === "parcelado" || parcs.length >= 2) {
        setParcelado(true);
        setParcelasManuais(
          parcs
            .filter((p: { vencimento?: string | null }) => p && p.vencimento)
            .map((p: { vencimento: string; valor: number | null }) => ({
              vencimento: p.vencimento,
              valor: p.valor != null ? String(p.valor).replace(".", ",") : "",
            })),
        );
      } else {
        setParcelado(false);
      }
      toast.success("Nota lida! Confira os campos antes de salvar.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao ler a nota");
    } finally {
      setLendoNota(false);
    }
  }


  const valorNum = Number(valor.replace(",", ".")) || 0;

  const parcelasCalculadas = useMemo(() => {
    if (!parcelado) {
      return [{ numero: 1, valor: valorNum, vencimento: data }];
    }
    return parcelasManuais.map((p, i) => ({
      numero: i + 1,
      valor: Number(p.valor.replace(",", ".")) || 0,
      vencimento: p.vencimento,
    }));
  }, [parcelado, valorNum, parcelasManuais, data]);

  const somaParcelas = useMemo(
    () => parcelasCalculadas.reduce((s, p) => s + (p.valor || 0), 0),
    [parcelasCalculadas],
  );
  const somaDivergente = parcelado && Math.abs(somaParcelas - valorNum) > 0.01;

  function gerarParcelas() {
    const n = Math.max(1, Math.floor(genN) || 1);
    const base = Math.floor((valorNum * 100) / n) / 100;
    const resto = Math.round((valorNum - base * n) * 100) / 100;
    setParcelasManuais(
      Array.from({ length: n }, (_, i) => ({
        vencimento: addDias(data, (i + 1) * genIntervalo),
        valor: String((i === 0 ? base + resto : base).toFixed(2)).replace(".", ","),
      })),
    );
  }

  const salvar = useMutation({
    mutationFn: async () => {
      if (!perfil) throw new Error("Sem perfil");
      if (!descricao.trim()) throw new Error("Descrição é obrigatória");
      if (valorNum <= 0) throw new Error("Valor deve ser maior que zero");
      if (parcelado) {
        if (parcelasCalculadas.length === 0) throw new Error("Adicione ao menos uma parcela");
        for (const p of parcelasCalculadas) {
          if (!p.vencimento) throw new Error("Toda parcela precisa ter vencimento");
          if (!(p.valor > 0)) throw new Error("Toda parcela precisa ter valor maior que zero");
        }
      }

      let comprovante_url: string | null = null;
      if (comprovante) {
        const ext = comprovante.name.split(".").pop() || "jpg";
        const path = `${data}/${crypto.randomUUID()}.${ext}`;
        const up = await db.storage.from("comprovantes").upload(path, comprovante, {
          contentType: comprovante.type,
        });
        if (up.error) throw up.error;
        comprovante_url = path;
      }


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
          <label
            className={`flex items-center gap-3 rounded-xl border-2 border-dashed border-border bg-card p-3 ${lendoNota ? "opacity-70 cursor-wait" : "cursor-pointer"}`}
          >
            {lendoNota ? (
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            ) : (
              <Camera className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground flex-1 truncate">
              {lendoNota
                ? "Lendo a nota com IA..."
                : comprovante
                  ? comprovante.name
                  : "Tirar foto ou escolher arquivo"}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={lendoNota}
              onChange={(e) => onComprovanteChange(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
          <div className="text-[11px] text-muted-foreground mt-1 px-1">
            Tire a foto da nota e a IA preenche os campos automaticamente.
          </div>
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
