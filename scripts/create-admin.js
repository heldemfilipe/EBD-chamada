/**
 * Script de criação do primeiro usuário admin do sistema EBD.
 *
 * Pré-requisito: execute supabase/setup_auth.sql no Supabase SQL Editor antes.
 *
 * Como rodar:
 *   node scripts/create-admin.js
 *
 * Ou com credenciais customizadas:
 *   ADMIN_EMAIL=meu@email.com ADMIN_SENHA=Minha@Senha node scripts/create-admin.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })
const { createClient } = require('@supabase/supabase-js')

// ─── Configurações ─────────────────────────────────────────────────────────────
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY      = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY
const ADMIN_EMAIL   = process.env.ADMIN_EMAIL || 'admin@ebd.com'
const ADMIN_SENHA   = process.env.ADMIN_SENHA || 'Admin@2026'
const ADMIN_NOME    = process.env.ADMIN_NOME  || 'Administrador EBD'

// ─── Helpers de log ────────────────────────────────────────────────────────────
const ok   = (msg) => console.log(`  ✅ ${msg}`)
const err  = (msg) => console.error(`  ❌ ${msg}`)
const info = (msg) => console.log(`  ℹ️  ${msg}`)
const warn = (msg) => console.log(`  ⚠️  ${msg}`)
const step = (msg) => console.log(`\n🔹 ${msg}`)
const line = ()    => console.log('─'.repeat(60))

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  line()
  console.log('🚀 EBD — Script de criação do usuário admin')
  line()

  // 1. Verificar variáveis de ambiente
  step('Verificando variáveis de ambiente...')
  if (!SUPABASE_URL) { err('NEXT_PUBLIC_SUPABASE_URL não encontrada no .env.local'); process.exit(1) }
  if (!ANON_KEY)     { err('NEXT_PUBLIC_SUPABASE_ANON_KEY não encontrada no .env.local'); process.exit(1) }
  if (!SERVICE_KEY)  { err('SUPABASE_SERVICE_ROLE_KEY não encontrada no .env.local'); process.exit(1) }
  ok(`Supabase URL  : ${SUPABASE_URL}`)
  ok(`Anon key      : ${ANON_KEY.slice(0, 20)}...`)
  ok(`Service key   : ${SERVICE_KEY.slice(0, 20)}...`)
  ok(`Email do admin: ${ADMIN_EMAIL}`)

  // 2. Testar conectividade com a anon key
  step('Testando conectividade com a anon key...')
  const anonClient = createClient(SUPABASE_URL, ANON_KEY)
  const { data: anonTest, error: anonErr } = await anonClient.from('turmas').select('id').limit(1)
  if (anonErr) {
    if (anonErr.message?.toLowerCase().includes('invalid api key') || anonErr.code === '401') {
      err(`Anon key inválida: ${anonErr.message}`)
      mostrarInstrucoesFrescas()
      process.exit(1)
    }
    warn(`Aviso na anon key (pode ser normal se tabela não existir): ${anonErr.message}`)
  } else {
    ok(`Conectividade com anon key OK (turmas: ${anonTest?.length ?? 0} registros)`)
  }

  // 3. Criar cliente com service role e testar
  step('Criando cliente Supabase com service role...')
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Teste rápido da service key tentando listar usuários
  step('Testando validade da service role key...')
  const { data: authTest, error: authTestErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
  if (authTestErr) {
    err(`Service role key inválida: ${authTestErr.message}`)
    if (authTestErr.message?.toLowerCase().includes('invalid')) {
      mostrarInstrucoesFrescas()
    }
    process.exit(1)
  }
  ok(`Service role key OK — ${authTest?.users?.length ?? 0} usuário(s) encontrado(s) (amostra)`)

  // 4. Verificar se a tabela perfis existe
  step('Verificando se a tabela "perfis" existe...')
  const { error: tabelaError } = await supabase.from('perfis').select('id').limit(1)
  if (tabelaError) {
    err(`Tabela "perfis" não encontrada: ${tabelaError.message}`)
    console.log('\n⚠️  AÇÃO NECESSÁRIA:')
    console.log('   1. Acesse https://supabase.com/dashboard')
    console.log('   2. Vá em: SQL Editor → New query')
    console.log('   3. Cole e execute o conteúdo do arquivo: supabase/setup_auth.sql')
    console.log('   4. Execute este script novamente\n')
    process.exit(1)
  }
  ok('Tabela "perfis" existe e acessível ✓')

  // 5. Verificar se o usuário já existe no Auth
  step(`Verificando se "${ADMIN_EMAIL}" já existe no Auth...`)
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) {
    err(`Erro ao listar usuários: ${listErr.message}`)
    process.exit(1)
  }
  const usuarioExistente = users?.find(u => u.email === ADMIN_EMAIL)

  let userId
  if (usuarioExistente) {
    userId = usuarioExistente.id
    info(`Usuário já existe no Auth — id: ${userId}`)
  } else {
    // 6. Criar usuário no Supabase Auth
    step(`Criando usuário "${ADMIN_EMAIL}" no Supabase Auth...`)
    const { data: authData, error: createErr } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_SENHA,
      email_confirm: true,  // confirma e-mail automaticamente (sem precisar de link)
    })
    if (createErr) {
      err(`Erro ao criar usuário no Auth: ${createErr.message}`)
      process.exit(1)
    }
    userId = authData.user.id
    ok(`Usuário criado no Auth — id: ${userId}`)
  }

  // 7. Garantir perfil na tabela perfis
  await garantirPerfil(supabase, userId)
}

async function garantirPerfil(supabase, userId) {
  step('Verificando registro na tabela "perfis"...')
  const { data: perfilExistente, error: checkErr } = await supabase
    .from('perfis')
    .select('id, nome, role, ativo')
    .eq('id', userId)
    .single()

  if (checkErr && checkErr.code !== 'PGRST116') {
    // PGRST116 = "no rows returned" — não é erro, só significa que não existe
    err(`Erro ao verificar perfil: ${checkErr.message}`)
    process.exit(1)
  }

  if (perfilExistente) {
    info(`Perfil já existe — nome: "${perfilExistente.nome}", role: ${perfilExistente.role}, ativo: ${perfilExistente.ativo}`)
    if (perfilExistente.role !== 'admin') {
      step('Atualizando role para admin...')
      const { error: upErr } = await supabase
        .from('perfis')
        .update({ role: 'admin', ativo: true })
        .eq('id', userId)
      if (upErr) { err(`Erro ao atualizar role: ${upErr.message}`); process.exit(1) }
      ok('Role atualizado para admin!')
    } else if (!perfilExistente.ativo) {
      step('Reativando perfil desativado...')
      const { error: upErr } = await supabase.from('perfis').update({ ativo: true }).eq('id', userId)
      if (upErr) { err(`Erro ao reativar: ${upErr.message}`); process.exit(1) }
      ok('Perfil reativado!')
    } else {
      ok('Perfil admin já está configurado e ativo — nada a fazer!')
    }
  } else {
    step(`Criando perfil admin para o usuário (id: ${userId})...`)
    const { error: insertErr } = await supabase
      .from('perfis')
      .insert({ id: userId, nome: ADMIN_NOME, role: 'admin', ativo: true })
    if (insertErr) {
      err(`Erro ao criar perfil: ${insertErr.message}`)
      process.exit(1)
    }
    ok(`Perfil admin criado — nome: "${ADMIN_NOME}", role: admin`)
  }

  // Resumo final
  line()
  console.log('\n🎉  Tudo pronto! Use as credenciais abaixo para fazer login:\n')
  console.log(`   📧  E-mail : ${ADMIN_EMAIL}`)
  console.log(`   🔑  Senha  : ${ADMIN_SENHA}`)
  console.log(`   🌐  URL    : http://localhost:3000/login`)
  console.log('\n')
  line()
}

function mostrarInstrucoesFrescas() {
  console.log('\n📋  COMO OBTER CHAVES ATUALIZADAS:')
  console.log('   1. Acesse https://supabase.com/dashboard')
  console.log('   2. Selecione seu projeto')
  console.log('   3. Vá em: Project Settings → API')
  console.log('   4. Copie as chaves:')
  console.log('      • "anon public"  → NEXT_PUBLIC_SUPABASE_ANON_KEY')
  console.log('      • "service_role" → SUPABASE_SERVICE_ROLE_KEY')
  console.log('   5. Atualize o arquivo .env.local')
  console.log('   6. Execute este script novamente\n')
}

main().catch(e => {
  err(`Erro inesperado: ${e.message}`)
  console.error(e)
  process.exit(1)
})
