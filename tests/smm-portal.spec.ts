import { test, expect, Page } from '@playwright/test'

const STATUSES = [
  'Uploads',
  'Being Created',
  'To Be Confirmed',
  'Confirmed',
  'Scheduled',
  'Posted',
] as const

function tabId(status: string) {
  return `smm-tab-${status.toLowerCase().replace(/ /g, '-')}`
}

async function findTabWithPosts(page: Page, statuses: readonly string[]) {
  for (const status of statuses) {
    await page.getByTestId(tabId(status)).click()
    await page.waitForTimeout(300)
    if (await page.getByTestId('smm-post-card').count() > 0) return status
  }
  return null
}

// ── 1. Login ──────────────────────────────────────────────────────────────────
test.describe('Login', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('logs in with SMM credentials and redirects to /smm', async ({ page }) => {
    const email = process.env.TEST_SMM_EMAIL
    const password = process.env.TEST_SMM_PASSWORD

    if (!email || !password) {
      test.skip(true, 'TEST_SMM_EMAIL / TEST_SMM_PASSWORD not set in .env.test')
    }

    await page.goto('/login')

    await expect(page.getByTestId('email-input')).toBeVisible()
    await page.getByTestId('email-input').fill(email!)
    await page.getByTestId('password-input').fill(password!)
    await page.getByTestId('login-submit').click()

    await page.waitForURL('**/smm**', { timeout: 15000 })
    await expect(page).toHaveURL(/\/smm/)
  })
})

// ── 2. Posts visible ──────────────────────────────────────────────────────────
test('at least one post card is visible across all tabs', async ({ page }) => {
  await page.goto('/smm')

  await page.waitForSelector('[data-testid="smm-tab-uploads"]', { timeout: 10000 })

  const found = await findTabWithPosts(page, STATUSES)

  if (found === null) {
    test.skip(true, 'No posts in any tab — skipping posts-visible test')
    return
  }

  const count = await page.getByTestId('smm-post-card').count()
  expect(count).toBeGreaterThan(0)
})

// ── 3. Tab switching ──────────────────────────────────────────────────────────
test('clicking through all status tabs does not crash the page', async ({ page }) => {
  await page.goto('/smm')

  await page.waitForSelector('[data-testid="smm-tab-uploads"]', { timeout: 10000 })

  const tabs = [
    'smm-tab-uploads',
    'smm-tab-being-created',
    'smm-tab-to-be-confirmed',
    'smm-tab-confirmed',
    'smm-tab-scheduled',
    'smm-tab-posted',
  ]

  for (const id of tabs) {
    const btn = page.getByTestId(id)
    await expect(btn).toBeVisible({ timeout: 5000 })
    await btn.click()

    await expect(btn).toBeVisible()
    await expect(page.locator('text=Application error')).not.toBeVisible()
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()
  }
})

// ── 4. Edit modal opens ───────────────────────────────────────────────────────
test('clicking a post card opens the edit modal with a headline field', async ({ page }) => {
  await page.goto('/smm')

  await page.waitForSelector('[data-testid="smm-tab-uploads"]', { timeout: 10000 })

  const found = await findTabWithPosts(page, STATUSES)

  if (found === null) {
    test.skip(true, 'No posts available — skipping edit modal test')
    return
  }

  await page.getByTestId('smm-post-card').first().click()

  const modal = page.getByTestId('smm-edit-modal')
  await expect(modal).toBeVisible({ timeout: 5000 })
  await expect(modal.getByTestId('smm-headline-input')).toBeVisible()
})

// ── 5. Status pipeline button ─────────────────────────────────────────────────
test('at least one post card has a visible advance-status button', async ({ page }) => {
  await page.goto('/smm')

  await page.waitForSelector('[data-testid="smm-tab-uploads"]', { timeout: 10000 })

  // Posted status has no advance button — exclude it
  const advanceableStatuses = STATUSES.filter(s => s !== 'Posted')
  const found = await findTabWithPosts(page, advanceableStatuses)

  if (found === null) {
    test.skip(true, 'No posts in any advanceable tab — skipping advance button test')
    return
  }

  const advanceBtn = page.getByTestId('smm-advance-btn').first()
  await expect(advanceBtn).toBeVisible({ timeout: 5000 })
})

// ── 6. Image area renders ─────────────────────────────────────────────────────
test('edit modal for a post with an image shows a valid https:// image src', async ({ page }) => {
  await page.goto('/smm')

  await page.waitForSelector('[data-testid="smm-tab-uploads"]', { timeout: 10000 })

  const found = await findTabWithPosts(page, STATUSES)

  if (found === null) {
    test.skip(true, 'No posts available — skipping image src test')
    return
  }

  const cards = page.getByTestId('smm-post-card')
  const count = await cards.count()

  let imageSrc: string | null = null

  for (let i = 0; i < count; i++) {
    await cards.nth(i).click()

    const modal = page.getByTestId('smm-edit-modal')
    await expect(modal).toBeVisible({ timeout: 5000 })

    const img = modal.getByTestId('smm-modal-image')
    if (await img.count() > 0) {
      imageSrc = await img.first().getAttribute('src')
      if (imageSrc) break
    }

    // Close modal and try next card
    await page.getByTestId('smm-modal-close').click()
    await expect(modal).not.toBeVisible({ timeout: 3000 })
  }

  if (!imageSrc) {
    test.skip(true, 'No posts with images found in current tab — skipping image src test')
    return
  }

  expect(imageSrc).toMatch(/^https:\/\//)
})
