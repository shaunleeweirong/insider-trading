import { getServerEnv } from '@/lib/env'
import { computeAllReturns } from '@/lib/returns/compute-returns'

export const runtime = 'nodejs'
export const maxDuration = 300

function isAuthorized(request: Request) {
  return request.headers.get('authorization') === `Bearer ${getServerEnv().CRON_SECRET}`
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await computeAllReturns()
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
