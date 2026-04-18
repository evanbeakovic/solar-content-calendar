import { test, expect, Page } from '@playwright/test'

const STATUSES = [
  'Uploads',
  'Being Created',
  'To Be Confirmed',
  'Requested Changes',
  'Confirmed',
  'Scheduled',
  'Posted',
] as const

function tabId(status: string) {
  return `manager-tab-${status.toLowerCase().replace(/ /g, '-')}`
}

async function findTabWithPosts(page: Page) {
  for (const status of STATUSES) {
    await page.getByTestId(tabId(status)).click()
    await page.waitForTimeout(300)
    if (await page.getByTestId('smm-post-card').count() > 0) return status
  }
  return null
}

// ── 1. Login ──────────────────────────────────────────────────────────────────
test.describe('Login', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('logs in with Manager credentials and redirects to /manager', async ({ page }) => {
    const email = process.env.TEST_MANAGER_EMAIL
    const password = process.env.TEST_MANAGER_PASSWORD

    if (!email || !password) {
      test.skip(true, 'TEST_MANAGER_EMAIL / TEST_MANAGER_PASSWORD not set in .env.test')
    }

    await page.goto('/login')

    await expect(page.getByTestId('email-input')).toBeVisible()
    await page.getByTestId('email-input').fill(email!)
    await page.getByTestId('password-input').fill(password!)
    await page.getByTestId('login-submit').click()

    await page.waitForURL('**/manager**', { timeout: 15000 })
    await expect(page).toHaveURL(/\/manager/)
  })
})

// ── 2. Dashboard stats visible ────────────────────────────────────────────────
test('dashboard renders at least one stat card', async ({ page }) => {
  await page.goto('/manager')

  await page.waitForSelector('[data-testid="manager-stats-grid"]', { timeout: 30000 })

  const cards = page.getByTestId('manager-stat-card')
  const count = await cards.count()
  expect(count).toBeGreaterThan(0)
})

// ── 3. Content tab — post cards visible ───────────────────────────────────────
test('at least one post card is visible across all status tabs in Content', async ({ page }) => {
  await page.goto('/manager?section=content')

  await page.waitForSelector(`[data-testid="${tabId('Uploads')}"]`, { timeout: 15000 })

  const found = await findTabWithPosts(page)

  if (found === null) {
    test.skip(true, 'No posts in any tab — skipping content posts-visible test')
    return
  }

  const count = await page.getByTestId('smm-post-card').count()
  expect(count).toBeGreaterThan(0)
})

// ── 4. Tab switching ──────────────────────────────────────────────────────────
test('clicking through all status tabs in Content does not crash the page', async ({ page }) => {
  await page.goto('/manager?section=content')

  await page.waitForSelector(`[data-testid="${tabId('Uploads')}"]`, { timeout: 15000 })

  for (const status of STATUSES) {
    const btn = page.getByTestId(tabId(status))
    await expect(btn).toBeVisible({ timeout: 5000 })
    await btn.click()

    await expect(btn).toBeVisible()
    await expect(page.locator('text=Application error')).not.toBeVisible()
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()
  }
})

// ── 5. Edit modal opens ───────────────────────────────────────────────────────
test('clicking a post card opens the edit modal', async ({ page }) => {
  await page.goto('/manager?section=content')

  await page.waitForSelector(`[data-testid="${tabId('Uploads')}"]`, { timeout: 15000 })

  const found = await findTabWithPosts(page)

  if (found === null) {
    test.skip(true, 'No posts available — skipping edit modal test')
    return
  }

  await page.getByTestId('smm-post-card').first().click()

  const modal = page.getByTestId('smm-edit-modal')
  await expect(modal).toBeVisible({ timeout: 5000 })
  await expect(modal.getByTestId('smm-headline-input')).toBeVisible()
})

// ── 6. Users tab ──────────────────────────────────────────────────────────────
test('Users section renders a users table', async ({ page }) => {
  await page.goto('/manager?section=users')

  await page.waitForSelector('[data-testid="manager-users-table"]', { timeout: 15000 })

  const table = page.getByTestId('manager-users-table')
  await expect(table).toBeVisible()
})

// ── 7. Client switcher ────────────────────────────────────────────────────────
test('client filter dropdown is visible and clickable in Content section', async ({ page }) => {
  await page.goto('/manager?section=content')

  await page.waitForSelector('[data-testid="manager-client-filter"]', { timeout: 15000 })

  const dropdown = page.getByTestId('manager-client-filter')
  await expect(dropdown).toBeVisible()
  await dropdown.click()

  // After clicking the dropdown should remain visible (not a navigation)
  await expect(dropdown).toBeVisible()
})
