import { APIError, type CollectionConfig } from 'payload'
import { readParticipation } from '../participation/rules'
import { applicationEndpoint } from '../participation/actions'
import { communityLinks } from '../accounts/registration-options'
import { applicationStatusLabels } from '../selection/status'
import { managementPanel } from '../access'

export const Applications: CollectionConfig = {
  slug: 'applications',
  labels: { singular: 'Candidatura', plural: 'Candidaturas' },
  admin: {
    useAsTitle: 'candidateName',
    defaultColumns: ['candidateName', 'opportunity', 'status', 'submittedAt'],
    hidden: ({ user }) => !['admin', 'manager'].includes(user?.role || ''),
  },
  access: {
    read: readParticipation,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  indexes: [{ fields: ['opportunity', 'candidate'], unique: true }],
  endpoints: (['edit', 'withdraw', 'resubmit'] as const).map((action) => ({
    path: `/:id/${action}`,
    method: 'post',
    handler: applicationEndpoint(action),
  })),
  hooks: {
    beforeChange: [
      ({ data, req }) => {
        if (!req.context.applicationAction)
          throw new APIError('Use as ações de candidatura.', 403)
        return data
      },
    ],
    beforeDelete: [
      () => {
        throw new APIError(
          'Candidaturas preservam o histórico e não podem ser excluídas.',
          403,
        )
      },
    ],
  },
  fields: [
    {
      name: 'selectionControls',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/admin/SelectCandidate#SelectCandidate',
        },
      },
    },
    {
      name: 'candidateName',
      label: 'Nome do candidato',
      type: 'text',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'opportunity',
      label: 'Oportunidade',
      type: 'relationship',
      relationTo: 'opportunities',
      required: true,
      maxDepth: 1,
      admin: { readOnly: true },
    },
    {
      name: 'candidate',
      label: 'Conta do prestador',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      maxDepth: 0,
      admin: { hidden: true },
    },
    {
      name: 'school',
      label: 'Escola',
      type: 'relationship',
      relationTo: 'schools',
      required: true,
      admin: { hidden: true },
    },
    {
      name: 'status',
      label: 'Situação',
      type: 'select',
      required: true,
      options: Object.entries(applicationStatusLabels).map(
        ([value, label]) => ({ value, label }),
      ),
      admin: { readOnly: true },
    },
    {
      name: 'availability',
      label: 'Disponibilidade informada',
      type: 'textarea',
      required: true,
      maxLength: 3000,
      admin: { readOnly: true },
    },
    {
      name: 'experience',
      label: 'Apresentação e experiência relevante',
      type: 'textarea',
      maxLength: 3000,
      admin: { readOnly: true },
    },
    {
      name: 'profileSnapshot',
      label: 'Perfil informado no envio ou na última edição',
      type: 'group',
      admin: { readOnly: true },
      fields: [
        { name: 'email', label: 'E-mail', type: 'email' },
        { name: 'phone', label: 'Telefone de contato', type: 'text' },
        {
          name: 'communityLink',
          label: 'Vínculo autodeclarado',
          type: 'select',
          options: communityLinks.map(([value, label]) => ({ value, label })),
        },
        { name: 'skills', label: 'Habilidades', type: 'text' },
        {
          name: 'professionalSummary',
          label: 'Apresentação profissional',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'acceptedConditions',
      label: 'Condições aceitas',
      type: 'json',
      required: true,
      admin: {
        readOnly: true,
        components: {
          Field:
            '@/components/admin/AcceptedConditionsField#AcceptedConditionsField',
        },
      },
    },
    {
      name: 'acceptedAt',
      label: 'Concordância registrada em',
      type: 'date',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'firstSubmittedAt',
      label: 'Primeiro envio',
      type: 'date',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'submittedAt',
      label: 'Último envio',
      type: 'date',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'withdrawnAt',
      label: 'Retirada em',
      type: 'date',
      admin: { readOnly: true },
    },
    {
      name: 'revision',
      label: 'Revisão',
      type: 'number',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'decisionAt',
      label: 'Última decisão em',
      type: 'date',
      admin: {
        readOnly: true,
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'dd/MM/yyyy HH:mm',
        },
      },
    },
    {
      name: 'decisionBy',
      label: 'Responsável pela decisão',
      type: 'relationship',
      relationTo: 'users',
      maxDepth: 0,
      admin: { hidden: true },
      access: { read: managementPanel },
    },
  ],
}
