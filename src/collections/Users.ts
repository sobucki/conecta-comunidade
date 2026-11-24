import {
  APIError,
  ValidationError,
  type CollectionBeforeValidateHook,
  type CollectionConfig,
} from 'payload'
import {
  adminField,
  adminOnly,
  isActive,
  isAdministrator,
  managementPanel,
  ownAccountOrAdmin,
} from '../access'
import { auditChange } from '../hooks/audit'

const validateAccount: CollectionBeforeValidateHook = ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  // Bootstrap é um contexto interno da Local API, nunca um campo aceito pela API pública.
  if (
    operation === 'create' &&
    !isAdministrator(req.user) &&
    !req.context.bootstrap
  ) {
    throw new APIError(
      'O cadastro de contas é administrado pela escola nesta etapa.',
      403,
    )
  }
  const account = { ...originalDoc, ...data }
  account.role ??= 'provider'
  if (originalDoc && !isAdministrator(req.user) && !req.context.bootstrap) {
    account.role = originalDoc.role
    account.school = originalDoc.school
    account.status = originalDoc.status
    account.termsAcceptedAt = originalDoc.termsAcceptedAt
  }
  const errors: { path: string; message: string }[] = []
  if (account.role !== 'admin' && !account.school)
    errors.push({ path: 'school', message: 'Informe a escola.' })
  if (account.role === 'provider') {
    if (!account.phone)
      errors.push({ path: 'phone', message: 'Informe o telefone de contato.' })
    if (!account.communityLink)
      errors.push({
        path: 'communityLink',
        message: 'Informe o vínculo com a comunidade.',
      })
    if (account.adultConfirmed !== true)
      errors.push({
        path: 'adultConfirmed',
        message: 'Confirme que é maior de idade.',
      })
    if (!account.termsAcceptedAt)
      errors.push({
        path: 'termsAcceptedAt',
        message:
          'Registre o aceite dos termos e ciência do aviso de privacidade.',
      })
  }
  if (errors.length) throw new ValidationError({ errors })
  return data
}

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Usuário', plural: 'Usuários' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role', 'school', 'status'],
    hidden: ({ user }) => user?.role !== 'admin',
  },
  auth: {
    verify: false,
    maxLoginAttempts: 5,
    lockTime: 600_000,
    cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' },
    forgotPassword: {
      generateEmailSubject: () => 'Recupere seu acesso ao Conecta Comunidade',
      generateEmailHTML: (args) => {
        const link = new URL(
          '/redefinir-senha',
          process.env.APP_URL || 'http://localhost:3000',
        )
        link.searchParams.set('token', args?.token || '')
        return `<p>Recebemos um pedido para recuperar seu acesso ao Conecta Comunidade.</p><p><a href="${link.toString().replaceAll('&', '&amp;')}">Definir nova senha</a></p><p>Se você não solicitou, ignore esta mensagem.</p>`
      },
    },
  },
  access: {
    admin: managementPanel,
    create: adminOnly,
    read: ownAccountOrAdmin,
    update: ownAccountOrAdmin,
    delete: () => false,
    unlock: adminOnly,
  },
  hooks: {
    beforeValidate: [validateAccount],
    beforeLogin: [
      ({ user }) => {
        if (!isActive(user))
          throw new APIError(
            'Acesso indisponível. Procure a administração da escola.',
            403,
          )
        return user
      },
    ],
    afterChange: [auditChange],
  },
  fields: [
    {
      name: 'password',
      label: 'Senha',
      type: 'text',
      hidden: true,
      virtual: true,
      validate: (value: string | null | undefined) =>
        !value ||
        value.length >= 12 ||
        'Use uma senha com pelo menos 12 caracteres.',
    },
    { name: 'name', label: 'Nome completo', type: 'text', required: true },
    {
      name: 'role',
      label: 'Papel',
      type: 'select',
      required: true,
      defaultValue: 'provider',
      access: { create: adminField, update: adminField },
      options: [
        { label: 'Administrador', value: 'admin' },
        { label: 'Gestora', value: 'manager' },
        { label: 'Prestador', value: 'provider' },
      ],
    },
    {
      name: 'school',
      label: 'Escola',
      type: 'relationship',
      relationTo: 'schools',
      access: { create: adminField, update: adminField },
    },
    {
      name: 'status',
      label: 'Situação da conta',
      type: 'select',
      required: true,
      defaultValue: 'active',
      access: { create: adminField, update: adminField },
      options: [
        { label: 'Ativa', value: 'active' },
        { label: 'Bloqueada', value: 'blocked' },
      ],
    },
    { name: 'phone', label: 'Telefone de contato', type: 'text' },
    {
      name: 'communityLink',
      label: 'Vínculo com a comunidade',
      type: 'select',
      options: [
        { label: 'Pai, mãe ou responsável', value: 'guardian' },
        { label: 'Familiar de aluno', value: 'relative' },
        { label: 'Amigo ou conhecido de uma família', value: 'friend' },
        { label: 'Ex-aluno adulto', value: 'former-student' },
        { label: 'Comunidade local', value: 'local' },
        { label: 'Outro', value: 'other' },
      ],
    },
    {
      name: 'adultConfirmed',
      label: 'Maioridade confirmada',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'termsAcceptedAt',
      label: 'Aceite dos termos e ciência do aviso de privacidade',
      type: 'date',
      access: { create: adminField, update: adminField },
    },
    {
      name: 'skills',
      label: 'Habilidades',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
    },
    {
      name: 'professionalSummary',
      label: 'Apresentação profissional',
      type: 'textarea',
    },
  ],
}
