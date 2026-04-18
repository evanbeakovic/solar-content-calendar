import { test, expect } from '@playwright/test'

// ── 1. Login ─────────────────────────────────────────────────────────────────
// Run with a clean (unauthenticated) context so we exercise the real login flow.
test.describe('Login', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('logs in with client credentials and redirects to /client', async ({ page }) => {
    const email = process.env.TEST_CLIENT_EMAIL
    const password = process.env.TEST_CLIENT_PASSWORD

    if (!email || !password) {
      test.skip(true, 'TEST_CLIENT_EMAIL / TEST_CLIENT_PASSWORD not set in .env.test')
    }

    await page.goto('/login')

    await expect(page.getByTestId('email-input')).toBeVisible()
    await page.getByTestId('email-input').fill(email!)
    await page.getByTestId('password-input').fill(password!)
    await page.getByTestId('login-submit').click()

    await expect(page).toHaveURL(/\/client/, { timeout: 30000 })
  })
})

// ── 2. Content tab ────────────────────────────────────────────────────────────
test('post cards are visible in the active tab', async ({ page }) => {
  await page.goto('/client', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-testid="post-card"], [data-testid="tab-awaiting"]', { timeout: 30000 })

  // Wait for the grid — may need time for data to load
  await page.waitForSelector('[data-testid="post-card"]', { timeout: 30000 })

  const cards = page.getByTestId('post-card')
  const count = await cards.count()
  expect(count).toBeGreaterThan(0)

  // At least one card should show an actual image (not the placeholder SVG)
  const cardImages = page.getByTestId('post-card-image')
  const imgCount = await cardImages.count()
  expect(imgCount).toBeGreaterThan(0)

  const firstSrc = await cardImages.first().getAttribute('src')
  expect(firstSrc).toBeTruthy()
})

// ── 3. Modal ──────────────────────────────────────────────────────────────────
test('clicking a post card opens the modal with a visible image', async ({ page }) => {
  await page.goto('/client', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-testid="post-card"], [data-testid="tab-awaiting"]', { timeout: 30000 })

  await page.waitForSelector('[data-testid="post-card"]', { timeout: 30000 })

  // Click the first card that has an image so we know the modal will show one
  const cardWithImage = page.getByTestId('post-card').filter({
    has: page.getByTestId('post-card-image'),
  })

  // Fall back to any card if all lack images
  const target = (await cardWithImage.count()) > 0
    ? cardWithImage.first()
    : page.getByTestId('post-card').first()

  await target.click()

  // Modal overlay should appear
  const modal = page.getByTestId('post-modal')
  await expect(modal).toBeVisible({ timeout: 5000 })

  // The image inside the modal must have a src starting with https://
  const modalImg = modal.getByTestId('modal-image')
  const src = await modalImg.getAttribute('src')
  expect(src).toMatch(/^https:\/\//)
})

// ── 4. Approve flow ───────────────────────────────────────────────────────────
test('approving a post moves it out of Awaiting Your Review', async ({ page }) => {
  await page.goto('/client', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-testid="post-card"], [data-testid="tab-awaiting"]', { timeout: 30000 })

  // Make sure we're on the "Awaiting Your Review" tab
  await page.getByTestId('tab-awaiting').click()
  await page.waitForSelector('[data-testid="post-card"]', { timeout: 15000 }).catch(() => null)

  const awaitingCards = page.getByTestId('post-card')
  const initialCount = await awaitingCards.count()

  if (initialCount === 0) {
    test.skip(true, 'No posts in "Awaiting Your Review" — skipping approve flow test')
    return
  }

  // Click Approve on the first card
  const approveBtn = page.getByTestId('approve-btn').first()
  await expect(approveBtn).toBeVisible()
  await approveBtn.click()

  // After approval the count in Awaiting should decrease
  await page.waitForFunction(
    (count) => {
      const cards = document.querySelectorAll('[data-testid="post-card"]')
      return cards.length < count
    },
    initialCount,
    { timeout: 10000 }
  )

  const newCount = await awaitingCards.count()
  expect(newCount).toBeLessThan(initialCount)

  // Switch to Approved tab and verify the card is there
  await page.getByTestId('tab-approved').click()
  await page.waitForSelector('[data-testid="post-card"]', { timeout: 5000 }).catch(() => null)
  const approvedCards = await page.getByTestId('post-card').count()
  expect(approvedCards).toBeGreaterThan(0)
})

// ── 5. Tab switching ──────────────────────────────────────────────────────────
test('clicking through all tabs does not crash the page', async ({ page }) => {
  await page.goto('/client', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-testid="post-card"], [data-testid="tab-awaiting"]', { timeout: 30000 })

  const tabs = [
    { testId: 'tab-awaiting',   label: 'Awaiting Your Review' },
    { testId: 'tab-changes',    label: 'Changes Requested' },
    { testId: 'tab-approved',   label: 'Approved' },
    { testId: 'tab-scheduled',  label: 'Scheduled' },
    { testId: 'tab-published',  label: 'Published' },
  ]

  for (const tab of tabs) {
    const btn = page.getByTestId(tab.testId)
    await expect(btn).toBeVisible({ timeout: 5000 })
    await btn.click()

    // Each tab switch should not throw — verify tab is still rendered
    await expect(btn).toBeVisible()

    // No error boundaries or crash messages should appear
    await expect(page.locator('text=Application error')).not.toBeVisible()
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()
  }
})
