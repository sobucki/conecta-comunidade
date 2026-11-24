import {
  APIError,
  type CollectionBeforeValidateHook,
  type CollectionConfig,
  type PayloadRequest,
} from 'payload'
import { managementPanel } from '../access'
import { auditChange } from '../hooks/audit'
import { lockOpportunityUpdate } from '../opportunities/transaction'
import { conditionFields, conditionValue } from '../participation/rules'
import { applyEndpoint, conditionsEndpoint } from '../participation/actions'
import {
  assignedSchool,
  manageSchoolRecords,
  readOpportunities,
  relationID,
  userSchool,
  validatePhotoSchool,
} from '../opportunities/rules'

const validateOpportunity: CollectionBeforeValidateHook = async ({
  data,
  originalDoc,
  req,
  operation,
}) => {
  if (!data) return data
  const publishing = req.context.publishingOpportunity === true
  if (
    (operation === 'create' && data.status && data.status !== 'DRAFT') ||
    (operation === 'update' &&
      data.status &&
      data.status !== originalDoc?.status &&
      !publishing)
  ) {
    throw new APIError(
      'Use a ação Publicar para disponibilizar a oportunidade.',
      400,
    )
  }
  data.school = assignedSchool(req, data.school, originalDoc?.school)
  data.createdBy = originalDoc?.createdBy ?? req.user?.id
  data.status = publishing ? 'OPEN' : (originalDoc?.status ?? 'DRAFT')
  data.publishedAt = publishing
    ? new Date().toISOString()
    : (originalDoc?.publishedAt ?? null)
  data.publishedBy = publishing
    ? req.user?.id
    : (originalDoc?.publishedBy ?? null)
  const values = { ...originalDoc, ...data }
  if (operation === 'update') {
    const existing = await req.payload.count({
      collection: 'applications',
      req,
      overrideAccess: true,
      where: { opportunity: { equals: originalDoc!.id } },
    })
    if (
      existing.totalDocs &&
      conditionFields.some(
        (key) =>
          key in data &&
          JSON.stringify(conditionValue(key, data[key])) !==
            JSON.stringify(conditionValue(key, originalDoc![key])),
      )
    )
      throw new APIError(
        'Esta oportunidade já recebeu candidatura. As condições estão protegidas, inclusive após retirada. Use o campo de correções de escrita; mudanças de condições exigem cancelamento e nova publicação.',
        409,
      )
  }
  const start = Date.parse(values.executionStart)
  const end = Date.parse(values.executionEnd)
  const deadline = Date.parse(values.applicationDeadline)
  if (Number.isFinite(start) && Number.isFinite(end) && start > end)
    throw new APIError('O fim da execução deve ser posterior ao início.', 400)
  if (Number.isFinite(end) && Number.isFinite(deadline) && end < deadline)
    throw new APIError(
      'O período de execução deve permitir o atendimento após as candidaturas.',
      400,
    )
  if (publishing && (!Number.isFinite(deadline) || deadline <= Date.now()))
    throw new APIError(
      'Informe um prazo futuro para as candidaturas antes de publicar.',
      400,
    )
  await validatePhotoSchool(req, values.photos || [], data.school)
  return data
}

async function publish(req: PayloadRequest) {
  if (!managementPanel({ req }))
    throw new APIError('Acesso não autorizado.', 403)
  const id = Number(req.routeParams?.id)
  if (!Number.isSafeInteger(id) || id < 1)
    throw new APIError('Oportunidade inválida.', 400)
  const original = await req.payload.findByID({
    collection: 'opportunities',
    id,
    req,
    overrideAccess: false,
  })
  if (original.status !== 'DRAFT')
    throw new APIError('Esta oportunidade já foi publicada.', 400)
  req.context.publishingOpportunity = true
  const doc = await req.payload.update({
    collection: 'opportunities',
    id,
    req,
    overrideAccess: false,
    data: { status: 'OPEN' },
  })
  return Response.json({ doc, message: 'Oportunidade publicada.' })
}

export const Opportunities: CollectionConfig = {
  slug: 'opportunities',
  disableBulkEdit: true,
  labels: { singular: 'Oportunidade', plural: 'Oportunidades' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'fixedAmount', 'applicationDeadline'],
    components: {
      edit: {
        beforeDocumentControls: [
          '@/components/admin/PublishOpportunity#PublishOpportunity',
        ],
      },
    },
  },
  access: {
    create: managementPanel,
    read: readOpportunities,
    update: manageSchoolRecords,
    delete: () => false,
  },
  endpoints: [
    { path: '/:id/publish', method: 'post', handler: publish },
    { path: '/:id/apply', method: 'post', handler: applyEndpoint },
    { path: '/:id/conditions', method: 'get', handler: conditionsEndpoint },
  ],
  hooks: {
    beforeOperation: [lockOpportunityUpdate],
    beforeValidate: [validateOpportunity],
    afterChange: [auditChange],
  },
  fields: [
    {
      name: 'title',
      label: 'Título do reparo',
      type: 'text',
      required: true,
      maxLength: 120,
    },
    {
      name: 'description',
      label: 'Descrição do serviço',
      type: 'textarea',
      required: true,
      maxLength: 5000,
    },
    {
      name: 'category',
      label: 'Categoria',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
    },
    {
      name: 'school',
      label: 'Escola',
      type: 'relationship',
      relationTo: 'schools',
      required: true,
      admin: {
        condition: (_data, _siblings, { user }) => user?.role === 'admin',
        description: 'Definida no cadastro e preservada nas alterações.',
      },
    },
    {
      name: 'location',
      label: 'Local de execução',
      type: 'text',
      required: true,
      admin: {
        description:
          'Informe a área do reparo, sem dados de alunos ou informações sensíveis.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'applicationDeadline',
          label: 'Candidaturas até',
          type: 'date',
          required: true,
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
              displayFormat: 'dd/MM/yyyy HH:mm',
            },
          },
        },
        {
          name: 'fixedAmount',
          label: 'Valor oferecido (R$)',
          type: 'number',
          required: true,
          min: 0.01,
          validate: (value: number | null | undefined) =>
            (value != null &&
              Number.isFinite(value) &&
              value > 0 &&
              Math.abs(value * 100 - Math.round(value * 100)) < 0.000001) ||
            'Informe um valor positivo, com até duas casas decimais.',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'executionStart',
          label: 'Execução a partir de',
          type: 'date',
          required: true,
          admin: {
            date: { pickerAppearance: 'dayOnly', displayFormat: 'dd/MM/yyyy' },
          },
        },
        {
          name: 'executionEnd',
          label: 'Execução até',
          type: 'date',
          required: true,
          admin: {
            date: { pickerAppearance: 'dayOnly', displayFormat: 'dd/MM/yyyy' },
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'materialsResponsibility',
          label: 'Quem fornece os materiais?',
          type: 'select',
          required: true,
          options: [
            { label: 'Escola', value: 'school' },
            { label: 'Prestador', value: 'provider' },
            { label: 'Responsabilidade compartilhada', value: 'shared' },
          ],
        },
        {
          name: 'toolsResponsibility',
          label: 'Quem fornece as ferramentas?',
          type: 'select',
          required: true,
          options: [
            { label: 'Escola', value: 'school' },
            { label: 'Prestador', value: 'provider' },
            { label: 'Responsabilidade compartilhada', value: 'shared' },
          ],
        },
      ],
    },
    {
      name: 'requirements',
      label: 'Experiência e requisitos técnicos',
      type: 'textarea',
    },
    { name: 'notes', label: 'Outras condições', type: 'textarea' },
    {
      name: 'clarification',
      label: 'Correções de escrita',
      type: 'textarea',
      maxLength: 1500,
      admin: {
        description:
          'Para corrigir erros de escrita sem mudar o escopo, valor ou condições aceitas. Mudanças nas condições exigem cancelamento e nova publicação.',
      },
    },
    {
      name: 'photos',
      label: 'Fotos do reparo',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      maxRows: 3,
      admin: {
        description:
          'Até três fotos em JPG, PNG ou WebP, de até 5 MB cada. Evite pessoas identificáveis.',
      },
      filterOptions: ({ data, user }) => ({
        school: { equals: relationID(data?.school) || userSchool(user) },
      }),
    },
    {
      name: 'status',
      label: 'Situação',
      type: 'select',
      required: true,
      defaultValue: 'DRAFT',
      options: [
        { label: 'Rascunho', value: 'DRAFT' },
        { label: 'Aberta', value: 'OPEN' },
      ],
      admin: { position: 'sidebar', readOnly: true },
      access: {
        create: () => false,
        update: ({ req }) => req.context.publishingOpportunity === true,
      },
    },
    {
      name: 'publishedAt',
      label: 'Publicada em',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true },
      access: { create: () => false, update: () => false },
    },
    {
      name: 'createdBy',
      label: 'Criada por',
      type: 'relationship',
      relationTo: 'users',
      admin: { position: 'sidebar', readOnly: true },
      access: {
        read: managementPanel,
        create: () => false,
        update: () => false,
      },
    },
    {
      name: 'publishedBy',
      label: 'Publicada por',
      type: 'relationship',
      relationTo: 'users',
      admin: { position: 'sidebar', readOnly: true },
      access: {
        read: managementPanel,
        create: () => false,
        update: () => false,
      },
    },
  ],
}
