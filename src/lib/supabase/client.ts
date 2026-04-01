import { createBrowserClient } from '@supabase/ssr'

export function createClient(): ReturnType<typeof createBrowserClient> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const missingEnvError = new Error('Supabase environment variables are not configured')

    return {
      auth: {
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: missingEnvError }),
        signUp: async () => ({ data: { user: null, session: null }, error: missingEnvError }),
        resetPasswordForEmail: async () => ({ data: null, error: missingEnvError }),
      },
    } as unknown as ReturnType<typeof createBrowserClient>
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
