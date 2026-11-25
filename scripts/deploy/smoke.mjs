const base = new URL(process.env.APP_URL || '')
if (base.protocol !== 'https:') throw new Error('APP_URL deve usar HTTPS.')
for (const route of ['/', '/cadastro', '/entrar', '/recuperar-acesso', '/termos', '/privacidade', '/suporte', '/admin/login']) {
  const response = await fetch(new URL(route, base), { signal: AbortSignal.timeout(30_000), redirect: 'manual' })
  if (response.status !== 200) throw new Error(`Falha em ${route}: HTTP ${response.status}`)
  console.info(`OK ${route}`)
}
const metrics = await fetch(new URL('/api/pilot-metrics', base), { signal: AbortSignal.timeout(30_000), redirect: 'manual' })
if (![401, 403].includes(metrics.status)) throw new Error('Indicadores não recusaram acesso anônimo.')
console.info('Verificação HTTP concluída. Executar também o roteiro autenticado e a entrega de e-mail do M6.')
