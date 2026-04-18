import { test as setup, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const AUTH_FILE = 'tests/.auth/user.json'

setup('authenticate as client', async ({ page }) => {
  const email = process.env.TEST_CLIENT_EMAIL
  const password = process.env.TEST_CLIENT_PASSWORD

  if (!email || !password) {
    throw new Error(
      'TEST_CLIENT_EMAIL and TEST_CLIENT_PASSWORD must be set in .env.test'
    )
  }

  await page.goto('/login')

  await page.getByTestId('email-input').fill(email)
  await page.getByTestId('password-input').fill(password)
  await page.getByTestId('login-submit').click()

  // Wait for redirect after successful login
  await page.waitForURL('**/client**', { timeout: 15000 })
  await expect(page).toHaveURL(/\/client/)

  // Save auth cookies/storage so other tests skip the login step
  const dir = path.dirname(AUTH_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  await page.context().storageState({ path: AUTH_FILE })
})
