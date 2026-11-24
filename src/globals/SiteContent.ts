import type { GlobalConfig } from 'payload'
import { adminOnly } from '../access'
import { relationID, validatePhotoSchool } from '../opportunities/rules'

export const SiteContent: GlobalConfig = {
  slug: 'site-content',
  label: 'Conteúdo do site',
  access: { read: () => true, update: adminOnly },
  admin: { hidden: ({ user }) => user?.role !== 'admin' },
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        const values = { ...originalDoc, ...data }
        if (values.coverImage) {
          const school = relationID(values.school)
          if (school)
            await validatePhotoSchool(req, [values.coverImage], school)
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'projectName',
      label: 'Nome do projeto',
      type: 'text',
      required: true,
      defaultValue: 'Conecta Comunidade',
    },
    {
      name: 'headline',
      label: 'Título de apresentação',
      type: 'text',
      required: true,
      defaultValue: 'Sua habilidade pode fazer a diferença na escola.',
    },
    {
      name: 'introduction',
      label: 'Apresentação breve',
      type: 'textarea',
      required: true,
      defaultValue:
        'Pequenos reparos, novas conexões. Conheça as necessidades da escola e compartilhe as oportunidades com quem pode ajudar.',
    },
    {
      name: 'about',
      label: 'Sobre a iniciativa',
      type: 'textarea',
      required: true,
      defaultValue:
        'A escola é um ponto de encontro de muitas habilidades. O Conecta Comunidade aproxima suas demandas de manutenção dos profissionais que fazem parte dessa rede.',
    },
    {
      name: 'school',
      label: 'Escola do piloto',
      type: 'relationship',
      relationTo: 'schools',
    },
    {
      name: 'coverImage',
      label: 'Imagem de apresentação',
      type: 'upload',
      relationTo: 'media',
    },
  ],
}
