# IDEAForge

**Transforme escolhas em ideias.**

IDEAForge é um SaaS de criação de projetos guiada por perguntas. O visitante escolhe uma categoria, responde de 8 a 18 perguntas adaptativas e recebe um projeto completo — conceito, público, mecânicas, roadmap, riscos e próximos passos.

> **Não há IA neste produto.** Não existe modelo de linguagem, API de IA, prompt de sistema, chave de terceiros ou geração probabilística. Todo resultado é montado por um motor determinístico em `/src/lib/generator`, a partir de bancos de conteúdo escritos à mão, regras de coerência, templates de frase e um RNG com semente.

---

## Stack

| Camada | Tecnologia |
| --- | --- |
| App | Next.js 15 (App Router) + React 19 + TypeScript |
| Estilo | Tailwind CSS 3 + CSS próprio (dark premium, violeta/azul) |
| Banco/Auth | Supabase Postgres + Supabase Auth (SSR, cookies) |
| Deploy | Vercel |
| Testes | Vitest |
| Geração | Motor determinístico próprio, sem dependências externas |

---

## Rodando localmente

```bash
npm install
cp .env.example .env.local     # preencha os valores
npm run dev                    # http://localhost:3000
```

Scripts:

```bash
npm run lint        # ESLint (next/core-web-vitals)
npm run typecheck   # tsc --noEmit
npm run test        # Vitest (79 testes)
npm run build       # build de produção (postbuild popula o catálogo)
npm run start       # servidor de produção
npm run diversity   # relatório de diversidade do motor
```

Requisitos: Node 20+ e um projeto Supabase.

---

## Variáveis de ambiente

| Variável | Onde | Para que serve |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | pública | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | pública | chave publishable/anon (respeita RLS) |
| `SUPABASE_SECRET_KEY` | **server-only** | service role; escritas confiáveis, RPCs, admin |
| `NEXT_PUBLIC_SITE_URL` | pública | canonical, sitemap, OG, redirects de auth |
| `PAYMENT_PROVIDER` | server | `mock` ou `none` |
| `MOCK_PAYMENT_MODE` | server | habilita a ativação simulada |
| `PAYMENT_WEBHOOK_SECRET` | server | usado por um gateway real; inerte no mock |
| `IP_HASH_SALT` | server | sal do hash de IP dos visitantes |
| `SEED_STRICT` | build | `1` faz o seed falhar o build |

Em produção na Vercel, `NEXT_PUBLIC_SITE_URL` pode ficar vazia: o app usa `VERCEL_PROJECT_PRODUCTION_URL` automaticamente. Nunca coloque `SUPABASE_SECRET_KEY` em variável `NEXT_PUBLIC_*` nem no cliente.

---

## Banco de dados

As migrações ficam em `supabase/migrations` e devem ser aplicadas em ordem:

1. `20261019000001_init.sql` — schema completo, índices, triggers, RPCs e RLS.
2. `20261019000002_bonus_and_share_rls.sql` — créditos extras de packs, `revoked_at` em entitlements e leitura de shares para o dono/galeria pública.

Aplicação via Supabase CLI:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Ou cole o conteúdo de cada arquivo no SQL Editor do painel, na ordem acima.

### Tabelas

- **Conta/negócio**: `profiles`, `subscriptions`, `entitlements`, `payment_events`, `usage_daily`, `guest_usage`, `referrals`.
- **Produto**: `generations`, `shared_results`, `generation_history`.
- **CMS do motor**: `categories`, `question_sets`, `questions`, `question_options`, `generation_templates`, `content_items`, `generation_rules`.
- **Gamificação**: `daily_challenges`, `user_challenges`, `user_achievements`, `xp_events`.
- **Operação**: `analytics_events`.

Todas usam UUID (ou chaves naturais estáveis), timestamps e FKs. Há índices para leitura por usuário, categoria, público e fingerprint.

### RLS (resumo)

- `profiles`: leitura do próprio perfil (ou admin); update apenas de `display_name`, `avatar_url`, `username` por grant de coluna.
- `generations`: leitura apenas do dono; escrita exclusiva do service role. Resultado público é servido por rota de servidor sanitizada.
- `shared_results`: leitura do dono ou quando o projeto é público; escrita server-only.
- `entitlements`, `subscriptions`, `payment_events`, `usage_daily`, `generation_history`, `xp_events`, `user_achievements`, `user_challenges`: leitura do dono; nenhuma escrita pelo cliente.
- `guest_usage`: nenhum acesso de `anon`/`authenticated`.
- Catálogo (`plans`, `packs`, `categories`, `questions`, `content_items`, `generation_rules`, `daily_challenges`, etc.): leitura pública, escrita apenas admin.
- RPCs de consumo/XP/streak têm `execute` revogado de `anon`/`authenticated`; apenas `service_role` executa.

O cliente nunca decide limite, passe, XP ou propriedade de projeto. Tudo é recalculado no servidor a partir do banco.

### Popular o catálogo

O `postbuild` executa `scripts/seed.ts` com a service role. O seed é idempotente e espelha `src/content` + `src/config` nas tabelas de sistema. Para rodar manualmente:

```bash
set -a && source .env.local && set +a
npx tsx scripts/seed.ts
```

Ele cria planos, packs, categorias, question sets, perguntas, opções, itens de conteúdo, regras, templates e 14 dias de desafios diários.

### Tornar uma conta administradora

Após criar a conta pelo app:

```sql
update public.profiles set role = 'admin' where id = '<uuid-do-usuario>';
```

A área `/admin` valida o papel no servidor e no middleware.

---

## Autenticação

Supabase Auth com `@supabase/ssr`:

- login por e-mail/senha, cadastro, logout e recuperação de senha;
- sessão persistente em cookies httpOnly, renovada pelo middleware (`src/middleware.ts`);
- callback PKCE em `/auth/callback` (confirmação de e-mail e recovery);
- rotas `/dashboard` e `/admin` protegidas pelo middleware e por checagem de servidor.

No painel Supabase → Authentication → URL Configuration, configure:

- **Site URL**: a URL pública do deploy;
- **Redirect URLs**: `https://SEU-DOMINIO/auth/callback` e `http://localhost:3000/auth/callback`.

> Com confirmação de e-mail ligada (padrão), o usuário precisa confirmar o endereço antes do primeiro login. O projeto criado como visitante é vinculado à conta automaticamente quando o usuário volta autenticado, ou pelo botão “Vincular à minha conta”.

---

## O motor determinístico

Pasta: `src/lib/generator`.

| Módulo | Responsabilidade |
| --- | --- |
| `engine.ts` | orquestra validação, regras, composição e checagem final |
| `questions.ts` | resolve o fluxo adaptativo (8–18 perguntas), condicionais e labels |
| `randomizer.ts` | hash FNV + RNG mulberry32, seleção ponderada, shuffle |
| `rules.ts` | tags das respostas → boosts e proibições |
| `templates.ts` | frames de frase e conectores humanos |
| `combiner.ts` | escolhe conteúdo, preenche tokens e monta as seções |
| `validators.ts` | valida respostas e rejeita saídas incompletas/vazadas |
| `remixer.ts` | quatro modos de remix |

`generateProject({ category, answers, seed })` é puro e reproduzível: mesma categoria + mesmas respostas + mesma seed = mesmo projeto. A seed aparece no resultado (`Seed xxxx`) para auditoria.

### Perguntas

- 12 a 32 perguntas por categoria (dependendo da profundidade), com 5–12+ opções nas perguntas base.
- Fluxo de 8 a 18 perguntas por sessão, embaralhado por seed.
- Perguntas condicionais (`requires`, `excludes`, `followUps`) aparecem só quando fazem sentido.
- Multi-seleção com `min`/`max` e `conflicts`.
- Progresso “Pergunta X de Y” que cresce quando um follow-up é desbloqueado.

### Conteúdo e regras

Cada categoria tem bancos de conceito, público, features, mecânicas, progressão, monetização, destaques, riscos, próximos passos e roadmap. As regras usam tags para reforçar afinidades e proibir combinações incoerentes (ex.: um jogo cozy não recebe mecânicas de terror). O anti-repeat usa `generation_history` + `avoidNames`, e cada hash de fingerprint é único.

### Remix

- **Leve**: preserva gênero/plataforma/público e troca detalhes.
- **Completo**: mantém o gênero e reinventa o restante.
- **Aleatório**: ignora as respostas anteriores dentro da categoria.
- **Profissional**: preserva decisões centrais e adiciona uma camada de posicionamento.

Todo remix é salvo como novo projeto e herda a categoria — e portanto o passe já adquirido.

### Ferramentas (74 no total)

| Categoria | Ferramentas | Passe |
| --- | --- | --- |
| Games | 11 | `games_pass` |
| Business | 10 | `business_pass` |
| Apps | 9 | `apps_pass` |
| Creator | 9 | `creator_pass` |
| Study | 7 | `study_pass` |
| Career | 6 | `career_pass` |
| Coding | 9 | `coding_pass` |
| Creative | 7 | `creative_pass` |
| Ideas | 6 | `ideas_pass` |

Ferramentas especializadas (GDD, personagem, mundo, plano de estudo, quiz, arquitetura, calendário, roteiro, combinação de ideias etc.) usam questões extras e pools próprios.

---

## Planos, entitlements e uso

Fonte única de preços: `src/config/plans.ts`. Nenhum valor é escrito inline na UI.

- **Free**: 5 gerações, 1 remix, 3 shares por dia.
- **9 passes**: 60 gerações, 20 remixes, 40 shares por dia.
- **All Access**: 200 gerações, 100 remixes, 150 shares por dia.
- **Visitante**: 2 gerações por dia (limite por hash de IP).
- **Packs**: créditos extras via `usage_daily.bonus_*`.

O acesso é resolvido em `src/lib/access.ts` a partir de `entitlements` (com `expires_at` e `revoked_at`). O consumo é atômico na função SQL `consume_usage`, chamada apenas com service role. O browser não tem `insert/update` em `usage_daily`.

### Pagamentos — arquitetura, não cobrança

`src/lib/payments` define `PaymentProvider` com `createCheckout`, `handleWebhook`, `getSubscription` e `cancelSubscription`. O único provider implementado é `mock`, selecionado por `PAYMENT_PROVIDER=mock` + `MOCK_PAYMENT_MODE=true`.

- Nenhum cartão é pedido.
- O valor real cobrado é sempre R$ 0,00 e a UI diz “simulação”.
- `payment_events` registra o evento com `simulated: true`.
- O webhook responde `501` quando não há gateway conectado.
- Para plugar Stripe/Pagar.me/etc., implemente `PaymentProvider` e registre em `src/lib/payments/index.ts`; nenhuma página precisa mudar.

---

## Gamificação

`src/config/gamification.ts` define XP, níveis e badges. Tudo é aplicado no servidor em `src/lib/gamification.ts`:

- +10 criar, +5 remixar, +10 compartilhar, +25 desafio diário, +15 bônus do primeiro projeto.
- Níveis: Explorer → Creator → Builder → Innovator → Visionary.
- Streak diário com `touch_streak`.
- Badges persistidas em `user_achievements`.
- Contadores em `xp_events`; o cliente não escreve XP.

---

## Rotas principais

| Rota | Descrição |
| --- | --- |
| `/` | landing com hero, categorias, como funciona, passes |
| `/[category]` | vitrine da categoria e das ferramentas |
| `/[category]/forge` | fluxo adaptativo |
| `/result/[id]` | resultado privado (dono/visitante com token) |
| `/share/[slug]` | página pública, OG e CTA |
| `/discover` | galeria pública com filtros e ordenação |
| `/pricing` | passes, packs, FAQ, aviso de simulação |
| `/dashboard` | perfil, XP, streak, uso, desafio, projetos, badges |
| `/dashboard/passes` | entitlements, assinatura, eventos |
| `/dashboard/settings` | nome, usuário e avatar |
| `/auth/*` | login, cadastro, recuperação, reset, callback, logout |
| `/admin` | área restrita (papel `admin`) |
| `/api/flow` · `/api/generate` · `/api/remix` · `/api/share` · `/api/claim` | fluxo e ações server-side |
| `/api/payments/*` | checkout, webhook e confirmação simulada |

`/api/og` gera imagens Open Graph 1200×630. `sitemap.xml` e `robots.txt` são gerados pelo App Router.

---

## Deploy na Vercel

1. Importe o repositório no projeto Vercel existente (não crie um duplicado).
2. Configure as variáveis de ambiente da tabela acima em Production/Preview/Development.
3. Build command `npm run build`; framework Next.js; região `iad1`.
4. O `postbuild` popula o catálogo no Supabase.
5. Após o deploy, copie a URL de produção para `NEXT_PUBLIC_SITE_URL` e para as Redirect URLs do Supabase (ou deixe o fallback automático da Vercel).
6. Faça um smoke test: landing → fluxo → resultado → login → painel → share → discover → pricing → ativação mock.

### Domínio

O app funciona na URL `*.vercel.app`. Para um domínio próprio:

1. adicione o domínio no projeto Vercel;
2. aponte o DNS conforme instruído pela Vercel;
3. defina `NEXT_PUBLIC_SITE_URL=https://seu-dominio`;
4. adicione `https://seu-dominio/auth/callback` nas Redirect URLs do Supabase;
5. redeploy.

Nenhum domínio é inventado ou pré-configurado neste repositório.

---

## Testes

```bash
npm run test
```

Cobertura atual (79 testes):

- `randomizer`: determinismo, pesos, shuffle, clamp;
- `rules`: acúmulo de boosts, proibições, afinidade;
- `questions`: 9 categorias, 8–18 perguntas, ordem variável, follow-ups condicionais, validação, ferramentas, opções ricas;
- `engine`: geração sem/com respostas, determinismo, seed, filtragem, todas as ferramentas, anti-repetição, remix, honestidade do Business;
- `validators`: conflitos, min/max, respostas fora do fluxo, features duplicadas;
- `diversity`: 1.080 projetos, fingerprints únicos, zero placeholders vazados, nomes distintos;
- `config`: passes, limites, preços, packs, XP, níveis e badges.

O teste de estresse (`scripts/stress.ts`) roda 2.250 gerações e valida todas as saídas.

---

## Segurança e limites conhecidos

- Chaves de serviço ficam apenas em runtime de servidor. `.env.local` é ignorado pelo Git.
- Projetos privados não são acessíveis por id sem sessão ou token de visitante (hash SHA-256 no banco, cookie httpOnly).
- Resultados públicos não expõem `user_id`, e-mail ou qualquer dado de conta.
- Rate limit em memória complementa os limites em Postgres (útil contra rajadas; não substitui um WAF).
- A confirmação de e-mail depende da configuração do Supabase; sem ela, contas novas entram direto.
- Pagamentos estão em modo de simulação até um gateway real ser conectado.

Veja `CHECKLIST.md` para o estado de entrega item a item.
