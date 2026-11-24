import { randomUUID } from 'node:crypto'
import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from '@playwright/test'

async function login(request: APIRequestContext, account: string) {
  const response = await request.post('/api/users/login', {
    data: {
      email: `${account}@conecta.test`,
      password: process.env.DEMO_PASSWORD,
    },
  })
  expect(response.ok()).toBeTruthy()
  const result = await response.json()
  return {
    headers: { Authorization: `JWT ${result.token}` },
    user: result.user,
  }
}
async function prepare(request: APIRequestContext, deadline?: string) {
  const manager = await login(request, 'diretora')
  const category = (await (await request.get('/api/categories?limit=1')).json())
    .docs[0].id
  const future = (days: number) =>
    new Date(Date.now() + days * 86400000).toISOString()
  const response = await request.post('/api/opportunities', {
    headers: manager.headers,
    data: {
      title: `Reparo para seleção ${randomUUID().slice(0, 6)}`,
      description:
        'Serviço fictício para demonstrar seleção manual e exceções.',
      category,
      location: 'Entrada da escola',
      fixedAmount: 750,
      applicationDeadline: deadline || future(2),
      executionStart: future(3),
      executionEnd: future(5),
      materialsResponsibility: 'school',
      toolsResponsibility: 'provider',
    },
  })
  expect(response.ok()).toBeTruthy()
  const opportunity = (await response.json()).doc
  expect(
    (
      await request.post(`/api/opportunities/${opportunity.id}/publish`, {
        headers: manager.headers,
      })
    ).ok(),
  ).toBeTruthy()
  const conditions = await (
    await request.get(`/api/opportunities/${opportunity.id}/conditions`, {
      headers: manager.headers,
    })
  ).json()
  const candidates = []
  for (const account of ['prestador', 'prestadora']) {
    const provider = await login(request, account)
    const submission = await request.post(
      `/api/opportunities/${opportunity.id}/apply`,
      {
        headers: provider.headers,
        data: {
          availability: 'Terças e quintas, das 8h às 12h.',
          experience: 'Experiência fictícia para seleção.',
          accepted: true,
          conditionsToken: conditions.conditionsToken,
        },
      },
    )
    expect(submission.ok()).toBeTruthy()
    candidates.push({ ...provider, application: (await submission.json()).doc })
  }
  return { opportunity, manager, candidates }
}
async function managerLogin(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/admin/login')
  await page.getByLabel(/^Email/).fill('diretora@conecta.test')
  await page.getByLabel(/^Senha/).fill(process.env.DEMO_PASSWORD!)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/\/admin$/)
}

test('diretora encerra, confirma seleção, registra desistência e reconsidera pelo celular', async ({
  page,
  request,
}) => {
  const { opportunity, candidates } = await prepare(request)
  await managerLogin(page)
  await page.goto(
    `/admin/collections/applications/${candidates[0].application.id}`,
  )
  await expect(
    page.getByRole('button', { name: 'Selecionar candidato', exact: true }),
  ).toHaveCount(0)
  await expect(page.getByText(/Encerre as inscrições ou aguarde/)).toBeVisible()
  await page
    .getByRole('link', { name: 'Voltar à oportunidade e às decisões' })
    .click()
  page.once('dialog', (dialog) => dialog.accept())
  await page
    .getByRole('button', { name: 'Encerrar inscrições', exact: true })
    .click()
  await expect(
    page.getByRole('heading', {
      name: 'Inscrições encerradas, em análise',
      exact: true,
    }),
  ).toBeVisible()
  await page
    .getByRole('link', { name: 'Consultar candidatos', exact: true })
    .click()
  await page
    .getByRole('link', { name: 'Prestador Demonstração', exact: true })
    .click()
  page.once('dialog', (dialog) => dialog.dismiss())
  await page
    .getByRole('button', { name: 'Selecionar candidato', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Selecionar candidato', exact: true }),
  ).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page
    .getByRole('button', { name: 'Selecionar candidato', exact: true })
    .click()
  await expect(
    page.getByText(
      'Este candidato está selecionado, aguardando formalização externa.',
    ),
  ).toBeVisible()
  const other = await (
    await request.get(`/api/applications/${candidates[1].application.id}`, {
      headers: candidates[1].headers,
    })
  ).json()
  expect(other.status).toBe('NOT_SELECTED')
  await page
    .getByRole('link', { name: 'Voltar à oportunidade e às decisões' })
    .click()
  await page
    .getByRole('button', { name: 'Registrar desistência do selecionado' })
    .click()
  await expect(
    page.getByRole('button', { name: 'Confirmar desistência', exact: true }),
  ).toBeDisabled()
  const reason = 'Motivo administrativo fictício, restrito à gestão.'
  await page
    .getByLabel('Justificativa administrativa', { exact: true })
    .first()
    .fill(reason)
  page.once('dialog', (dialog) => dialog.accept())
  await page
    .getByRole('button', { name: 'Confirmar desistência', exact: true })
    .click()
  await expect(
    page.getByRole('heading', {
      name: 'Inscrições encerradas, em análise',
      exact: true,
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Encerrar inscrições', exact: true }),
  ).toHaveCount(0)
  await page
    .getByRole('link', { name: 'Consultar candidatos', exact: true })
    .click()
  await page
    .getByRole('link', { name: 'Prestadora Demonstração', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Selecionar candidato', exact: true }),
  ).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page
    .getByRole('button', { name: 'Selecionar candidato', exact: true })
    .click()
  await expect(
    page.getByText(
      'Este candidato está selecionado, aguardando formalização externa.',
    ),
  ).toBeVisible()
  await page
    .getByRole('link', { name: 'Voltar à oportunidade e às decisões' })
    .click()
  await page.getByText('Histórico de decisões', { exact: true }).click()
  await expect(page.getByText(reason, { exact: false })).toBeVisible()
  const mobilePanel = await page.locator('.decision-panel').boundingBox()
  const mobileTitle = await page.getByLabel(/^Título do reparo/).boundingBox()
  expect(mobilePanel!.y + mobilePanel!.height).toBeLessThanOrEqual(
    mobileTitle!.y,
  )
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy()
  await page.screenshot({
    path: '.tools/m4-selecao-mobile.png',
    fullPage: true,
  })
  await page.setViewportSize({ width: 1280, height: 900 })
  const desktopPanel = await page.locator('.decision-panel').boundingBox()
  const desktopTitle = await page.getByLabel(/^Título do reparo/).boundingBox()
  expect(desktopPanel!.y + desktopPanel!.height).toBeLessThanOrEqual(
    desktopTitle!.y,
  )
  await page.screenshot({ path: '.tools/m4-selecao-desktop.jpg' })
  const own = await (
    await request.get(`/api/applications/${candidates[1].application.id}`, {
      headers: candidates[1].headers,
    })
  ).json()
  expect(own.status).toBe('SELECTED')
  const previous = await (
    await request.get(`/api/applications/${candidates[0].application.id}`, {
      headers: candidates[0].headers,
    })
  ).json()
  expect(previous.status).toBe('SELECTED_WITHDRAWN')
})

test('encerra sem seleção com justificativa e mantém link público sem motivo administrativo', async ({
  page,
  request,
  playwright,
}) => {
  const { opportunity, candidates } = await prepare(request)
  await managerLogin(page)
  await page.goto(`/admin/collections/opportunities/${opportunity.id}`)
  page.once('dialog', (dialog) => dialog.accept())
  await page
    .getByRole('button', { name: 'Encerrar inscrições', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Encerrar sem seleção', exact: true })
    .click()
  await expect(
    page.getByRole('button', {
      name: 'Confirmar encerramento sem seleção',
      exact: true,
    }),
  ).toBeDisabled()
  const reason = 'Justificativa interna do encerramento fictício.'
  await page
    .getByLabel('Justificativa administrativa', { exact: true })
    .first()
    .fill(reason)
  page.once('dialog', (dialog) => dialog.accept())
  await page
    .getByRole('button', {
      name: 'Confirmar encerramento sem seleção',
      exact: true,
    })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Encerrada sem seleção', exact: true }),
  ).toBeVisible()
  const anonymous = await playwright.request.newContext({
    baseURL: 'http://localhost:3100',
  })
  try {
    const publicPage = await anonymous.get(`/oportunidades/${opportunity.id}`)
    const html = await publicPage.text()
    expect(publicPage.ok()).toBeTruthy()
    expect(html).toContain('Encerrada sem seleção')
    expect(html).not.toContain(reason)
    expect(html).not.toContain('Quero me candidatar')
    expect(html).not.toContain('prestador@conecta.test')
    expect(
      (
        await anonymous.get(
          `/api/opportunity-events?where[opportunity][equals]=${opportunity.id}`,
        )
      ).ok(),
    ).toBeFalsy()
  } finally {
    await anonymous.dispose()
  }
  await page.request.post('/api/users/logout', {
    headers: { Origin: 'http://localhost:3100' },
  })
  await page.goto(
    `/entrar?next=/minhas-candidaturas/${candidates[0].application.id}`,
  )
  await page
    .getByLabel('E-mail', { exact: true })
    .fill('prestador@conecta.test')
  await page
    .getByLabel('Senha', { exact: true })
    .fill(process.env.DEMO_PASSWORD!)
  await page.getByRole('button', { name: 'Entrar e continuar' }).click()
  await expect(
    page.getByText(
      'A direção encerrou esta oportunidade sem selecionar um candidato.',
      { exact: true },
    ),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Salvar candidatura' }),
  ).toHaveCount(0)
  await expect(page.getByRole('main')).not.toContainText(reason)
})

test('cancela pelo painel e preserva condições e situação no link antigo', async ({
  page,
  request,
  playwright,
}) => {
  const { opportunity, candidates } = await prepare(request)
  await managerLogin(page)
  await page.goto(`/admin/collections/opportunities/${opportunity.id}`)
  await page
    .getByRole('button', { name: 'Cancelar oportunidade', exact: true })
    .click()
  await page
    .getByLabel('Justificativa administrativa', { exact: true })
    .first()
    .fill('Motivo restrito de cancelamento fictício.')
  page.once('dialog', (dialog) => dialog.accept())
  await page
    .getByRole('button', { name: 'Confirmar cancelamento', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Oportunidade cancelada', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Encerrar inscrições', exact: true }),
  ).toHaveCount(0)
  const anonymous = await playwright.request.newContext({
    baseURL: 'http://localhost:3100',
  })
  try {
    const html = await (
      await anonymous.get(`/oportunidades/${opportunity.id}`)
    ).text()
    expect(html).toContain('Oportunidade cancelada')
    expect(html).toContain('750,00')
    expect(html).not.toContain('Motivo restrito')
    const record = await (
      await anonymous.get(`/api/opportunities/${opportunity.id}?depth=4`)
    ).json()
    expect(record).not.toHaveProperty('resolutionReason')
    expect(record).not.toHaveProperty('selectedApplication')
    expect(record).not.toHaveProperty('selectedBy')
  } finally {
    await anonymous.dispose()
  }
  for (const candidate of candidates)
    expect(
      (
        await (
          await request.get(`/api/applications/${candidate.application.id}`, {
            headers: candidate.headers,
          })
        ).json()
      ).status,
    ).toBe('CANCELLED')
})

test('seleções simultâneas e tentativas de prestador não deixam duas escolhas vigentes', async ({
  request,
}) => {
  const { opportunity, manager, candidates } = await prepare(request)
  const closed = await request.post(
    `/api/opportunities/${opportunity.id}/close`,
    {
      headers: manager.headers,
      data: { expectedRevision: 0, confirmed: true },
    },
  )
  expect(closed.ok()).toBeTruthy()
  const revision = (await closed.json()).doc.decisionRevision
  expect(
    (
      await request.post(`/api/opportunities/${opportunity.id}/select`, {
        headers: candidates[0].headers,
        data: {
          expectedRevision: revision,
          confirmed: true,
          applicationID: candidates[0].application.id,
          expectedApplicationRevision: 1,
        },
      })
    ).status(),
  ).toBe(403)
  const responses = await Promise.all(
    candidates.map((candidate) =>
      request.post(`/api/opportunities/${opportunity.id}/select`, {
        headers: manager.headers,
        data: {
          expectedRevision: revision,
          confirmed: true,
          applicationID: candidate.application.id,
          expectedApplicationRevision: candidate.application.revision,
        },
      }),
    ),
  )
  expect(responses.map((response) => response.status()).sort()).toEqual([
    200, 409,
  ])
  const states = await Promise.all(
    candidates.map(
      async (candidate) =>
        (
          await (
            await request.get(`/api/applications/${candidate.application.id}`, {
              headers: candidate.headers,
            })
          ).json()
        ).status,
    ),
  )
  expect(states.sort()).toEqual(['NOT_SELECTED', 'SELECTED'])
  // Ambas as áreas de prestador continuam restritas, independentemente do resultado.
  expect(
    (
      await request.get(`/api/applications/${candidates[1].application.id}`, {
        headers: candidates[0].headers,
      })
    ).ok(),
  ).toBeFalsy()
})

test('diretora seleciona após o prazo sem depender de atualização agendada', async ({
  page,
  request,
}) => {
  const { opportunity, manager, candidates } = await prepare(
    request,
    new Date(Date.now() + 6000).toISOString(),
  )
  await expect
    .poll(
      async () =>
        (
          await (
            await request.get(`/api/opportunities/${opportunity.id}`, {
              headers: manager.headers,
            })
          ).json()
        ).currentStatus,
      { timeout: 10000 },
    )
    .toBe('UNDER_REVIEW')
  await managerLogin(page)
  await page.goto(
    `/admin/collections/applications/${candidates[0].application.id}`,
  )
  await expect(
    page.getByRole('button', { name: 'Selecionar candidato', exact: true }),
  ).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page
    .getByRole('button', { name: 'Selecionar candidato', exact: true })
    .click()
  await expect(
    page.getByText(
      'Este candidato está selecionado, aguardando formalização externa.',
    ),
  ).toBeVisible()
})
