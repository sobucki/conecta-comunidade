import type { CollectionConfig } from 'payload'
import { adminOnly, schoolScope } from '../access'
import { auditChange } from '../hooks/audit'

export const Schools: CollectionConfig = {
  slug: 'schools',
  labels: { singular: 'Escola', plural: 'Escolas' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'slug', 'updatedAt'] },
  access: {
    create: adminOnly,
    read: schoolScope,
    update: adminOnly,
    delete: () => false,
  },
  hooks: { afterChange: [auditChange] },
  fields: [
    { name: 'name', label: 'Nome', type: 'text', required: true },
    {
      name: 'slug',
      label: 'Identificador público',
      type: 'text',
      required: true,
      unique: true,
      validate: (value: string | null | undefined) =>
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value || '') ||
        'Use letras minúsculas, números e hífens.',
    },
    { name: 'description', label: 'Apresentação', type: 'textarea' },
  ],
}
