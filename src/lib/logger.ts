/**
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  EBD Logger                                                       │
 * │                                                                   │
 * │  • Desenvolvimento  → saída colorida e legível no terminal        │
 * │  • Produção/Vercel  → JSON estruturado (1 linha por entrada)      │
 * │  • Browser          → console nativo (visível no DevTools)        │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Pilares de cada entrada de log:
 *   ts        — timestamp ISO 8601
 *   level     — severidade: debug | info | warn | error
 *   msg       — o que aconteceu (texto claro)
 *   module    — de onde veio (middleware, auth, api:usuarios, etc.)
 *   userId    — usuário envolvido (quando disponível)
 *   duration  — tempo de execução em ms (para operações cronometradas)
 *   error     — detalhes do erro (message + code + stack em dev)
 *   ...extra  — campos adicionais relevantes ao contexto
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogMeta {
  module?: string
  userId?: string
  path?: string
  method?: string
  statusCode?: number
  duration?: number
  error?: Error | { message: string; code?: string | number; stack?: string }
  [key: string]: unknown
}

interface LogEntry extends LogMeta {
  ts: string
  level: LogLevel
  msg: string
  env: string
}

// ─── Detecção de ambiente ─────────────────────────────────────────────────────

const IS_SERVER = typeof window === 'undefined'
const IS_PROD   = process.env.NODE_ENV === 'production'

// ─── Cores ANSI para terminal ─────────────────────────────────────────────────
// Só usadas no servidor em modo dev

const A = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  debug:  '\x1b[36m',   // ciano
  info:   '\x1b[32m',   // verde
  warn:   '\x1b[33m',   // amarelo
  error:  '\x1b[31m',   // vermelho
  module: '\x1b[35m',   // magenta
  key:    '\x1b[34m',   // azul
} satisfies Record<string, string>

const LEVEL_ICONS: Record<LogLevel, string> = {
  debug: '◦',
  info:  '●',
  warn:  '▲',
  error: '✗',
}

// ─── Formatação terminal (DEV, servidor) ──────────────────────────────────────

function formatTerminal(level: LogLevel, msg: string, meta: LogMeta): string {
  const { module, userId, error, ...rest } = meta

  const color  = A[level]
  const icon   = `${color}${LEVEL_ICONS[level]}${A.reset}`
  const lvl    = `${color}${level.toUpperCase().padEnd(5)}${A.reset}`
  const time   = `${A.dim}${new Date().toLocaleTimeString('pt-BR', { hour12: false })}${A.reset}`
  const mod    = module ? `${A.module}[${module}]${A.reset}` : ''
  const text   = level === 'error'
    ? `${A.bold}${A.error}${msg}${A.reset}`
    : level === 'warn'
    ? `${A.warn}${msg}${A.reset}`
    : msg

  let out = `${icon} ${lvl} ${time} ${mod} ${text}`

  // Linha de erro
  if (error) {
    const e = error as any
    const errMsg = e?.message ?? String(error)
    const code   = e?.code ? `${A.dim} [${e.code}]${A.reset}` : ''
    out += `\n     ${A.error}→ ${errMsg}${A.reset}${code}`
    if (!IS_PROD && e?.stack) {
      const stackLines = (e.stack as string).split('\n').slice(1, 4)
      for (const line of stackLines) {
        out += `\n     ${A.dim}${line.trim()}${A.reset}`
      }
    }
  }

  // Campos extras (userId + campos livres)
  const extras: string[] = []
  if (userId) extras.push(`userId=${userId}`)
  const skip = new Set(['module', 'userId', 'error'])
  for (const [k, v] of Object.entries(rest)) {
    if (!skip.has(k) && v !== undefined) {
      extras.push(`${A.key}${k}${A.reset}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
    }
  }
  if (extras.length > 0) {
    out += `\n     ${A.dim}${extras.join('  ')}${A.reset}`
  }

  return out
}

// ─── Formatação JSON (PROD / Vercel) ─────────────────────────────────────────

function formatJson(level: LogLevel, msg: string, meta: LogMeta): string {
  const { error, ...rest } = meta
  const entry: LogEntry = {
    ts:    new Date().toISOString(),
    level,
    msg,
    env:   process.env.NODE_ENV ?? 'unknown',
    ...rest,
  }

  if (error) {
    const e = error as any
    entry.error = {
      message: e?.message ?? String(error),
      ...(e?.code  !== undefined ? { code:  e.code  } : {}),
      // stack só em dev mesmo em prod ocasionalmente há interesse, mas omitimos por segurança
    } as any
  }

  return JSON.stringify(entry)
}

// ─── Emissão ──────────────────────────────────────────────────────────────────

function emit(level: LogLevel, msg: string, meta: LogMeta = {}) {
  if (!IS_SERVER) {
    // Browser → console padrão (visível no DevTools, não afeta Vercel)
    const prefix = `[${meta.module ?? 'ebd'}]`
    if (level === 'error') console.error(prefix, msg, meta)
    else if (level === 'warn') console.warn(prefix, msg, meta)
    else if (level === 'debug') console.debug(prefix, msg, meta)
    else console.log(prefix, msg, meta)
    return
  }

  // Servidor/Edge
  if (IS_PROD) {
    // Vercel → JSON por linha (stderr para warn/error, stdout para resto)
    const line = formatJson(level, msg, meta)
    // console.error vai para stderr automaticamente — compatível com Edge Runtime e Vercel
    if (level === 'error' || level === 'warn') console.error(line)
    else console.log(line)
  } else {
    // Dev → colorido no terminal
    const line = formatTerminal(level, msg, meta)
    if (level === 'error') console.error(line)
    else if (level === 'warn') console.warn(line)
    else console.log(line)
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

export const logger = {
  debug: (msg: string, meta?: LogMeta) => emit('debug', msg, meta),
  info:  (msg: string, meta?: LogMeta) => emit('info',  msg, meta),
  warn:  (msg: string, meta?: LogMeta) => emit('warn',  msg, meta),
  error: (msg: string, meta?: LogMeta) => emit('error', msg, meta),

  /**
   * Cronometra uma operação assíncrona e registra duração ao final.
   * Uso: const result = await logger.time('buscar alunos', { module: 'db' }, () => supabase...)
   */
  async time<T>(
    msg: string,
    meta: LogMeta,
    fn: () => Promise<T>,
  ): Promise<T> {
    const start = Date.now()
    try {
      const result = await fn()
      emit('debug', msg, { ...meta, duration: Date.now() - start })
      return result
    } catch (err) {
      emit('error', msg, { ...meta, duration: Date.now() - start, error: err as Error })
      throw err
    }
  },
}

export default logger
