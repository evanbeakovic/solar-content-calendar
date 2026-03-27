import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PostStatus } from '@/lib/types'

const VALID_STATUSES: PostStatus[] = [
  'To Be Confirmed',
  'Being Created',
  'Confirmed',
  'Scheduled',
  'Posted',
]

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { status } = body

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('posts')
    .update({ status })
    .eq('id', params.id)
    .select('*, client:clients(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
