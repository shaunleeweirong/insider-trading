import type { Politician, Profile, Trade } from '@/types/database'

function getTradeVerb(type: Trade['transaction_type']) {
  return type === 'Purchase' ? 'buy' : 'sell'
}

export function composeTradeAlertEmail(
  user: Profile,
  politician: Politician,
  trade: Trade,
) {
  const subject = `${politician.full_name} just made a ${getTradeVerb(trade.transaction_type)} trade`
  const politicianUrl = `${process.env.NEXT_PUBLIC_APP_URL}/politicians/${politician.id}`
  const greeting = user.display_name ?? user.email ?? 'there'

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="margin-bottom: 8px;">Trade alert</h2>
      <p>Hi ${greeting},</p>
      <p><strong>${politician.full_name}</strong> just disclosed a <strong>${trade.transaction_type}</strong>.</p>
      <ul>
        <li>Ticker: ${trade.ticker ?? 'N/A'}</li>
        <li>Asset: ${trade.asset_name}</li>
        <li>Date: ${trade.transaction_date}</li>
        <li>Amount: ${trade.amount_range_raw}</li>
      </ul>
      <p>
        <a href="${politicianUrl}">View politician profile</a>
      </p>
    </div>
  `

  return {
    subject,
    html,
  }
}
