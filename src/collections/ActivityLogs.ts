import type { CollectionConfig } from 'payload'
import { adminOnly } from '../access'

export const ActivityLogs: CollectionConfig = {
  slug: 'activity-logs',
  labels: {
    singular: 'Registro de atividade',
    plural: 'Histórico administrativo',
  },
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['action', 'targetCollection', 'targetId', 'createdAt'],
    hidden: ({ user }) => user?.role !== 'admin',
  },
  access: {
    read: adminOnly,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'action', label: 'Operação', type: 'text', required: true },
    {
      name: 'targetCollection',
      label: 'Coleção',
      type: 'text',
      required: true,
    },
    { name: 'targetId', label: 'Registro', type: 'text', required: true },
    {
      name: 'actor',
      label: 'Responsável',
      type: 'relationship',
      relationTo: 'users',
    },
  ],
}
