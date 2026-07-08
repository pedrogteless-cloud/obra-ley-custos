import { useEffect, useState } from "react";

export type Perfil = "Pedro" | "Edson";

export const PERFIS: { nome: Perfil; pin: string; papel: string; emoji: string }[] = [
  { nome: "Pedro", pin: "2024", papel: "Gestor comercial", emoji: "📊" },
  { nome: "Edson", pin: "1010", papel: "Responsável pela obra", emoji: "🏗️" },
];

const KEY = "custos_obra_perfil";

export function getPerfil(): Perfil | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(KEY);
  return v === "Pedro" || v === "Edson" ? v : null;
}

export function setPerfil(p: Perfil) {
  localStorage.setItem(KEY, p);
}

export function limparPerfil() {
  localStorage.removeItem(KEY);
}

export function usePerfil() {
  const [perfil, set] = useState<Perfil | null>(null);
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    set(getPerfil());
    setPronto(true);
  }, []);
  return {
    perfil,
    pronto,
    entrar: (p: Perfil) => {
      setPerfil(p);
      set(p);
    },
    sair: () => {
      limparPerfil();
      set(null);
    },
  };
}
