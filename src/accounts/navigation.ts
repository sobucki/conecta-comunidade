export function safeReturnPath(value: unknown) {
  if (typeof value !== 'string') return '/minhas-candidaturas'
  return /^\/oportunidades\/[1-9]\d*(?:\/candidatar)?$/.test(value) ||
    /^\/minhas-candidaturas(?:\/[1-9]\d*)?$/.test(value) ||
    value === '/perfil'
    ? value
    : '/minhas-candidaturas'
}
