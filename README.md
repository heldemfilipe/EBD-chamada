<div align="center">

# EBD — Sistema de Gestão de Escola Bíblica Dominical

Sistema web completo para gestão de Escola Bíblica Dominical (EBD): chamada, alunos, professores, turmas, escala e relatórios.

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
- [Licença](#licença)

---

## Funcionalidades

| Módulo | Descrição |
|---|---|
| **Dashboard** | Visão geral com KPIs, gráficos de presença anuais/trimestrais/mensais e atividades recentes |
| **Chamada** | Registro de presença por domingo com controle de bíblias, revistas, ofertas e visitantes |
| **Alunos** | CRUD completo com histórico de frequência e distribuição por faixas etárias |
| **Professores** | Cadastro e vínculo com turmas; sincronização automática como aluno quando necessário |
| **Turmas** | Criação e gerenciamento de salas com faixas etárias (Cordeirinhos → Adultos) |
| **Escala** | Planejamento de professores por domingo |
| **Relatórios** | Estatísticas por dia, mês, trimestre e ano com gráficos e exportação |
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
| **Framework** | [Next.js 14](https://nextjs.org/) — App Router + Middleware (edge) |
| **Linguagem** | [TypeScript 5.3](https://www.typescriptlang.org/) |
| **Estilização** | [Tailwind CSS 3.4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) |
| **Banco de Dados** | [Supabase](https://supabase.com/) (PostgreSQL + Auth + Row Level Security) |
| **Autenticação** | `@supabase/auth-helpers-nextjs` — sessão persistida em cookies |
| **Formulários** | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| **Gráficos** | [Recharts 2](https://recharts.org/) |
| **Ícones** | [Lucide React](https://lucide.dev/) |
| **Deploy** | [Vercel](https://vercel.com/) |

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
git clone https://github.com/seu-usuario/ebd-chamada.git
cd ebd-chamada
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

Edite `.env.local` com suas credenciais (**Supabase → Project Settings → API**):

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

> **Atenção:** a `SERVICE_ROLE_KEY` nunca deve ser exposta no client-side. Ela é usada apenas pela rota `/api/usuarios`.

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

---

## Estrutura do Projeto

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/page.tsx          # KPIs + gráficos de presença
│   │   ├── chamada/
│   │   │   ├── page.tsx                # Seletor de domingo + resumo por turma
│   │   │   └── [turmaId]/page.tsx      # Registro de presença da turma
│   │   ├── alunos/page.tsx             # CRUD de alunos
│   │   ├── professores/page.tsx        # CRUD de professores
│   │   ├── turmas/page.tsx             # CRUD de turmas
│   │   ├── escala/page.tsx             # Planejamento de escala
│   │   ├── relatorios/page.tsx         # Relatórios com gráficos
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
│   │   ├── period-selector.tsx         # Seletor de período (mensal/trimestral/anual)
│   │   ├── chart-tooltip.tsx           # Tooltip reutilizável para Recharts
│   │   └── ...                         # shadcn/ui components (button, dialog, etc.)
│   ├── layout/
│   │   └── Sidebar.tsx                 # Menu lateral filtrado por permissões + logout
│   └── Providers.tsx                   # Wrapper do AuthProvider
├── contexts/
│   └── AuthContext.tsx                 # Sessão, perfil e permissões do usuário
├── lib/
│   ├── constants.ts                    # Constantes globais (anos, meses, trimestres, cores)
│   ├── presence.ts                     # Utilitários de presença (calcularPct, corPresenca, etc.)
│   ├── supabase.ts                     # Cliente Supabase (cookie-based SSR)
│   ├── logger.ts                       # Logger dual-mode (terminal colorido / JSON Vercel)
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

As permissões granulares por módulo e turma são verificadas:
- No **cliente** via `AuthContext` (renderização condicional de menus e conteúdo)
- No **edge** via `middleware.ts` (proteção de rota antes de qualquer renderização)
- Na **API** via verificação de `role` antes de qualquer mutação

---

## Licença

Distribuído sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
