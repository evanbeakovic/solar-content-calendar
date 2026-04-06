import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encrypt, decrypt } from '@/lib/encryption'

// TODO: account_id should come from the authenticated session in a multi-tenant future
const DEFAULT_ACCOUNT_ID = 'default'

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('account_settings')
      .select('anthropic_api_key_encrypted')
      .eq('account_id', DEFAULT_ACCOUNT_ID)
      .single()

    if (error || !data?.anthropic_api_key_encrypted) {
      return NextResponse.json({ hasKey: false, lastFour: null })
    }

    const decrypted = decrypt(data.anthropic_api_key_encrypted)
    const lastFour = decrypted.slice(-4)
    return NextResponse.json({ hasKey: true, lastFour })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { api_key, account_id } = await req.json()
    // TODO: account_id should come from the authenticated session in a multi-tenant future
    const resolvedAccountId = account_id || DEFAULT_ACCOUNT_ID

    if (!api_key || typeof api_key !== 'string' || !api_key.trim()) {
      return NextResponse.json({ error: 'api_key is required' }, { status: 400 })
    }

    const encrypted = encrypt(api_key.trim())
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('account_settings')
      .upsert(
        { account_id: resolvedAccountId, anthropic_api_key_encrypted: encrypted, updated_at: new Date().toISOString() },
        { onConflict: 'account_id' }
      )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { account_id } = await req.json().catch(() => ({}))
    // TODO: account_id should come from the authenticated session in a multi-tenant future
    const resolvedAccountId = account_id || DEFAULT_ACCOUNT_ID

    const supabase = createAdminClient()
    const { error } = await supabase
      .from('account_settings')
      .update({ anthropic_api_key_encrypted: null, updated_at: new Date().toISOString() })
      .eq('account_id', resolvedAccountId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
