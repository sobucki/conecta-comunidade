import { randomUUID } from 'node:crypto'
import { expect, test, type APIRequestContext } from '@playwright/test'

async function prepare(request: APIRequestContext) {
  const login = await request.post('/api/users/login', {
    data: {
      email: 'diretora@conecta.test',
      password: process.env.DEMO_PASSWORD,
    },
  })
  expect(login.ok()).toBeTruthy()
  const { token } = await login.json()
  const headers = { Authorization: `JWT ${token}` }
  const categories = await (
    await request.get('/api/categories?limit=1', { headers })
  ).json()
  const future = (days: number) =>
    new Date(Date.now() + days * 86400000).toISOString()
  const created = await request.post('/api/opportunities', {
    headers,
    data: {
      title: `Reparo para participação ${randomUUID().slice(0, 6)}`,
      description: 'Serviço fictício para testar a participação da comunidade.',
      category: categories.docs[0].id,
      location: 'Entrada da escola',
      fixedAmount: 650,
      applicationDeadline: future(2),
      executionStart: future(3),
      executionEnd: future(5),
      materialsResponsibility: 'school',
      toolsResponsibility: 'provider',
    },
  })
  expect(created.ok()).toBeTruthy()
  const { doc } = await created.json()
  expect(
    (
      await request.post(`/api/opportunities/${doc.id}/publish`, { headers })
    ).ok(),
  ).toBeTruthy()
  const conditions = await (
    await request.get(`/api/opportunities/${doc.id}/conditions`)
  ).json()
  return {
    opportunity: doc,
    headers,
    conditionsToken: conditions.conditionsToken,
  }
}

test('prestador se cadastra pelo link no celular, edita, retira, reenvia, acompanha e altera perfil', async ({
  page,
  request,
}) => {
  const { opportunity } = await prepare(request)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/oportunidades/${opportunity.id}`)
  await page.getByRole('link', { name: 'Quero me candidatar' }).click()
  await expect(page).toHaveURL(/\/entrar\?next=/)
  await page.getByRole('link', { name: 'Criar conta', exact: true }).click()
  const email = `participacao-${randomUUID()}@example.test`
  const password = 'Senha-ficticia-para-participacao'
  await page.getByLabel('Nome completo').fill('Pessoa Fictícia da Comunidade')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByLabel('Confirme a senha').fill(password)
  await page.getByLabel('Telefone de contato').fill('11977776666')
  await page.getByLabel('Vínculo com a comunidade').selectOption('local')
  await page.getByLabel('Confirmo que tenho 18 anos ou mais.').check()
  await page.getByLabel(/Aceito os termos de participação/).check()
  await page.getByRole('button', { name: 'Criar conta e continuar' }).click()
  await expect(page).toHaveURL(
    new RegExp(`/oportunidades/${opportunity.id}/candidatar$`),
  )
  await page
    .getByLabel('Sua disponibilidade')
    .fill('Terças e quintas, das 8h às 12h.')
  await page
    .getByLabel(/Apresentação e experiência/)
    .fill('Experiência fictícia em reparos.')
  await page.getByLabel(/Concordo com o valor total/).check()
  await page
    .getByRole('button', { name: 'Enviar candidatura', exact: true })
    .click()
  await expect(page).toHaveURL(/\/minhas-candidaturas\/\d+$/)
  const detailURL = page.url()
  await expect(
    page.getByText('Situação: Enviada', { exact: true }),
  ).toBeVisible()
  await expect(
    page
      .getByRole('heading', { name: 'Condições aceitas', exact: true })
      .first(),
  ).toBeVisible()
  await page
    .getByLabel('Sua disponibilidade')
    .fill('Somente às terças, pela manhã.')
  await page.getByLabel(/Concordo com o valor total/).check()
  await page.getByRole('button', { name: 'Salvar candidatura' }).click()
  await expect(page.getByLabel('Sua disponibilidade')).toHaveValue(
    'Somente às terças, pela manhã.',
  )
  await expect(
    page.getByText('Candidatura editada', { exact: true }),
  ).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Retirar candidatura' }).click()
  await expect(
    page.getByText('Situação: Retirada', { exact: true }),
  ).toBeVisible()
  await page.getByLabel(/Concordo com o valor total/).check()
  await page.getByRole('button', { name: 'Reenviar candidatura' }).click()
  await expect(
    page.getByText('Situação: Enviada', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('Candidatura reenviada', { exact: true }),
  ).toBeVisible()
  await expect(page.locator('.application-history li')).toHaveCount(4)
  await expect(page.getByRole('main')).toContainText(
    'não enviamos notificações automáticas',
  )
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy()
  await page.screenshot({
    path: '.tools/m3-candidatura-mobile.png',
    fullPage: true,
  })
  await page
    .getByRole('navigation', { name: 'Área do prestador' })
    .getByRole('link', { name: 'Meu perfil' })
    .click()
  await page
    .getByLabel('Apresentação profissional (opcional)')
    .fill('Atuo em pequenos reparos na comunidade.')
  await page.getByLabel('Pintura', { exact: true }).check()
  await page.getByRole('button', { name: 'Salvar perfil' }).click()
  await expect(page.getByRole('status').last()).toContainText(
    'Perfil atualizado.',
  )
  await page
    .getByRole('navigation', { name: 'Área do prestador' })
    .getByRole('link', { name: 'Minhas candidaturas' })
    .click()
  await expect(
    page.getByRole('heading', { name: opportunity.title, exact: true }),
  ).toBeVisible()
  await page.setViewportSize({ width: 1280, height: 900 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy()
  await page.screenshot({ path: '.tools/m3-minhas-candidaturas-desktop.jpg' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Sair da conta' }).click()
  await expect(page).toHaveURL(/\/entrar$/)
  await page.goto(`/oportunidades/${opportunity.id}/candidatar`)
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar e continuar' }).click()
  await expect(page).toHaveURL(detailURL)
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => /token/i.test(key)),
    ),
  ).toEqual([])
})

test('API mantém unicidade sob concorrência, nega acesso alheio e protege condições e histórico', async ({
  request,
  playwright,
}) => {
  const { opportunity, headers, conditionsToken } = await prepare(request)
  const candidate = await playwright.request.newContext({
    baseURL: 'http://localhost:3100',
    extraHTTPHeaders: { Origin: 'http://localhost:3100' },
  })
  const stranger = await playwright.request.newContext({
    baseURL: 'http://localhost:3100',
    extraHTTPHeaders: { Origin: 'http://localhost:3100' },
  })
  try {
    expect(
      (
        await candidate.post('/api/users/login', {
          data: {
            email: 'prestador@conecta.test',
            password: process.env.DEMO_PASSWORD,
          },
        })
      ).ok(),
    ).toBeTruthy()
    expect(
      (
        await stranger.post('/api/users/login', {
          data: {
            email: 'prestadora@conecta.test',
            password: process.env.DEMO_PASSWORD,
          },
        })
      ).ok(),
    ).toBeTruthy()
    const data = {
      availability: 'Durante a manhã.',
      accepted: true,
      conditionsToken,
    }
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        candidate.post(`/api/opportunities/${opportunity.id}/apply`, { data }),
      ),
    )
    expect(results.map((result) => result.status()).sort()).toEqual([
      201, 409, 409, 409,
    ])
    const { doc } = await results
      .find((response) => response.status() === 201)!
      .json()
    expect((await stranger.get(`/api/applications/${doc.id}`)).ok()).toBeFalsy()
    expect(
      (
        await stranger.post(`/api/applications/${doc.id}/withdraw`, {
          data: { expectedRevision: doc.revision },
        })
      ).ok(),
    ).toBeFalsy()
    expect(
      (
        await candidate.patch(`/api/applications/${doc.id}`, {
          data: { status: 'WITHDRAWN' },
        })
      ).ok(),
    ).toBeFalsy()
    expect(
      (
        await request.patch(`/api/opportunities/${opportunity.id}`, {
          headers,
          data: { fixedAmount: 999 },
        })
      ).status(),
    ).toBe(409)
    const ownEvents = await (
      await candidate.get(
        `/api/application-events?where[application][equals]=${doc.id}`,
      )
    ).json()
    const foreignEvents = await (
      await stranger.get(
        `/api/application-events?where[application][equals]=${doc.id}`,
      )
    ).json()
    expect(ownEvents.docs).toHaveLength(1)
    expect(foreignEvents.docs).toHaveLength(0)
    expect(
      (
        await request.patch(`/api/application-events/${ownEvents.docs[0].id}`, {
          headers,
          data: { action: 'withdraw' },
        })
      ).ok(),
    ).toBeFalsy()
  } finally {
    await candidate.dispose()
    await stranger.dispose()
  }
})

test('diretora consulta candidato identificado no painel pelo celular sem catálogo geral', async ({
  page,
  request,
  playwright,
}) => {
  const { opportunity, conditionsToken } = await prepare(request)
  const candidate = await playwright.request.newContext({
    baseURL: 'http://localhost:3100',
    extraHTTPHeaders: { Origin: 'http://localhost:3100' },
  })
  let applicationID: number
  try {
    await candidate.post('/api/users/login', {
      data: {
        email: 'prestador@conecta.test',
        password: process.env.DEMO_PASSWORD,
      },
    })
    const response = await candidate.post(
      `/api/opportunities/${opportunity.id}/apply`,
      {
        data: {
          availability: 'Quarta-feira, das 8h às 11h.',
          accepted: true,
          conditionsToken,
        },
      },
    )
    expect(response.ok()).toBeTruthy()
    applicationID = (await response.json()).doc.id
  } finally {
    await candidate.dispose()
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/admin/login')
  await page.getByLabel(/^Email/).fill('diretora@conecta.test')
  await page.getByLabel(/^Senha/).fill(process.env.DEMO_PASSWORD!)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await page.goto(`/admin/collections/opportunities/${opportunity.id}`)
  await page.getByRole('link', { name: 'Consultar candidatos' }).click()
  await expect(page).toHaveURL(/applications\?where/)
  await page
    .getByRole('link', { name: 'Prestador Demonstração', exact: true })
    .click()
  await expect(page).toHaveURL(
    new RegExp(`/admin/collections/applications/${applicationID}$`),
  )
  await expect(page.getByLabel(/^Nome do candidato/)).toHaveValue(
    'Prestador Demonstração',
  )
  await expect(page.getByLabel(/^Disponibilidade informada/)).toHaveValue(
    'Quarta-feira, das 8h às 11h.',
  )
  await expect(page.getByLabel(/^Telefone de contato/)).toHaveValue(
    '(00) 00000-0000',
  )
  await expect(
    page.getByRole('heading', { name: 'Condições aceitas' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Salvar', exact: true }),
  ).toHaveCount(0)
  await page.screenshot({
    path: '.tools/m3-consulta-diretora-mobile.png',
    fullPage: true,
  })
  expect(
    await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
    })),
  ).toEqual({ viewport: 390, document: 390 })
})

test('exige nova conferência quando as condições mudam antes do primeiro envio', async ({
  page,
  request,
}) => {
  const { opportunity, headers } = await prepare(request)
  await page.request.post('/api/users/login', {
    data: {
      email: 'prestador@conecta.test',
      password: process.env.DEMO_PASSWORD,
    },
  })
  await page.goto(`/oportunidades/${opportunity.id}/candidatar`)
  expect(
    (
      await request.patch(`/api/opportunities/${opportunity.id}`, {
        headers,
        data: { fixedAmount: 800 },
      })
    ).ok(),
  ).toBeTruthy()
  await page.getByLabel('Sua disponibilidade').fill('Durante a manhã.')
  await page.getByLabel(/Concordo com o valor total/).check()
  await page
    .getByRole('button', { name: 'Enviar candidatura', exact: true })
    .click()
  await expect(page.getByRole('status').last()).toContainText(
    'As condições da oportunidade foram atualizadas.',
  )
  await page.reload()
  await expect(page.getByRole('main')).toContainText(/800,00/)
  await page.getByLabel('Sua disponibilidade').fill('Durante a manhã.')
  await page.getByLabel(/Concordo com o valor total/).check()
  await page
    .getByRole('button', { name: 'Enviar candidatura', exact: true })
    .click()
  await expect(page).toHaveURL(/\/minhas-candidaturas\/\d+$/)
})

test('não redireciona login para endereço externo e mantém páginas e APIs públicas sem candidatos', async ({
  page,
  request,
  playwright,
}) => {
  const { opportunity, conditionsToken } = await prepare(request)
  await page.goto('/entrar?next=https://example.com')
  await page
    .getByLabel('E-mail', { exact: true })
    .fill('prestador@conecta.test')
  await page
    .getByLabel('Senha', { exact: true })
    .fill(process.env.DEMO_PASSWORD!)
  await page.getByRole('button', { name: 'Entrar e continuar' }).click()
  await expect(page).toHaveURL(/\/minhas-candidaturas$/)
  const response = await page.request.post(
    `/api/opportunities/${opportunity.id}/apply`,
    {
      headers: { Origin: 'http://localhost:3100' },
      data: { availability: 'Pela manhã.', accepted: true, conditionsToken },
    },
  )
  expect(response.ok()).toBeTruthy()
  const anonymous = await playwright.request.newContext({
    baseURL: 'http://localhost:3100',
    extraHTTPHeaders: { Origin: 'http://localhost:3100' },
  })
  try {
    expect((await anonymous.get('/api/applications')).ok()).toBeFalsy()
    expect((await anonymous.get('/api/application-events')).ok()).toBeFalsy()
    const publicPage = await anonymous.get(`/oportunidades/${opportunity.id}`)
    expect(await publicPage.text()).not.toContain('prestador@conecta.test')
    const publicRecord = await (
      await anonymous.get(`/api/opportunities/${opportunity.id}?depth=4`)
    ).text()
    expect(publicRecord).not.toContain('prestador@conecta.test')
    expect(publicRecord).not.toContain('candidateName')
  } finally {
    await anonymous.dispose()
  }
})
