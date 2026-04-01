import { createServiceClient } from '@/lib/supabase/service'

export async function requirePremium(userId: string) {
  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_premium')
    .eq('id', userId)
    .maybeSingle()

  if (!profile?.is_premium) {
    throw new Error('Forbidden')
  }
}

export async function getTradesDateFilter(userId: string) {
  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_premium')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.is_premium) {
    return null
  }

  const from = new Date()
  from.setDate(from.getDate() - 30)

  return { from }
}
