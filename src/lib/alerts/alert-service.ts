import { Resend } from 'resend'
import { getServerEnv } from '@/lib/env'
import { createServiceClient } from '@/lib/supabase/service'
import { composeTradeAlertEmail } from '@/lib/alerts/email-templates'
import type { Politician, Profile, Trade } from '@/types/database'

export async function sendTradeAlerts(newTrades: Trade[]) {
  if (newTrades.length === 0) {
    return { sent: 0, failed: 0 }
  }

  const resend = new Resend(getServerEnv().RESEND_API_KEY)
  const supabase = createServiceClient()
  const sentKeys = new Set<string>()
  let sent = 0
  let failed = 0

  for (const trade of newTrades) {
    const { data: politician } = await supabase
      .from('politicians')
      .select('*')
      .eq('id', trade.politician_id)
      .maybeSingle()

    if (!politician) {
      continue
    }

    const { data: followers } = await supabase
      .from('followed_politicians')
      .select('user_id')
      .eq('politician_id', trade.politician_id)

    for (const follower of followers ?? []) {
      const key = `${trade.id}:${follower.user_id}`
      if (sentKeys.has(key)) {
        continue
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', follower.user_id)
        .maybeSingle()

      if (!profile?.is_premium || !profile.email) {
        continue
      }

      const email = composeTradeAlertEmail(
        profile as Profile,
        politician as Politician,
        trade,
      )

      const { error } = await resend.emails.send(
        {
          from: getServerEnv().RESEND_FROM_EMAIL,
          to: [profile.email],
          subject: email.subject,
          html: email.html,
        },
        {
          idempotencyKey: `trade-alert-${trade.id}-${follower.user_id}`,
        },
      )

      if (error) {
        failed += 1
      } else {
        sent += 1
        sentKeys.add(key)
      }
    }
  }

  return { sent, failed }
}
