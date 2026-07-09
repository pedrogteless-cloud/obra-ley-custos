// Guarda dados extras do lançamento (se possui nota, forma de pagamento) dentro
// do campo `observacao`, sem exigir uma migração no banco. Um marcador invisível
// separa o texto digitado pelo usuário dos dados estruturados.

export type LancMeta = {
  possuiNota?: boolean;
  formaPagamento?: string;
};

const MARCADOR = "​§meta§";

export function empacotarObservacao(texto: string, meta: LancMeta): string | null {
  const limpo = texto.trim();
  const dados: LancMeta = {};
  if (meta.possuiNota === false) dados.possuiNota = false;
  if (meta.formaPagamento) dados.formaPagamento = meta.formaPagamento;
  if (Object.keys(dados).length === 0) return limpo || null;
  return `${limpo}${MARCADOR}${JSON.stringify(dados)}`;
}

export function desempacotarObservacao(bruto: string | null | undefined): {
  texto: string;
  meta: LancMeta;
} {
  if (!bruto) return { texto: "", meta: {} };
  const idx = bruto.indexOf(MARCADOR);
  if (idx === -1) return { texto: bruto, meta: {} };
  const texto = bruto.slice(0, idx);
  try {
    const meta = JSON.parse(bruto.slice(idx + MARCADOR.length)) as LancMeta;
    return { texto, meta };
  } catch {
    return { texto, meta: {} };
  }
}
