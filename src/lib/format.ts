export const CATEGORIAS = {
  material: { label: "Material", emoji: "🧱", color: "material" },
  mao_obra: { label: "Mão de obra", emoji: "👷", color: "mao-obra" },
  equipamento: { label: "Equipamento", emoji: "🚜", color: "equipamento" },
} as const;

export type Categoria = keyof typeof CATEGORIAS;

export const FORMAS_PAGAMENTO = ["pix", "boleto", "transferência", "dinheiro", "cartão"] as const;

export function brl(v: number | string | null | undefined): string {
  const n = typeof v === "string" ? Number(v) : (v ?? 0);
  return (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function dataBR(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d + (d.length === 10 ? "T00:00:00" : "")) : d;
  return date.toLocaleDateString("pt-BR");
}

export function hoje(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

export function addMeses(dataISO: string, meses: number): string {
  const [y, m, d] = dataISO.split("-").map(Number);
  const date = new Date(y, m - 1 + meses, d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addDias(dataISO: string, dias: number): string {
  const [y, m, d] = dataISO.split("-").map(Number);
  const date = new Date(y, m - 1, d + dias);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function statusVencimento(vencimento: string, pago: boolean): {
  label: string;
  tone: "pago" | "hoje" | "futuro" | "vencido";
} {
  if (pago) return { label: "Pago", tone: "pago" };
  const h = hoje();
  if (vencimento === h) return { label: "Vence hoje", tone: "hoje" };
  if (vencimento < h) return { label: `Venceu ${dataBR(vencimento)}`, tone: "vencido" };
  return { label: `Vence ${dataBR(vencimento)}`, tone: "futuro" };
}
