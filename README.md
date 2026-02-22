# EBD — Sistema de Gestão de Escola Bíblica Dominical

Sistema completo para gestão de Escola Bíblica Dominical (EBD), desenvolvido com **Next.js 14**, **TypeScript**, **Tailwind CSS** e **Supabase**. Pronto para hospedar na Vercel.

---

## Funcionalidades

| Módulo | Descrição |
|---|---|
| **Dashboard** | Visão geral com KPIs, gráficos anuais/trimestrais/mensais e atividades recentes |
| **Chamada** | Registro de presença por domingo com controle de bíblias, revistas, ofertas e visitantes |
| **Alunos** | CRUD completo com histórico de frequência e faixas etárias por turma |
| **Professores** | Cadastro e vínculo com turmas |
| **Turmas** | Criação e gerenciamento de salas com faixas etárias: Cordeirinhos, Guerreiros, Adolescentes, Jovens e Adultos |
| **Escala** | Planejamento de professores por domingo |
| **Relatórios** | Estatísticas por dia, mês, trimestre e ano com gráficos e exportação |
| **Usuários** *(admin)* | Cadastro de usuários com controle de permissões por módulo e por turma |

---

## Tecnologias

- **Framework**: [Next.js 14](https://nextjs.org/) — App Router + Middleware
- **Linguagem**: [TypeScript](https://www.typescriptlang.org/)
- **Estilização**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Banco de Dados**: [Supabase](https://supabase.com/) (PostgreSQL + Auth + RLS)
- **Autenticação**: `@supabase/auth-helpers-nextjs` com sessão em cookies
- **Gráficos**: [Recharts](https://recharts.org/)
- **Deploy**: [Vercel](https://vercel.com/)

---

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)
- Conta no [Vercel](https://vercel.com) (para deploy em produção)

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

### 3. Configure o banco de dados no Supabase

Acesse **Supabase → SQL Editor → New Query** e execute os arquivos na ordem:

```
supabase/schema.sql        # Tabelas principais (turmas, alunos, chamadas, etc.)
supabase/setup_auth.sql    # Tabelas de autenticação (perfis, permissões)
```

O `schema.sql` cria:
- Tabelas: `turmas`, `professores`, `professor_turmas`, `alunos`, `chamadas`, `presencas`, `visitantes`, `historico_visitantes`, `escalas`
- Views de agregação, triggers de `updated_at`, índices e RLS

O `setup_auth.sql` cria:
- Tabelas: `perfis`, `permissoes_modulos`, `permissoes_turmas`
- RLS: `authenticated` pode SELECT; apenas `service_role` pode INSERT/UPDATE/DELETE

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

### 5. Crie o primeiro usuário admin

```bash
node scripts/create-admin.js
```

O script detecta e reporta cada etapa com log colorido. Por padrão cria:
- **E-mail**: `admin@ebd.com`
- **Senha**: `Admin@2026`

Para usar credenciais customizadas:

```bash
ADMIN_EMAIL=meu@email.com ADMIN_SENHA=MinhaS3nha ADMIN_NOME="Meu Nome" node scripts/create-admin.js
```

### 6. Execute localmente

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) — você será redirecionado para `/login`.

---

## Sistema de Autenticação

### Papéis

| Papel | Acesso |
|---|---|
| **Admin** | Todos os módulos + todas as turmas + aba Usuários |
| **Colaborador** | Apenas módulos e turmas configurados pelo admin |

### Proteção de rotas

O middleware (`src/middleware.ts`) protege todas as rotas no edge layer:
- Não autenticado → redireciona para `/login?redirect=<origem>`
- Autenticado em `/login` → redireciona para `/dashboard`

### Permissões

Na aba **Usuários** (admin), cada colaborador pode ter:
- Acesso configurável por módulo (Dashboard, Chamada, Alunos, etc.)
- Acesso restrito a turmas específicas (na página Chamada)

---

## Deploy na Vercel

1. Faça push para o GitHub
2. Importe o repositório em [vercel.com](https://vercel.com)
3. Adicione as variáveis de ambiente no painel da Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Clique em **Deploy**

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

auth.users (Supabase Auth)
  └── perfis                    # role: admin | usuario
        └─< permissoes_modulos  # módulos acessíveis por colaborador
        └─< permissoes_turmas   # turmas acessíveis por colaborador
```

---

## Estrutura do Projeto

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/page.tsx      # KPIs + gráficos
│   │   ├── chamada/
│   │   │   ├── page.tsx            # Seletor de domingo + resumo por turma
│   │   │   └── [turmaId]/page.tsx  # Registro de presença da turma
│   │   ├── alunos/page.tsx
│   │   ├── professores/page.tsx
│   │   ├── turmas/page.tsx
│   │   ├── escala/page.tsx
│   │   ├── relatorios/page.tsx
│   │   └── usuarios/page.tsx       # Gestão de usuários (admin)
│   ├── api/
│   │   └── usuarios/route.ts       # CRUD de usuários via service role
│   ├── login/page.tsx              # Tela de login
│   └── layout.tsx
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── layout/
│   │   └── Sidebar.tsx             # Menu filtrado por permissões + logout
│   └── Providers.tsx               # Wrapper AuthProvider
├── contexts/
│   └── AuthContext.tsx             # Sessão, perfil, permissões
├── lib/
│   ├── supabase.ts                 # Cliente Supabase (cookie-based)
│   ├── logger.ts                   # Logger dual-mode (terminal colorido / JSON Vercel)
│   └── chamada-utils.ts            # Utilitários de data para chamada
└── middleware.ts                   # Proteção de rotas (edge)
supabase/
├── schema.sql                      # Schema principal
├── setup_auth.sql                  # Tabelas de auth e permissões
└── seed_turmas_alunos.sql          # Dados de exemplo (6 turmas + ~85 alunos)
scripts/
└── create-admin.js                 # Cria o primeiro usuário admin
```

---

## Scripts

```bash
npm run dev                  # Desenvolvimento (http://localhost:3000)
npm run build                # Build de produção
npm run start                # Servidor de produção
npm run lint                 # ESLint
node scripts/create-admin.js # Cria/verifica usuário admin
```

---

## Logging

O sistema usa um logger estruturado em `src/lib/logger.ts`:

- **Desenvolvimento (terminal)**: saída colorida com ícones por severidade
- **Produção (Vercel)**: JSON estruturado por linha, compatível com o log viewer da Vercel

```
✗ ERROR 14:30:12 [middleware] Acesso negado — redirecionando para login
     path=/dashboard

● INFO  14:30:14 [auth] Acesso admin concedido — todos os módulos e turmas
     userId=c274...  nome=Administrador EBD  role=admin

▲ WARN  14:30:15 [api:usuarios] Usuário sem permissão de admin
     userId=abc123  role=usuario
```

Pontos instrumentados: `middleware`, `AuthContext`, `api/usuarios`.

---

## Faixas Etárias (Turmas)

| Faixa | Descrição |
|---|---|
| Cordeirinhos de Cristo | Até 5 anos |
| Guerreiros de Cristo | 6 a 11 anos |
| Adolescentes | 11 a 15 anos |
| Jovens | A partir de 16 anos |
| Adultos | A partir de 18 anos |

---

## Segurança (RLS)

Todas as tabelas possuem Row Level Security habilitado.

- **Tabelas de dados** (`turmas`, `alunos`, etc.): acesso por `authenticated`
- **Tabelas de auth** (`perfis`, `permissoes_*`): leitura por `authenticated`; escrita apenas por `service_role`
- As permissões granulares por módulo e turma são verificadas no cliente via `AuthContext` e nas rotas via middleware

---

## Licença

MIT
