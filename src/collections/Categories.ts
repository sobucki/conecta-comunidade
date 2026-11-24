import type { CollectionConfig } from 'payload'
import { adminOnly, isActive } from '../access'

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: { singular: 'Categoria', plural: 'Categorias' },
  admin: { useAsTitle: 'name', hidden: ({ user }) => user?.role !== 'admin' },
  access: {
    create: adminOnly,
    read: ({ req }) => isActive(req.user),
    update: adminOnly,
    delete: () => false,
  },
  fields: [
    { name: 'name', label: 'Nome', type: 'text', required: true, unique: true },
  ],
}
