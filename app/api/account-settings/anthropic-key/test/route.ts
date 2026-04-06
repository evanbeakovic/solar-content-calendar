import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicKey } from '@/lib/getAnthropicKey'

export async function POST(req: NextRequest) {
  try {
    const { account_id } = await req.json().catch(() => ({}))
    // TODO: account_id should come from the authenticated session in a multi-tenant future
    const resolvedAccountId = account_id || 'default'

    const apiKey = await getAnthropicKey(resolvedAccountId)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message || 'API key test failed')
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
