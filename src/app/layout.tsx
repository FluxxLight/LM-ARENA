import type { Metadata, Viewport } from "next";
import "@/styles.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { siteUrl } from "@/lib/env";

const description =
  "Responda perguntas e receba um projeto completo: jogos, negócios, apps, conteúdo, estudos, carreira, código, histórias e ideias. Motor determinístico, sem IA.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "IDEAForge — Transforme escolhas em ideias.",
    template: "%s · IDEAForge",
  },
  description,
  applicationName: "IDEAForge",
  keywords: [
    "gerador de ideias",
    "planejamento de projetos",
    "game design",
    "plano de negócios",
    "roteiro de conteúdo",
    "plano de estudos",
    "portfólio",
    "IDEAForge",
  ],
  authors: [{ name: "IDEAForge" }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "IDEAForge",
    title: "IDEAForge — Transforme escolhas em ideias.",
    description,
    url: "/",
    images: [
      {
        url: "/api/og?title=IDEAForge&subtitle=Transforme%20escolhas%20em%20ideias.",
        width: 1200,
        height: 630,
        alt: "IDEAForge — Transforme escolhas em ideias.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "IDEAForge — Transforme escolhas em ideias.",
    description,
    images: ["/api/og?title=IDEAForge&subtitle=Transforme%20escolhas%20em%20ideias."],
  },
  robots: { index: true, follow: true },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#07070b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen font-sans antialiased">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-violet-600 focus:px-4 focus:py-2"
        >
          Pular para o conteúdo
        </a>
        <SiteHeader />
        <main id="conteudo">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
