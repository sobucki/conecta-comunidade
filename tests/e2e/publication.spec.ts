import { randomUUID } from 'node:crypto'
import {
  expect,
  request as apiRequest,
  test,
  type APIRequestContext,
} from '@playwright/test'
import sharp from 'sharp'

test('gestora preenche o formulário e envia uma foto pelo painel no celular', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/admin/login')
  await page.getByLabel(/^Email/).fill('diretora@conecta.test')
  await page.getByLabel(/^Senha/).fill(process.env.DEMO_PASSWORD!)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await page.goto('/admin/collections/opportunities/create')
  const title = `Reparo cadastrado pelo formulário ${randomUUID().slice(0, 6)}`
  await page.getByLabel(/^Título do reparo/).fill(title)
  await page
    .getByLabel(/^Descrição do serviço/)
    .fill('Descrição fictícia preenchida no painel da gestora.')
  await page.locator('#field-category').getByRole('combobox').click()
  await page.getByRole('option', { name: 'Pintura', exact: true }).click()
  await page.getByLabel(/^Local de execução/).fill('Muro de entrada')
  await page.getByLabel(/^Valor oferecido/).fill('500.50')
  const future = (days: number) =>
    new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(Date.now() + days * 86400000))
  await page
    .locator('#field-applicationDeadline')
    .getByRole('textbox')
    .fill(`${future(2)} 18:00`)
  await page
    .locator('#field-applicationDeadline')
    .getByRole('textbox')
    .press('Tab')
  await page
    .locator('#field-executionStart')
    .getByRole('textbox')
    .fill(future(3))
  await page.locator('#field-executionStart').getByRole('textbox').press('Tab')
  await page.locator('#field-executionEnd').getByRole('textbox').fill(future(5))
  await page.locator('#field-executionEnd').getByRole('textbox').press('Tab')
  await page
    .locator('#field-materialsResponsibility')
    .getByRole('combobox')
    .click()
  await page.getByRole('option', { name: 'Escola', exact: true }).click()
  await page.locator('#field-toolsResponsibility').getByRole('combobox').click()
  await page.getByRole('option', { name: 'Prestador', exact: true }).click()
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/collections\/opportunities\/\d+$/)
  await page
    .locator('#field-photos')
    .getByRole('button', { name: 'Criar Novo', exact: true })
    .click()
  const buffer = await sharp({
    create: { width: 900, height: 650, channels: 3, background: '#83a98c' },
  })
    .png()
    .toBuffer()
  await page
    .locator('.bulk-upload--add-files input[type="file"]')
    .setInputFiles({
      name: 'parede-do-formulario.png',
      mimeType: 'image/png',
      buffer,
    })
  await page
    .locator('.bulk-upload--file-manager .field-type.text')
    .filter({ hasText: 'O que aparece na foto?' })
    .getByRole('textbox')
    .fill('Parede fictícia cadastrada pelo formulário')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Salvar', exact: true })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Publicar oportunidade' }),
  ).toBeEnabled()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Publicar oportunidade' }).click()
  await expect(
    page.getByRole('link', { name: 'Ver página pública' }),
  ).toBeVisible()
})

async function prepare(request: APIRequestContext, role = 'diretora') {
  const login = await request.post('/api/users/login', {
    data: {
      email: `${role}@conecta.test`,
      password: process.env.DEMO_PASSWORD,
    },
  })
  expect(login.ok()).toBeTruthy()
  const { token, user } = await login.json()
  const headers = { Authorization: `JWT ${token}` }
  const categories = await (
    await request.get('/api/categories?limit=1', { headers })
  ).json()
  const response = await request.post('/api/opportunities', {
    headers,
    data: {
      title: `Pintura de teste ${randomUUID().slice(0, 8)}`,
      description:
        'Preparar e pintar o muro da escola. Conteúdo fictício de teste.',
      category: categories.docs[0].id,
      school: typeof user.school === 'object' ? user.school.id : user.school,
      location: 'Muro de entrada',
      fixedAmount: 500.5,
      applicationDeadline: new Date(Date.now() + 86400000).toISOString(),
      executionStart: new Date(Date.now() + 2 * 86400000).toISOString(),
      executionEnd: new Date(Date.now() + 5 * 86400000).toISOString(),
      materialsResponsibility: 'school',
      toolsResponsibility: 'provider',
    },
  })
  expect(response.ok()).toBeTruthy()
  return { headers, user, opportunity: (await response.json()).doc }
}

test('gestora publica com foto pelo celular; original e miniatura respeitam a publicação', async ({
  page,
  request,
}) => {
  const { headers, user, opportunity } = await prepare(request)
  const buffer = await sharp({
    create: { width: 900, height: 650, channels: 3, background: '#83a98c' },
  })
    .png()
    .toBuffer()
  const upload = await request.post('/api/media', {
    headers,
    multipart: {
      _payload: JSON.stringify({
        alt: 'Parede de teste antes da pintura',
        school: typeof user.school === 'object' ? user.school.id : user.school,
      }),
      file: {
        name: `parede-${randomUUID()}.png`,
        mimeType: 'image/png',
        buffer,
      },
    },
  })
  expect(upload.ok()).toBeTruthy()
  const media = (await upload.json()).doc
  const attach = await request.patch(`/api/opportunities/${opportunity.id}`, {
    headers,
    data: { photos: [media.id] },
  })
  expect(attach.ok()).toBeTruthy()
  const anonymous = await apiRequest.newContext({
    baseURL: 'http://localhost:3100',
  })
  try {
    for (const url of [media.url, media.sizes.thumbnail.url])
      expect((await anonymous.get(url)).ok()).toBe(false)
    const draftPage = await anonymous.get(`/oportunidades/${opportunity.id}`)
    expect(draftPage.status()).toBe(404)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/admin/login')
    await page.getByLabel(/^Email/).fill('diretora@conecta.test')
    await page.getByLabel(/^Senha/).fill(process.env.DEMO_PASSWORD!)
    await page.getByRole('button', { name: 'Login', exact: true }).click()
    await expect(page).toHaveURL(/\/admin$/)
    await page.goto(`/admin/collections/opportunities/${opportunity.id}`)
    await expect(
      page.getByRole('button', { name: 'Publicar oportunidade' }),
    ).toBeEnabled()
    await page
      .getByLabel(/^Título do reparo/)
      .fill(`${opportunity.title} atualizado`)
    await expect(
      page.getByRole('button', { name: 'Publicar oportunidade' }),
    ).toBeDisabled()
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(
      page.getByRole('button', { name: 'Publicar oportunidade' }),
    ).toBeEnabled()
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Publicar oportunidade' }).click()
    await expect(
      page.getByRole('link', { name: 'Ver página pública' }),
    ).toBeVisible()
    for (const url of [media.url, media.sizes.thumbnail.url]) {
      const response = await anonymous.get(url)
      expect(response.ok()).toBe(true)
      expect(response.headers()['cache-control']).toContain('no-store')
    }
    const proxy = await anonymous.get(
      `/_next/image?url=${encodeURIComponent(new URL(media.url).pathname)}&w=640&q=75`,
    )
    expect(proxy.ok()).toBe(false)
    const publicPage = await anonymous.get(`/oportunidades/${opportunity.id}`)
    expect(publicPage.ok()).toBe(true)
    expect(await publicPage.text()).not.toContain('diretora@conecta.test')
    const remove = await request.patch(`/api/opportunities/${opportunity.id}`, {
      headers,
      data: { photos: [] },
    })
    expect(remove.ok()).toBeTruthy()
    for (const url of [media.url, media.sizes.thumbnail.url])
      expect((await anonymous.get(url)).ok()).toBe(false)
  } finally {
    await anonymous.dispose()
  }
})

test('visitante consulta condições e compartilha o link direto sem cadastro', async ({
  page,
  request,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: 'http://localhost:3100',
  })
  const { headers, opportunity } = await prepare(request)
  const publish = await request.post(
    `/api/opportunities/${opportunity.id}/publish`,
    { headers },
  )
  expect(publish.ok()).toBeTruthy()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/oportunidades/${opportunity.id}`)
  await expect(
    page.getByRole('heading', { name: opportunity.title }),
  ).toBeVisible()
  await expect(page.getByText('R$ 500,50', { exact: true })).toBeVisible()
  await expect(
    page.getByText('Fornecidos pela escola', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('Por conta do prestador', { exact: true }),
  ).toBeVisible()
  const share = await page
    .getByRole('link', { name: 'Compartilhar no WhatsApp' })
    .getAttribute('href')
  expect(new URL(share!).searchParams.get('text')).toContain(
    `http://localhost:3100/oportunidades/${opportunity.id}`,
  )
  await page.getByRole('button', { name: 'Copiar link' }).click()
  await expect(page.getByRole('status')).toContainText('Link copiado!')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `http://localhost:3100/oportunidades/${opportunity.id}`,
  )
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.setViewportSize({ width: 1280, height: 900 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: '.tools/m2-oportunidade-desktop.jpg',
    fullPage: true,
    quality: 90,
  })
})

test('listagem mostra somente oportunidades abertas no prazo e link antigo continua acessível', async ({
  page,
  request,
}) => {
  const { headers, user, opportunity } = await prepare(request)
  expect(
    (
      await request.post(`/api/opportunities/${opportunity.id}/publish`, {
        headers,
      })
    ).ok(),
  ).toBeTruthy()
  expect(
    (
      await request.patch(`/api/opportunities/${opportunity.id}`, {
        headers,
        data: {
          applicationDeadline: new Date(Date.now() - 86400000).toISOString(),
        },
      })
    ).ok(),
  ).toBeTruthy()
  const schoolID =
    typeof user.school === 'object' ? user.school.id : user.school
  const school = await (
    await request.get(`/api/schools/${schoolID}`, { headers })
  ).json()
  await page.goto(`/escolas/${school.slug}`)
  await expect(
    page.getByRole('link', { name: opportunity.title, exact: true }),
  ).toHaveCount(0)
  await page.goto(`/oportunidades/${opportunity.id}`)
  await expect(
    page.getByText('Inscrições encerradas', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: opportunity.title }),
  ).toBeVisible()
})

test('administrador edita apresentação; gestora não pode alterar conteúdo institucional', async ({
  page,
  request,
}) => {
  const login = await request.post('/api/users/login', {
    data: { email: 'admin@conecta.test', password: process.env.DEMO_PASSWORD },
  })
  const { token } = await login.json()
  const headers = { Authorization: `JWT ${token}` }
  const original = await (
    await request.get('/api/globals/site-content', { headers })
  ).json()
  const headline = `Comunidade conectada ${randomUUID().slice(0, 6)}`
  try {
    expect(
      (
        await request.post('/api/globals/site-content', {
          headers,
          data: { headline },
        })
      ).ok(),
    ).toBeTruthy()
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: headline, exact: true }),
    ).toBeVisible()
    const manager = await request.post('/api/users/login', {
      data: {
        email: 'diretora@conecta.test',
        password: process.env.DEMO_PASSWORD,
      },
    })
    const managerAuth = await manager.json()
    const denied = await request.post('/api/globals/site-content', {
      headers: { Authorization: `JWT ${managerAuth.token}` },
      data: { headline: 'Alteração não autorizada' },
    })
    expect([401, 403]).toContain(denied.status())
  } finally {
    expect(
      (
        await request.post('/api/globals/site-content', {
          headers,
          data: { headline: original.headline },
        })
      ).ok(),
    ).toBeTruthy()
  }
})
