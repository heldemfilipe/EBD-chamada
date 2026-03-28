import postgres from 'postgres'

// Conexão direta com PostgreSQL via connection string do Supabase
// Usa Transaction Pooler (porta 6543) para compatibilidade com serverless
const connectionString = process.env.DATABASE_URL!

const sql = postgres(connectionString, {
  max: 10,                     // max connections no pool
  idle_timeout: 20,            // fecha conexões ociosas após 20s
  connect_timeout: 10,         // timeout de conexão 10s
  prepare: false,              // necessário para Supabase Transaction Pooler
})

export default sql
