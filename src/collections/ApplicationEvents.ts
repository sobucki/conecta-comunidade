import { APIError, type CollectionConfig } from 'payload'
import { readParticipation } from '../participation/rules'

export const ApplicationEvents: CollectionConfig = {
  slug: 'application-events',
  labels: {
    singular: 'Evento de candidatura',
    plural: 'Histórico de candidaturas',
  },
  admin: {
    hidden: true,
    defaultColumns: ['application', 'action', 'revision', 'createdAt'],
  },
  access: {
    read: readParticipation,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  indexes: [{ fields: ['application', 'revision'], unique: true }],
  hooks: {
    beforeChange: [
      ({ operation, data, req }) => {
        if (operation !== 'create' || !req.context.applicationAction)
          throw new APIError('O histórico é imutável.', 403)
        return data
      },
    ],
    beforeDelete: [
      () => {
        throw new APIError('O histórico é imutável.', 403)
      },
    ],
  },
  fields: [
    {
      name: 'application',
      type: 'relationship',
      relationTo: 'applications',
      required: true,
      maxDepth: 0,
    },
    {
      name: 'school',
      type: 'relationship',
      relationTo: 'schools',
      required: true,
      maxDepth: 0,
    },
    {
      name: 'candidate',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      maxDepth: 0,
    },
    {
      name: 'actor',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      maxDepth: 0,
    },
    {
      name: 'action',
      type: 'select',
      required: true,
      options: ['submit', 'edit', 'withdraw', 'resubmit'],
    },
    { name: 'revision', type: 'number', required: true },
    { name: 'snapshot', type: 'json', required: true },
  ],
}
