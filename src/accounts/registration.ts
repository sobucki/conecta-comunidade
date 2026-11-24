import { APIError, type PayloadRequest } from 'payload'
import { communityLinks } from './registration-options'

export async function registerProvider(
  req: PayloadRequest,
  input: Record<string, unknown>,
) {
  if (input.adultConfirmed !== true || input.termsAccepted !== true)
    throw new APIError(
      'Confirme a maioridade, o aceite dos termos e a ciência do aviso de privacidade.',
      400,
    )
  if (typeof input.password !== 'string' || input.password.length < 12)
    throw new APIError('Use uma senha com pelo menos 12 caracteres.', 400)
  const communityLink = communityLinks.find(
    ([value]) => value === input.communityLink,
  )?.[0]
  if (!communityLink)
    throw new APIError('Informe o vínculo com a comunidade.', 400)
  const content = await req.payload.findGlobal({
    slug: 'site-content',
    req,
    overrideAccess: false,
    depth: 0,
  })
  const school =
    typeof content.school === 'object' ? content.school?.id : content.school
  if (!school)
    throw new APIError(
      'O cadastro ainda não está disponível para esta escola.',
      409,
    )
  const previous = { ...req.context }
  req.context.publicRegistration = true
  try {
    // Lista explícita de campos; escola, papel, situação e aceite nunca vêm do cliente.
    const user = await req.payload.create({
      collection: 'users',
      req,
      overrideAccess: true,
      depth: 0,
      data: {
        name: typeof input.name === 'string' ? input.name.trim() : '',
        email:
          typeof input.email === 'string'
            ? input.email.trim().toLowerCase()
            : '',
        password: input.password,
        phone: typeof input.phone === 'string' ? input.phone.trim() : '',
        communityLink,
        adultConfirmed: true,
        termsAcceptedAt: new Date().toISOString(),
        role: 'provider',
        status: 'active',
        school,
      },
    })
    return { id: user.id }
  } finally {
    req.context = previous
  }
}

export async function registrationEndpoint(req: PayloadRequest) {
  const input = await req.json!()
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new APIError('Cadastro inválido.', 400)
  const result = await registerProvider(req, input)
  return Response.json(result, {
    status: 201,
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
