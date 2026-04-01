import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function createNoEnvServerClient() {
  const response = { data: [], error: null, count: 0 }

  const queryBuilder = new Proxy(
    {},
    {
      get(_target, property) {
        if (property === 'then') {
          return (resolve: (value: typeof response) => unknown) =>
            Promise.resolve(resolve(response))
        }

        if (property === 'maybeSingle' || property === 'single') {
          return async () => ({ data: null, error: null })
        }

        if (property === 'select') {
          return () => queryBuilder
        }

        if (property === 'insert') {
          return () => queryBuilder
        }

        if (property === 'update' || property === 'delete' || property === 'upsert') {
          return () => queryBuilder
        }

        return () => queryBuilder
      },
    },
  ) as unknown

  const client = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
    },
    from() {
      return queryBuilder
    },
  }

  return client as ReturnType<typeof createServerClient>
}

export async function createClient(): Promise<ReturnType<typeof createServerClient>> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return createNoEnvServerClient()
  }

  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // The `setAll` method is called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    },
  )
}
