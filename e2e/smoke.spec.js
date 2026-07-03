// @ts-check
const { test, expect } = require('@playwright/test')

const base = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test.describe('Smoke Chez Moi CI', () => {
  test('accueil et inscription', async ({ page }) => {
    const r = await page.goto(`${base}/`)
    expect(r?.ok()).toBeTruthy()
    await expect(page).toHaveTitle(/Chez Moi CI/i)
    await page.goto(`${base}/inscription`)
    await expect(page.getByRole('heading', { name: /créer un compte/i })).toBeVisible()
  })

  test('liste annonces et carte', async ({ page }) => {
    await page.goto(`${base}/annonces`)
    await expect(page.locator('body')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.goto(`${base}/carte`)
    await expect(page.locator('body')).toBeVisible()
  })

  test('navigation catégories annonces depuis le header', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(`${base}/annonces?type=location`)
    await expect(page.getByRole('heading', { name: /logements à louer/i })).toBeVisible()

    await page.getByRole('button', { name: /acheter\/louer/i }).hover()
    await page.getByRole('link', { name: /acheter/i }).click()
    await expect(page).toHaveURL(/\/annonces\?type=vente/)
    await expect(page.getByRole('heading', { name: /biens à vendre/i })).toBeVisible()

    await page.locator('header a[href="/annonces?type=prestations"]').first().click()
    await expect(page).toHaveURL(/\/annonces\?type=prestations/)
    await expect(page.getByRole('heading', { name: /prestataires & artisans/i })).toBeVisible()
  })

  test('services et artisans', async ({ page }) => {
    await page.goto(`${base}/services`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.goto(`${base}/artisans`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('connexion admin (page)', async ({ page }) => {
    await page.goto(`${base}/connexion`)
    await expect(page.getByRole('link', { name: /connexion/i }).first()).toBeVisible()
  })
})
