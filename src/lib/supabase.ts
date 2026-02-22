import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Cliente para uso no browser — usa COOKIES em vez de localStorage
// Isso garante que o middleware (createMiddlewareClient) consegue ler a sessão
export const supabase = createClientComponentClient<Database>()

// Helper: retorna cliente com service role (apenas server-side)
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
