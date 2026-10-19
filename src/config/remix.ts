import type { RemixMode } from "@/lib/generator/types";

export const REMIX_MODE_LIST: {
  mode: RemixMode;
  label: string;
  description: string;
  premium: boolean;
}[] = [
  {
    mode: "light",
    label: "Remix leve",
    description: "Mantém gênero, plataforma e público. Troca detalhes e conteúdo.",
    premium: false,
  },
  {
    mode: "full",
    label: "Remix completo",
    description: "Mantém apenas o gênero e reinventa o resto.",
    premium: false,
  },
  {
    mode: "random",
    label: "Remix aleatório",
    description: "Ignora as respostas anteriores e recomeça dentro da categoria.",
    premium: false,
  },
  {
    mode: "professional",
    label: "Remix profissional",
    description: "Mantém as decisões centrais e adiciona uma camada de posicionamento profissional.",
    premium: true,
  },
];
