import { createAdminClient } from '@/lib/supabase/admin'
import { decrypt } from '@/lib/encryption'

export async function getAnthropicKey(accountId: string): Promise<string> {
  // TODO: accountId should come from the authenticated session in a multi-tenant future
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('account_settings')
    .select('anthropic_api_key_encrypted')
    .eq('account_id', accountId)
    .single()

  if (!error && data?.anthropic_api_key_encrypted) {
    return decrypt(data.anthropic_api_key_encrypted)
  }

  // Fallback for local dev only
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY
  }

  throw new Error('No Anthropic API key configured. Please add your API key in Settings.')
}
