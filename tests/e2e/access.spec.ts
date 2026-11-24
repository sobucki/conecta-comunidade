import { expect, test } from '@playwright/test'

test('gestora acessa o painel pelo celular e consulta somente sua escola', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/admin/login')
  await page.getByLabel(/^Email/).fill('diretora@conecta.test')
  await page.getByLabel(/^Senha/).fill(process.env.DEMO_PASSWORD!)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await page.goto('/admin/collections/schools')
  await expect(
    page.getByRole('link', { name: 'Escola Demonstração', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Escola Teste B', exact: true }),
  ).toHaveCount(0)
})

test('prestador autentica na API, mas não recebe acesso ao painel', async ({
  page,
}) => {
  const login = await page.request.post('/api/users/login', {
    data: {
      email: 'prestador@conecta.test',
      password: process.env.DEMO_PASSWORD,
    },
  })
  expect(login.ok()).toBeTruthy()
  const { token } = await login.json()
  const access = await page.request.get('/api/access', {
    headers: { Authorization: `JWT ${token}` },
  })
  expect(access.ok()).toBeTruthy()
  const permissions = await access.json()
  // O Payload remove propriedades false na serialização das permissões.
  expect(permissions.canAccessAdmin).toBeFalsy()
  const own = await page.request.get('/api/users', {
    headers: { Authorization: `JWT ${token}` },
  })
  const accounts = await own.json()
  expect(accounts.docs).toHaveLength(1)
  expect(accounts.docs[0].email).toBe('prestador@conecta.test')
  await page.goto('/admin')
  await expect(
    page.getByText('Você não tem permissão para acessar essa página.'),
  ).toBeVisible()
})

test('API pública não cadastra administradores nem expõe contas', async ({
  request,
}) => {
  const create = await request.post('/api/users', {
    data: {
      name: 'Não autorizado',
      email: 'intruso@example.test',
      role: 'admin',
      password: 'senha-comprida-de-teste',
    },
  })
  expect([401, 403]).toContain(create.status())
  const users = await request.get('/api/users')
  expect([401, 403]).toContain(users.status())
})

test('recuperação de senha oferece resposta genérica e funciona pelo celular', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/recuperar-acesso')
  await page.getByLabel('E-mail da sua conta').fill('nao-existe@example.test')
  await page.getByRole('button', { name: 'Enviar instruções' }).click()
  await expect(page.getByRole('status')).toHaveText(
    'Se houver uma conta com esse e-mail, você receberá as instruções de recuperação.',
  )
  await page.goto('/redefinir-senha?token=invalido')
  await page
    .getByLabel('Nova senha', { exact: true })
    .fill('nova-senha-segura-para-teste')
  await page
    .getByLabel('Confirme a nova senha')
    .fill('nova-senha-segura-para-teste')
  await page.getByRole('button', { name: 'Salvar nova senha' }).click()
  await expect(page.getByRole('status')).toContainText(
    'O link é inválido ou expirou.',
  )
})

test('administrador cadastra prestador e ele recupera a senha por um link real', async ({
  page,
  request,
}) => {
  const email = `recuperacao-e2e-${Date.now()}@example.test`
  const login = await request.post('/api/users/login', {
    data: { email: 'admin@conecta.test', password: process.env.DEMO_PASSWORD },
  })
  expect(login.ok()).toBeTruthy()
  const { token } = await login.json()
  const headers = { Authorization: `JWT ${token}` }
  const schools = await request.get(
    '/api/schools?where[slug][equals]=escola-demonstracao',
    { headers },
  )
  expect(schools.ok()).toBeTruthy()
  const { docs } = await schools.json()
  const incomplete = await request.post('/api/users', {
    headers,
    data: {
      name: 'Cadastro incompleto',
      email: `incompleto-${email}`,
      password: process.env.DEMO_PASSWORD,
      school: docs[0].id,
    },
  })
  expect(incomplete.status()).toBe(400)
  const create = await request.post('/api/users', {
    headers,
    data: {
      name: 'Prestador Teste Recuperação',
      email,
      password: process.env.DEMO_PASSWORD,
      role: 'provider',
      status: 'active',
      school: docs[0].id,
      phone: '(00) 00000-0000',
      communityLink: 'local',
      adultConfirmed: true,
      termsAcceptedAt: new Date().toISOString(),
    },
  })
  expect(create.ok()).toBeTruthy()
  await request.post('/api/users/logout')
  await page.goto('/recuperar-acesso')
  await page.getByLabel('E-mail da sua conta').fill(email)
  await page.getByRole('button', { name: 'Enviar instruções' }).click()
  await expect(page.getByRole('status')).toContainText('Se houver uma conta')
  const search = await request.get(
    `http://127.0.0.1:8025/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
  )
  const mailbox = await search.json()
  const message = await request.get(
    `http://127.0.0.1:8025/api/v1/message/${mailbox.messages[0].ID}`,
  )
  const mail = await message.json()
  const href = /href="([^"]+)"/.exec(mail.HTML)?.[1]
  expect(href).toBeTruthy()
  await page.goto(href!.replaceAll('&amp;', '&'))
  await page
    .getByLabel('Nova senha', { exact: true })
    .fill('Senha-atualizada-pelo-navegador!')
  await page
    .getByLabel('Confirme a nova senha')
    .fill('Senha-atualizada-pelo-navegador!')
  await page.getByRole('button', { name: 'Salvar nova senha' }).click()
  await expect(page.getByRole('status')).toContainText(
    'Sua senha foi atualizada.',
  )
  await expect(page).toHaveURL(/\/redefinir-senha$/)
  const verified = await request.post('/api/users/login', {
    data: { email, password: 'Senha-atualizada-pelo-navegador!' },
  })
  expect(verified.ok()).toBeTruthy()
})
