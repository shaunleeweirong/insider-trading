import { createClient } from '@/lib/supabase/server'

async function getRequestContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, user: null, isPremium: false }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_premium')
    .eq('id', user.id)
    .maybeSingle()

  return { supabase, user, isPremium: profile?.is_premium ?? false }
}

export async function POST(request: Request) {
  const { supabase, user, isPremium } = await getRequestContext()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isPremium) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const politicianId = typeof body.politician_id === 'string' ? body.politician_id : null

  if (!politicianId) {
    return Response.json({ error: 'politician_id is required' }, { status: 400 })
  }

  const { error } = await supabase.from('followed_politicians').insert({
    user_id: user.id,
    politician_id: politicianId,
  })

  if (error) {
    const duplicateError = error as { code?: string; message?: string }
    const isDuplicate = duplicateError.code === '23505' || duplicateError.message?.includes('duplicate')
    if (isDuplicate) {
      return Response.json({ error: 'Already following' }, { status: 409 })
    }

    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}

export async function DELETE(request: Request) {
  const { supabase, user, isPremium } = await getRequestContext()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isPremium) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const politicianId = typeof body.politician_id === 'string' ? body.politician_id : null

  if (!politicianId) {
    return Response.json({ error: 'politician_id is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('followed_politicians')
    .delete()
    .eq('user_id', user.id)
    .eq('politician_id', politicianId)
    .select('id')

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return Response.json({ error: 'Follow not found' }, { status: 404 })
  }

  return Response.json({ success: true })
}
