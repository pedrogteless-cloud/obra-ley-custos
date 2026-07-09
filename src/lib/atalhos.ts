import type { Categoria } from "./format";

export type Atalho = {
  id: string;
  emoji: string;
  label: string;
  categoria: Categoria;
  descricao: string;
  unidade: string;
};

const KEY = "custos_obra_atalhos";

const PADRAO: Atalho[] = [
  {
    id: "seed-retroescavadeira",
    emoji: "🚜",
    label: "Retroescavadeira",
    categoria: "equipamento",
    descricao: "Locação retroescavadeira",
    unidade: "diária",
  },
  {
    id: "seed-munck",
    emoji: "🏗️",
    label: "Munck",
    categoria: "equipamento",
    descricao: "Serviço de munck",
    unidade: "un",
  },
  {
    id: "seed-betoneira",
    emoji: "🌀",
    label: "Betoneira",
    categoria: "equipamento",
    descricao: "Locação betoneira",
    unidade: "diária",
  },
  {
    id: "seed-cacamba",
    emoji: "🪣",
    label: "Caçamba",
    categoria: "equipamento",
    descricao: "Caçamba de entulho",
    unidade: "un",
  },
  {
    id: "seed-guincho",
    emoji: "🚚",
    label: "Guincho",
    categoria: "equipamento",
    descricao: "Serviço de guincho",
    unidade: "un",
  },
  {
    id: "seed-diaria-pedreiro",
    emoji: "👷",
    label: "Diária pedreiro",
    categoria: "mao_obra",
    descricao: "Diária pedreiro",
    unidade: "diária",
  },
  {
    id: "seed-diaria-servente",
    emoji: "🧑‍🔧",
    label: "Diária servente",
    categoria: "mao_obra",
    descricao: "Diária servente",
    unidade: "diária",
  },
  {
    id: "seed-caminhao-pipa",
    emoji: "🛻",
    label: "Caminhão pipa",
    categoria: "equipamento",
    descricao: "Água - caminhão pipa",
    unidade: "un",
  },
];

export function getAtalhos(): Atalho[] {
  if (typeof window === "undefined") return PADRAO;
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    localStorage.setItem(KEY, JSON.stringify(PADRAO));
    return PADRAO;
  }
  try {
    const lista = JSON.parse(raw);
    return Array.isArray(lista) ? (lista as Atalho[]) : PADRAO;
  } catch {
    return PADRAO;
  }
}

export function salvarAtalhos(lista: Atalho[]) {
  localStorage.setItem(KEY, JSON.stringify(lista));
}
