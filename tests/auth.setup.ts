import { test as setup, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const AUTH_FILE = 'tests/.auth/user.json'
const SMM_AUTH_FILE = 'tests/.auth/smm.json'
const MANAGER_AUTH_FILE = 'tests/.auth/manager.json'

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

setup('authenticate as SMM', async ({ page }) => {
  const email = process.env.TEST_SMM_EMAIL
  const password = process.env.TEST_SMM_PASSWORD

  if (!email || !password) {
    throw new Error(
      'TEST_SMM_EMAIL and TEST_SMM_PASSWORD must be set in .env.test'
    )
  }

  await page.goto('/login')

  await page.getByTestId('email-input').fill(email)
  await page.getByTestId('password-input').fill(password)
  await page.getByTestId('login-submit').click()

  await page.waitForURL('**/smm**', { timeout: 15000 })
  await expect(page).toHaveURL(/\/smm/)

  const dir = path.dirname(SMM_AUTH_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  await page.context().storageState({ path: SMM_AUTH_FILE })
})

setup('authenticate as Manager', async ({ page }) => {
  const email = process.env.TEST_MANAGER_EMAIL
  const password = process.env.TEST_MANAGER_PASSWORD

  if (!email || !password) {
    throw new Error(
      'TEST_MANAGER_EMAIL and TEST_MANAGER_PASSWORD must be set in .env.test'
    )
  }

  await page.goto('/login')

  await page.getByTestId('email-input').fill(email)
  await page.getByTestId('password-input').fill(password)
  await page.getByTestId('login-submit').click()

  await page.waitForURL('**/manager**', { timeout: 15000 })
  await expect(page).toHaveURL(/\/manager/)

  const dir = path.dirname(MANAGER_AUTH_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  await page.context().storageState({ path: MANAGER_AUTH_FILE })
})
