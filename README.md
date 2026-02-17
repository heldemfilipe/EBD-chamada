# EBD — Sistema de Gestão de Escola Bíblica Dominical

Sistema completo para gestão de Escola Bíblica Dominical (EBD), desenvolvido com Next.js 14, TypeScript, Tailwind CSS e Supabase. Pronto para hospedar na Vercel.

## Funcionalidades

| Módulo | Descrição |
|---|---|
| **Dashboard** | Visão geral com KPIs, gráficos anuais/trimestrais/mensais e atividades recentes |
| **Chamada** | Registro de presença por domingo, controle de bíblias, revistas, ofertas e visitantes |
| **Alunos** | CRUD completo com histórico de frequência |
| **Professores** | Cadastro e vínculo com turmas |
| **Turmas** | Criação e gerenciamento de salas/classes |
| **Escala** | Planejamento de escala de professores por data |
| **Relatórios** | Estatísticas por dia, mês, trimestre e ano com gráficos e tabelas |

## Tecnologias

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Linguagem**: [TypeScript](https://www.typescriptlang.org/)
- **Estilização**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Banco de Dados**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Gráficos**: [Recharts](https://recharts.org/)
- **Deploy**: [Vercel](https://vercel.com/)

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)
- Conta no [Vercel](https://vercel.com) (para deploy)

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

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Vá em **SQL Editor → New Query**
3. Cole o conteúdo de `supabase/schema.sql` e execute

O schema cria:
- Tabelas: `turmas`, `professores`, `professor_turmas`, `alunos`, `chamadas`, `presencas`, `visitantes`, `historico_visitantes`, `escalas`
- Views de agregação: `vw_frequencia_alunos`, `vw_resumo_chamadas_dia`, `vw_alunos_por_turma`, etc.
- Triggers de `updated_at`, índices e RLS habilitado

### 4. Configure as variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Edite `.env.local` com suas credenciais (encontradas em **Supabase → Project Settings → API**):

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY_AQUI
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY_AQUI
```

### 5. Execute localmente

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## Deploy na Vercel

1. Faça push do código para o GitHub
2. Importe o repositório em [vercel.com](https://vercel.com)
3. Adicione as variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Clique em **Deploy**

## Estrutura do Banco de Dados

```
turmas
  └─< professor_turmas >─ professores
  └─< alunos
  └─< chamadas
        └─< presencas >─ alunos
        └─< historico_visitantes >─ visitantes
  └─< escalas >─ professores
```

### Principais colunas

**chamadas**: `turma_id`, `professor_id`, `data`, `trimestre` (gerado), `ano` (gerado), `oferta`, `anotacoes`

**presencas**: `chamada_id`, `aluno_id`, `presente`, `trouxe_biblia`, `trouxe_revista`, `justificativa`

**escalas**: `turma_id`, `professor_id`, `data`, `trimestre` (gerado), `ano` (gerado), `confirmado`

## Estrutura do Projeto

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/page.tsx
│   │   ├── chamada/
│   │   │   ├── page.tsx          # Lista de turmas com seletor de domingo
│   │   │   └── [turmaId]/page.tsx # Chamada da sala
│   │   ├── alunos/page.tsx
│   │   ├── professores/page.tsx
│   │   ├── turmas/page.tsx
│   │   ├── escala/page.tsx
│   │   └── relatorios/page.tsx
│   └── layout.tsx
├── components/
│   ├── ui/                       # shadcn/ui components
│   └── layout/                   # Sidebar, Header
├── lib/
│   └── supabase.ts               # Cliente Supabase
└── types/
    └── database.types.ts         # Tipos gerados do schema
supabase/
└── schema.sql                    # Schema completo do banco
```

## Scripts

```bash
npm run dev      # Desenvolvimento (http://localhost:3000)
npm run build    # Build de produção
npm run start    # Servidor de produção
npm run lint     # ESLint
```

## Segurança (RLS)

Todas as tabelas possuem Row Level Security habilitado. A política padrão (`authenticated_all`) permite acesso total a usuários autenticados. Ajuste as políticas em `supabase/schema.sql` conforme necessário.

## Licença

MIT
