import path from 'node:path'
import sharp from 'sharp'
import { APIError, type Access, type CollectionConfig } from 'payload'
import { isActive, isAdministrator, managementPanel } from '../access'
import {
  assignedSchool,
  manageSchoolRecords,
  publicOpportunities,
  relationID,
} from '../opportunities/rules'

const readMedia: Access = async ({ req }) => {
  if (isActive(req.user) && ['admin', 'manager'].includes(req.user.role))
    return manageSchoolRecords({ req })
  // Apenas IDs: evitar população recursiva e derivar acesso da relação realmente publicada.
  const opportunities = await req.payload.find({
    collection: 'opportunities',
    req,
    user: null,
    overrideAccess: false,
    depth: 0,
    pagination: false,
    where: publicOpportunities(),
    select: { photos: true },
  })
  const content = await req.payload.findGlobal({
    slug: 'site-content',
    req,
    depth: 0,
    overrideAccess: false,
  })
  const ids = new Set<number>()
  for (const opportunity of opportunities.docs)
    for (const photo of opportunity.photos || []) {
      const id = relationID(photo)
      if (id) ids.add(id)
    }
  const cover = relationID(content.coverImage)
  if (cover) ids.add(cover)
  return ids.size ? { id: { in: [...ids] } } : false
}

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Foto', plural: 'Fotos' },
  admin: { useAsTitle: 'alt' },
  access: {
    create: managementPanel,
    read: readMedia,
    update: manageSchoolRecords,
    delete: () => false,
  },
  hooks: {
    beforeOperation: [
      async ({ args, operation }) => {
        if (operation !== 'create' && operation !== 'update') return args
        const file = args.req.file
        if (!file) return args
        if (!managementPanel({ req: args.req }))
          throw new APIError('Acesso não autorizado.', 403)
        if (file.data.length > 5 * 1024 * 1024)
          throw new APIError('Cada foto deve ter no máximo 5 MB.', 400)
        try {
          const metadata = await sharp(file.data, {
            limitInputPixels: 25_000_000,
          }).metadata()
          if (!['jpeg', 'png', 'webp'].includes(metadata.format || ''))
            throw new Error('Formato não permitido')
        } catch {
          throw new APIError('Envie uma foto válida em JPG, PNG ou WebP.', 400)
        }
        return args
      },
    ],
    beforeValidate: [
      ({ data, originalDoc, req }) => {
        if (!data) return data
        data.school = assignedSchool(req, data.school, originalDoc?.school)
        data.uploadedBy = originalDoc?.uploadedBy ?? req.user?.id
        if (!data.uploadedBy)
          throw new APIError('Identifique o responsável pelo envio.', 400)
        return data
      },
    ],
  },
  upload: {
    staticDir: path.resolve(process.env.MEDIA_DIR || 'media'),
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    pasteURL: false,
    constructorOptions: { limitInputPixels: 25_000_000 },
    resizeOptions: {
      width: 1800,
      height: 1800,
      fit: 'inside',
      withoutEnlargement: true,
    },
    formatOptions: { format: 'webp', options: { quality: 82 } },
    imageSizes: [
      {
        name: 'thumbnail',
        width: 480,
        height: 320,
        fit: 'cover',
        withoutEnlargement: true,
        formatOptions: { format: 'webp', options: { quality: 78 } },
      },
      {
        name: 'display',
        width: 1200,
        height: 900,
        fit: 'inside',
        withoutEnlargement: true,
        formatOptions: { format: 'webp', options: { quality: 82 } },
      },
    ],
    adminThumbnail: 'thumbnail',
    modifyResponseHeaders: ({ headers }) => {
      headers.set('Cache-Control', 'private, no-store')
      headers.set('X-Content-Type-Options', 'nosniff')
      return headers
    },
  },
  fields: [
    {
      name: 'alt',
      label: 'O que aparece na foto?',
      type: 'text',
      required: true,
      maxLength: 240,
    },
    {
      name: 'school',
      label: 'Escola',
      type: 'relationship',
      relationTo: 'schools',
      required: true,
      admin: {
        condition: (_data, _siblings, { user }) => user?.role === 'admin',
      },
    },
    {
      name: 'uploadedBy',
      label: 'Enviada por',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true, position: 'sidebar' },
      access: {
        read: managementPanel,
        create: () => false,
        update: () => false,
      },
    },
  ],
}
