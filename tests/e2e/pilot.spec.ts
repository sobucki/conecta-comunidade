import { test, expect } from '@playwright/test'
test('diretora consulta indicadores agregados pelo celular; visitante não acessa API', async ({
  page,
  request,
}) => {
  expect(
    (
      await request.get('/api/pilot-metrics?inicio=2026-01-01&fim=2026-12-31')
    ).status(),
  ).toBe(403)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/admin/login')
  await page.getByLabel(/^Email/).fill('diretora@conecta.test')
  await page.getByLabel(/^Senha/).fill(process.env.DEMO_PASSWORD!)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await page.goto('/admin/globals/pilot-dashboard')
  await page.getByLabel('Início', { exact: true }).fill('2026-01-01')
  await page.getByLabel('Fim', { exact: true }).fill('2026-12-31')
  await page
    .getByRole('button', { name: 'Consultar indicadores', exact: true })
    .click()
  await expect(
    page.getByText('Escola autorizada', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('Tempo médio até a primeira candidatura', { exact: true }),
  ).toBeVisible()
  await page.screenshot({
    path: '.tools/m5-indicadores-mobile.png',
    fullPage: true,
  })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy()
})
test('suporte apresenta pendências sem inventar contato', async ({ page }) => {
  await page.goto('/suporte')
  await expect(
    page.getByRole('heading', { name: 'Suporte e privacidade' }),
  ).toBeVisible()
  await expect(
    page.getByText(/canal de atendimento ainda precisa/),
  ).toBeVisible()
})
