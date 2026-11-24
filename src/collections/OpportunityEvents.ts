import { APIError, type CollectionConfig } from 'payload'
import { manageSchoolRecords } from '../opportunities/rules'
import { decisionLabels } from '../selection/status'

export const OpportunityEvents: CollectionConfig = {
  slug: 'opportunity-events',
  labels: { singular: 'Decisão', plural: 'Histórico de decisões' },
  admin: { hidden: true },
  access: {
    read: manageSchoolRecords,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  indexes: [{ fields: ['opportunity', 'revision'], unique: true }],
  hooks: {
    beforeChange: [
      ({ operation, data, req }) => {
        if (operation !== 'create' || !req.context.selectionAction)
          throw new APIError('O histórico de decisões é imutável.', 403)
        return data
      },
    ],
    beforeDelete: [
      () => {
        throw new APIError('O histórico de decisões é imutável.', 403)
      },
    ],
  },
  fields: [
    {
      name: 'opportunity',
      type: 'relationship',
      relationTo: 'opportunities',
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
      name: 'actor',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      maxDepth: 0,
    },
    { name: 'actorName', type: 'text', required: true },
    {
      name: 'action',
      type: 'select',
      options: Object.entries(decisionLabels).map(([value, label]) => ({
        value,
        label,
      })),
      required: true,
    },
    { name: 'revision', type: 'number', required: true },
    { name: 'previousStatus', type: 'text', required: true },
    { name: 'nextStatus', type: 'text', required: true },
    {
      name: 'application',
      type: 'relationship',
      relationTo: 'applications',
      maxDepth: 0,
    },
    { name: 'reason', type: 'textarea', maxLength: 2000 },
  ],
}
