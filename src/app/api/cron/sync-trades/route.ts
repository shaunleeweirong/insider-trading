import { getServerEnv } from '@/lib/env'
import { syncTrades } from '@/lib/sync/trade-sync'

export const runtime = 'nodejs'

function isAuthorized(request: Request) {
  return request.headers.get('authorization') === `Bearer ${getServerEnv().CRON_SECRET}`
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const senate = await syncTrades('senate')
    const house = await syncTrades('house')

    return Response.json({ senate, house })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    return Response.json({ error: message }, { status: 500 })
  }
}
