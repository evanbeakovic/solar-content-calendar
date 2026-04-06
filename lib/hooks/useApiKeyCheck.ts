'use client'

import { useState, useEffect, useCallback } from 'react'

// TODO: account_id should come from the authenticated session in a multi-tenant future
const ACCOUNT_ID = 'default'

interface ApiKeyCheckResult {
  hasKey: boolean | null
  checking: boolean
  recheckKey: () => void
}

export function useApiKeyCheck(): ApiKeyCheckResult {
  const [hasKey, setHasKey] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(true)

  const recheckKey = useCallback(async () => {
    setChecking(true)
    try {
      const res = await fetch(`/api/account-settings/anthropic-key?account_id=${ACCOUNT_ID}`)
      const data = await res.json()
      setHasKey(data.hasKey ?? false)
    } catch {
      setHasKey(false)
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    recheckKey()
  }, [recheckKey])

  return { hasKey, checking, recheckKey }
}
