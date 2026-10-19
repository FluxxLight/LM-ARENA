# Checklist de entrega — IDEAForge

Atualizado em 2026-10-19.

## Produto e fluxo
- [x] Landing com hero “IDEAForge — Transforme escolhas em ideias.” e CTA “COMEÇAR AGORA”
- [x] 9 categorias com 74 ferramentas
- [x] Fluxo adaptativo de 8–18 perguntas com “Pergunta X de Y”
- [x] Multi-seleção, condicionais, follow-ups e ordem variável por seed
- [x] Geração determinística, sem IA
- [x] Resultado completo (conceito, público, features, mecânica, progressão, monetização, roadmap, riscos, próximos passos)
- [x] Remix LEVE / COMPLETO / ALEATÓRIO / PROFISSIONAL
- [x] Compartilhamento com slug público e cópia de texto/link/WhatsApp
- [x] Descobrir com filtros de categoria e ordenação (recentes, mais vistos, em alta)
- [x] Painel com nome, avatar, XP, streak, uso diário, passes, projetos, desafio e badges
- [x] Desafio diário com XP no servidor
- [x] Download/cópia do resultado

## Contas
- [x] Cadastro, login, logout e sessão persistente (SSR cookies)
- [x] Recuperação e redefinição de senha
- [x] Vinculação de projeto de visitante à conta (token + cookie httpOnly)
- [x] Configurações de perfil
- [x] Admin protegido por papel no middleware e no servidor

## Banco e segurança
- [x] Migrações versionadas em `supabase/migrations`
- [x] 24 tabelas com UUID, FKs, índices e constraints
- [x] RLS em todas as tabelas
- [x] Escrita de uso/XP/entitlements apenas via service role
- [x] Projetos privados inacessíveis sem dono/token
- [x] Resultado público sem dados pessoais
- [x] Catálogo público somente leitura

## Monetização
- [x] 9 passes + All Access + 3 packs
- [x] Preços centralizados em `src/config/plans.ts`
- [x] Entitlements com expiração/revogação
- [x] Limites diários aplicados no servidor
- [x] Camada `PaymentProvider` com checkout, webhook, assinatura e cancelamento
- [x] Mock explicitamente identificado; nenhuma cobrança real
- [x] Webhook responde 501 sem gateway conectado

## SEO e design
- [x] Metadata por página, canonical, Open Graph e Twitter
- [x] OG dinâmico em `/api/og`
- [x] Sitemap dinâmico e robots
- [x] Favicon/ícone
- [x] Dark premium, violeta/azul, animações, responsivo
- [x] Acessibilidade básica (skip link, aria, foco visível, reduced motion)

## Qualidade
- [x] `npm install`
- [x] `npm run lint` sem erros
- [x] `npm run typecheck` sem erros
- [x] `npm run build` sem erros
- [x] 79 testes Vitest passando
- [x] Estresse de 2.250 gerações sem inválidos
- [x] README completo

## Infra
- [x] Projeto Supabase criado e migrações aplicadas
- [x] Projeto Vercel `ideaforge` reutilizado (sem duplicata)
- [x] Variáveis de ambiente configuradas na Vercel
- [ ] Deploy de produção + smoke test pós-deploy
- [ ] Redirect URLs do Supabase apontando para a URL final
