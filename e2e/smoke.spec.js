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

  test('navigation catégories annonces depuis les liens du header', async ({ page }) => {
    await page.goto(`${base}/annonces?type=location`)
    await expect(page.getByRole('heading', { name: /logements à louer/i })).toBeVisible()

    const desktopNav = page.locator('nav').first()
    await desktopNav.getByRole('button', { name: /acheter\/louer/i }).hover()
    await desktopNav.getByRole('link', { name: /^Acheter$/ }).click()
    await expect.poll(() => new URL(page.url()).searchParams.get('type')).toBe('vente')
    await expect(page.getByRole('heading', { name: /biens à vendre/i })).toBeVisible()

    await desktopNav.getByRole('link', { name: /services & pros/i }).click()
    await expect.poll(() => new URL(page.url()).searchParams.get('type')).toBe('prestations')
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
