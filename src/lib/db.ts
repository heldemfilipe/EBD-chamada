import postgres from 'postgres'

// Conexão direta com PostgreSQL via connection string do Supabase
// Usa Transaction Pooler (porta 6543) para compatibilidade com serverless
const connectionString = process.env.DATABASE_URL!

const sql = postgres(connectionString, {
  max: 10,                     // max connections no pool
  idle_timeout: 20,            // fecha conexões ociosas após 20s
  connect_timeout: 10,         // timeout de conexão 10s
  prepare: false,              // necessário para Supabase Transaction Pooler

  // Retornar colunas date/timestamp como strings ISO em vez de objetos Date.
  // O código usa parseISO(), format(), .startsWith() etc. — tudo espera string.
  types: {
    date: {
      to: 1082,
      from: [1082],
      serialize: (x: string) => x,
      parse: (x: string) => x,        // 'YYYY-MM-DD'
    },
    timestamp: {
      to: 1114,
      from: [1114, 1184],             // timestamp + timestamptz
      serialize: (x: string) => x,
      parse: (x: string) => x,        // ISO string
    },
  },
})

export default sql
