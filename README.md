<div align="center">

# EBD — Sistema de Gestão de Escola Bíblica Dominical

Sistema web completo para gestão de Escola Bíblica Dominical (EBD): chamada, alunos, professores, turmas, escala e relatórios. Desenvolvido com foco em **mobile-first** — funciona plenamente em celulares sem scroll horizontal.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## Sumário

- [Funcionalidades](#funcionalidades)
- [Stack](#stack)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
  - [1. Clone o repositório](#1-clone-o-repositório)
  - [2. Instale as dependências](#2-instale-as-dependências)
  - [3. Configure o banco de dados](#3-configure-o-banco-de-dados)
  - [4. Configure as variáveis de ambiente](#4-configure-as-variáveis-de-ambiente)
  - [5. Crie o primeiro usuário admin](#5-crie-o-primeiro-usuário-admin)
  - [6. Execute localmente](#6-execute-localmente)
- [Autenticação e Permissões](#autenticação-e-permissões)
- [Deploy na Vercel](#deploy-na-vercel)
- [Estrutura do Banco de Dados](#estrutura-do-banco-de-dados)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Scripts](#scripts)
- [Logging](#logging)
- [Segurança (RLS)](#segurança-rls)
- [Responsividade Mobile](#responsividade-mobile)
- [Licença](#licença)

---

## Funcionalidades

| Módulo | Descrição |
|---|---|
| **Dashboard** | KPIs compactos (mobile 2×2 / desktop 4 cards), gráfico de evolução de presença, presença por sala, top 10 alunos com badge de cargo eclesiástico, destaques por turma e histórico recente com tempo relativo (chamadas + visitantes) |
| **Chamada** | Registro de presença por domingo com controle de bíblias, revistas, ofertas e visitantes; resumo geral compacto no mobile; skeleton de carregamento; botão "Salvar" fixo no rodapé do mobile; salvamento robusto com upsert separado do select e inserts de visitantes em paralelo |
| **Alunos** | CRUD completo com histórico de frequência; lista mobile em cards com presença, turma, idade e contato |
| **Professores** | Cadastro e vínculo com turmas; sincronização automática como aluno; lista mobile em cards com cargo, turmas e contato |
| **Turmas** | Criação e gerenciamento de salas com faixas etárias (Cordeirinhos → Adultos) |
| **Escala** | Planejamento de professores por domingo |
| **Relatórios** | Estatísticas por dia, mês, trimestre e ano; filtro por turma e período; seções: resumo KPIs, gráfico de evolução, presença por sala, alunos da turma, top 10, alunos em atenção (<50%), desempenho dos professores e visitantes com dias e presença; exportação PDF / Excel / CSV com seleção de seções e campos |
| **Usuários** *(admin)* | Cadastro de colaboradores com controle granular de permissões por módulo e por turma |

### Faixas Etárias

| Turma | Faixa |
|---|---|
| Cordeirinhos de Cristo | Até 5 anos |
| Guerreiros de Cristo | 6 a 11 anos |
| Adolescentes | 11 a 15 anos |
| Jovens | A partir de 16 anos |
| Adultos | A partir de 18 anos |

---

## Stack

| Camada | Tecnologia |
|---|---|
| **Framework** | [Next.js 14](https://nextjs.org/) — App Router + Server Actions + Middleware (edge) |
| **Linguagem** | [TypeScript 5.3](https://www.typescriptlang.org/) |
| **Estilização** | [Tailwind CSS 3.4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) |
| **Banco de Dados** | [Supabase](https://supabase.com/) (PostgreSQL + Auth + Row Level Security) |
| **Queries SQL** | [`postgres`](https://github.com/porsager/postgres) — conexão direta via connection string (Transaction Pooler) |
| **Autenticação** | `@supabase/auth-helpers-nextjs` — sessão persistida em cookies |
| **Gráficos** | [Recharts 2](https://recharts.org/) |
| **Datas** | [date-fns](https://date-fns.org/) com locale `pt-BR` |
| **Ícones** | [Lucide React](https://lucide.dev/) |
| **Deploy** | [Vercel](https://vercel.com/) |

> **Arquitetura de dados:** todas as queries SQL são executadas em Server Actions (`src/actions/`) via conexão direta com o PostgreSQL do Supabase (Transaction Pooler, porta 6543). O cliente Supabase JS é usado exclusivamente para autenticação (login, sessão, logout).

---

## Pré-requisitos

- **Node.js** 18+
- **npm** 9+
- Conta no [Supabase](https://supabase.com) (plano gratuito é suficiente)
- Conta no [Vercel](https://vercel.com) *(somente para deploy em produção)*

---

## Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/heldemfilipe/EBD-chamada.git
cd EBD-chamada
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o banco de dados

No painel do Supabase, acesse **SQL Editor → New Query** e execute os arquivos na ordem:

```
supabase/schema.sql        # Tabelas principais (turmas, alunos, chamadas, etc.)
supabase/setup_auth.sql    # Tabelas de autenticação (perfis, permissões)
```

> Alternativamente, use `supabase/setup_completo.sql` para executar tudo de uma vez.

**O `schema.sql` cria:**
- Tabelas: `turmas`, `professores`, `professor_turmas`, `alunos`, `chamadas`, `presencas`, `visitantes`, `historico_visitantes`, `escalas`
- Views de agregação, triggers de `updated_at`, índices e RLS

**O `setup_auth.sql` cria:**
- Tabelas: `perfis`, `permissoes_modulos`, `permissoes_turmas`
- RLS: `authenticated` pode SELECT; apenas `service_role` pode INSERT/UPDATE/DELETE

**Dados de exemplo (opcional):**

```bash
# Execute no SQL Editor para popular 6 turmas + ~85 alunos
supabase/seed_turmas_alunos.sql
```

### 4. Configure as variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Edite `.env.local` com suas credenciais:

```env
# ── Supabase Auth (usado no login e sessão) ─────────────────────────────────
# Supabase → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key

# ── Conexão direta PostgreSQL (usado em todas as queries do app) ─────────────
# Supabase → Project Settings → Database → Connection string → Transaction pooler
DATABASE_URL=postgresql://postgres.SEU_PROJECT_REF:SUA_SENHA@aws-0-REGIAO.pooler.supabase.com:6543/postgres
```

> **Como obter o `DATABASE_URL`:** No painel Supabase, acesse **Project Settings → Database → Connection string**. Selecione a aba **Transaction pooler** (porta **6543**) e copie a URI. Substitua `[YOUR-PASSWORD]` pela senha do banco (definida em **Database → Database password**).

> **Atenção:** `SUPABASE_SERVICE_ROLE_KEY` e `DATABASE_URL` nunca devem ser expostos no client-side. São usados apenas em Server Actions e rotas de API.

### 5. Crie o primeiro usuário admin

```bash
node scripts/create-admin.js
```

O script cria (ou verifica) o usuário admin com log colorido em cada etapa.

**Credenciais padrão:**

| Campo | Valor |
|---|---|
| E-mail | `admin@ebd.com` |
| Senha | `Admin@2026` |

Para customizar as credenciais:

```bash
ADMIN_EMAIL=meu@email.com ADMIN_SENHA=MinhaS3nha ADMIN_NOME="Meu Nome" node scripts/create-admin.js
```

### 6. Execute localmente

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) — você será redirecionado automaticamente para `/login`.

---

## Autenticação e Permissões

### Papéis

| Papel | Acesso |
|---|---|
| **Admin** | Todos os módulos + todas as turmas + aba Usuários |
| **Colaborador** | Apenas módulos e turmas configurados pelo admin |

### Proteção de rotas

O middleware (`src/middleware.ts`) protege todas as rotas no **edge layer**:

- Não autenticado → redireciona para `/login?redirect=<origem>`
- Autenticado em `/login` → redireciona para `/dashboard`

### Permissões granulares

Na aba **Usuários** (admin), cada colaborador pode ter:

- Acesso por módulo (Dashboard, Chamada, Alunos, Professores, Turmas, Escala, Relatórios)
- Acesso restrito a turmas específicas (aplicado à página Chamada)

---

## Deploy na Vercel

1. Faça push para o GitHub
2. Importe o repositório em [vercel.com/new](https://vercel.com/new)
3. Adicione as variáveis de ambiente no painel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`
4. Clique em **Deploy**

> O projeto está configurado para build automático a cada push na branch `main`.

---

## Estrutura do Banco de Dados

```
turmas
  └─< professor_turmas >─ professores
  └─< alunos
  └─< chamadas
        └─< presencas >─ alunos
        └─< historico_visitantes >─ visitantes
  └─< escalas >─ professores

auth.users  (Supabase Auth)
  └── perfis                     # role: admin | usuario
        └─< permissoes_modulos   # módulos acessíveis por colaborador
        └─< permissoes_turmas    # turmas acessíveis por colaborador
```

### Campos relevantes

| Tabela | Campo | Observação |
|---|---|---|
| `chamadas` | `ano` (smallint) | Coluna **gerada automaticamente** a partir de `data` — não inserir manualmente |
| `chamadas` | `trimestre` (smallint) | Coluna **gerada automaticamente** a partir de `data` — não inserir manualmente |
| `chamadas` | `data` (date) | Data do domingo; filtro principal por ano usa `WHERE ano = $1` |
| `chamadas` | `oferta` | `NUMERIC(10,2)` — armazenado como decimal; campo de entrada usa centavos (int) |
| `presencas` | `presente`, `trouxe_biblia`, `trouxe_revista` | Booleanos por aluno por chamada |
| `alunos` | `responsavel` | `professor:<uuid>` indica aluno sincronizado de professor |

---

## Estrutura do Projeto

```
src/
├── actions/                            # Server Actions — queries SQL diretas ao PostgreSQL
│   ├── chamada.ts                      # Buscar turmas, resumo do dia, dados por turma, salvar chamada
│   ├── dashboard.ts                    # Contadores gerais, turmas com professores, histórico, período
│   ├── alunos.ts                       # CRUD de alunos + presença anual
│   ├── professores.ts                  # CRUD de professores + sincronização de aluno vinculado
│   ├── turmas.ts                       # CRUD de turmas + matrícula + detalhes
│   ├── escala.ts                       # CRUD de escalas
│   └── relatorios.ts                   # Todos os dados de relatórios e rankings
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/page.tsx          # KPIs + gráficos + histórico recente + tempo relativo
│   │   ├── chamada/
│   │   │   ├── page.tsx                # Seletor de domingo + resumo compacto mobile por turma
│   │   │   └── [turmaId]/page.tsx      # Registro de presença da turma
│   │   ├── alunos/page.tsx             # CRUD + lista mobile em cards
│   │   ├── professores/page.tsx        # CRUD + lista mobile em cards + stats 2×2 mobile
│   │   ├── turmas/page.tsx             # CRUD de turmas
│   │   ├── escala/page.tsx             # Planejamento de escala
│   │   ├── relatorios/page.tsx         # Relatórios com gráficos + cards mobile por seção
│   │   └── usuarios/page.tsx           # Gestão de usuários (admin)
│   ├── api/
│   │   └── usuarios/route.ts           # CRUD de usuários via service role
│   ├── login/page.tsx                  # Tela de login
│   └── layout.tsx
├── components/
│   ├── ui/
│   │   ├── stat-card.tsx               # Card de KPI reutilizável (título, valor, ícone)
│   │   ├── presence-bar.tsx            # Barra de presença com cor dinâmica
│   │   ├── empty-state.tsx             # Estado vazio padronizado
│   │   ├── chart-tooltip.tsx           # Tooltip reutilizável para Recharts
│   │   ├── delete-confirm-dialog.tsx   # Dialog de confirmação de exclusão (reutilizável)
│   │   └── ...                         # shadcn/ui components (button, dialog, etc.)
│   ├── layout/
│   │   └── Sidebar.tsx                 # Menu lateral filtrado por permissões + logout
│   └── Providers.tsx                   # Wrapper do AuthProvider
├── contexts/
│   └── AuthContext.tsx                 # Sessão, perfil e permissões do usuário
├── lib/
│   ├── db.ts                           # Conexão PostgreSQL direta (postgres package, Transaction Pooler)
│   ├── constants.ts                    # Constantes globais (anos, meses, trimestres, cores, cargos)
│   ├── presence.ts                     # Utilitários de presença (calcularPct, corPresenca, resolverCor, etc.)
│   ├── supabase.ts                     # Cliente Supabase (apenas para auth — login, sessão, logout)
│   ├── logger.ts                       # Logger dual-mode (terminal colorido / JSON Vercel)
│   ├── relatorio-utils.ts              # filtrarPorPeriodo() e tipos de granularidade
│   └── chamada-utils.ts                # Utilitários de data para chamada
└── middleware.ts                       # Proteção de rotas no edge

supabase/
├── schema.sql                          # Schema principal (tabelas, views, triggers, RLS)
├── setup_auth.sql                      # Tabelas de auth e permissões
├── setup_completo.sql                  # Schema + auth em um único arquivo
├── seed_turmas_alunos.sql              # Dados de exemplo (6 turmas + ~85 alunos)
└── seed.sql                            # Seed básico

scripts/
└── create-admin.js                     # Cria o primeiro usuário admin
```

---

## Scripts

```bash
npm run dev           # Servidor de desenvolvimento (http://localhost:3000)
npm run build         # Build de produção
npm run start         # Servidor de produção
npm run lint          # ESLint
npm run type-check    # Verificação de tipos TypeScript (sem emitir)

node scripts/create-admin.js   # Cria/verifica o usuário admin
```

---

## Logging

O sistema usa um logger estruturado em `src/lib/logger.ts` com dois modos automáticos:

**Desenvolvimento — saída colorida no terminal:**
```
✗ ERROR 14:30:12 [middleware] Acesso negado — redirecionando para login
     path=/dashboard

● INFO  14:30:14 [auth] Acesso admin concedido — todos os módulos e turmas
     userId=c274...  nome=Administrador EBD  role=admin

▲ WARN  14:30:15 [api:usuarios] Usuário sem permissão de admin
     userId=abc123  role=usuario
```

**Produção (Vercel) — JSON estruturado por linha**, compatível com o log viewer da Vercel.

Pontos instrumentados: `middleware`, `AuthContext`, `api/usuarios`.

---

## Segurança (RLS)

Todas as tabelas possuem **Row Level Security** habilitado no Supabase:

| Tabela | Leitura | Escrita |
|---|---|---|
| `turmas`, `alunos`, `chamadas`, etc. | `authenticated` | `authenticated` |
| `perfis`, `permissoes_modulos`, `permissoes_turmas` | `authenticated` | `service_role` apenas |

As queries SQL do aplicativo são executadas via **connection string direta** (server-side), portanto passam pelo RLS do PostgreSQL normalmente, com as permissões do role configurado na connection string.

As permissões granulares por módulo e turma são verificadas:
- No **cliente** via `AuthContext` (renderização condicional de menus e conteúdo)
- No **edge** via `middleware.ts` (proteção de rota antes de qualquer renderização)
- Na **API** via verificação de `role` antes de qualquer mutação

---

## Responsividade Mobile

Todas as telas foram projetadas **mobile-first** e funcionam corretamente em celulares a partir de 320px de largura. A estratégia principal é exibir **cards compactos** no mobile e **tabelas/grids** no desktop, sem scroll horizontal em nenhuma tela.

Os breakpoints Tailwind utilizados são: `sm` (≥640px), `md` (≥768px) e `lg` (≥1024px).

### Padrão de layout por módulo

| Módulo | Mobile (`< sm`) | Desktop (`≥ sm`) |
|---|---|---|
| **Dashboard** | Stats 2×2 compacto + histórico com tempo relativo | 4 StatCards lado a lado |
| **Chamada** | Skeleton durante carregamento; card compacto por turma; resumo geral compacto | StatCards completos |
| **Alunos** | Lista de cards (nome, presença, turma, contato) | Tabela com colunas responsivas |
| **Professores** | Stats 2×2 + lista de cards (turmas, cargo, contato) | StatCards + tabela |
| **Relatórios — Presença por Sala** | Cards com barra + grid 4-cols (Pres/Faltas/Visit/Mat) + grid 3-cols (Bíblias/Revistas/Oferta) | Tabela com colunas responsive |
| **Relatórios — Top 10** | Lista compacta (rank, nome, sala, %) | Tabela |
| **Relatórios — Desempenho Professores** | Cards com turmas badges + grid 3-cols (Aulas/Presença/Bíblias) + badge avaliação | Tabela |
| **Relatórios — Visitantes** | Cards com badges de dias (verde/vermelho) + grid de stats | Tabela com dias visitados |

---

## Licença

Distribuído sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
