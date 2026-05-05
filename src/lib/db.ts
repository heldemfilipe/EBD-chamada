import postgres from 'postgres'

// Conexão direta com PostgreSQL via connection string do Supabase
// Usa Transaction Pooler (porta 6543) para compatibilidade com serverless
const connectionString = process.env.DATABASE_URL!

const sql = postgres(connectionString, {
  max: 3,                      // serverless: cada instância usa no máximo 3 conexões
  idle_timeout: 10,            // fecha conexões ociosas mais rápido (serverless)
  max_lifetime: 60,            // recicla conexões a cada 60s para evitar stale
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
