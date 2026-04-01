import { z } from 'zod'

export const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  FMP_API_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  STRIPE_PRICE_ID: z.string().startsWith('price_'),
  RESEND_API_KEY: z.string().startsWith('re_'),
  RESEND_FROM_EMAIL: z.string().email(),
})

export const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  NEXT_PUBLIC_APP_URL: z.url(),
})

export type ServerEnv = z.infer<typeof serverSchema>
export type ClientEnv = z.infer<typeof clientSchema>

export function parseServerEnv(): ServerEnv {
  return serverSchema.parse(process.env)
}

export function parseClientEnv(): ClientEnv {
  return clientSchema.parse(process.env)
}

let _serverEnv: ServerEnv | undefined
let _clientEnv: ClientEnv | undefined

export function getServerEnv(): ServerEnv {
  if (!_serverEnv) _serverEnv = parseServerEnv()
  return _serverEnv
}

export function getClientEnv(): ClientEnv {
  if (!_clientEnv) _clientEnv = parseClientEnv()
  return _clientEnv
}
