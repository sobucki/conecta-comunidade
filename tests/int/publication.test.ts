import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '../../src/payload.config'
import type { User } from '../../src/payload-types'

const suffix = randomUUID().slice(0, 8)
let payload: Payload
let manager: User
let otherManager: User
let provider: User
let administrator: User
let school: number
let otherSchool: number
let category: number
let image: Buffer

beforeAll(async () => {
  payload = await getPayload({ config })
  school = (
    await payload.create({
      collection: 'schools',
      data: { name: 'Escola Publicação', slug: `publicacao-${suffix}` },
    })
  ).id
  otherSchool = (
    await payload.create({
      collection: 'schools',
      data: {
        name: 'Outra Escola Publicação',
        slug: `outra-publicacao-${suffix}`,
      },
    })
  ).id
  category = (
    await payload.create({
      collection: 'categories',
      data: { name: `Pintura ${suffix}` },
    })
  ).id
  async function account(name: string, role: User['role'], school: number) {
    return payload.create({
      collection: 'users',
      context: { bootstrap: true },
      data: {
        name,
        role,
        school,
        email: `${name}-${suffix}@example.test`,
        password: 'Senha-ficticia-com-12-caracteres',
        status: 'active',
        ...(role === 'provider'
          ? {
              phone: '(00) 00000-0000',
              communityLink: 'local',
              adultConfirmed: true,
              termsAcceptedAt: new Date().toISOString(),
            }
          : {}),
      },
    })
  }
  manager = await account('gestora-publicacao', 'manager', school)
  administrator = await account('admin-publicacao', 'admin', school)
  otherManager = await account(
    'outra-gestora-publicacao',
    'manager',
    otherSchool,
  )
  provider = await account('prestador-publicacao', 'provider', school)
  image = await sharp({
    create: { width: 800, height: 600, channels: 3, background: '#3f785b' },
  })
    .png()
    .toBuffer()
})
afterAll(async () => {
  await payload?.destroy()
})

const values = () => ({
  title: `Reparo ${randomUUID()}`,
  description: 'Reparo fictício para teste de publicação.',
  school,
  category,
  status: 'DRAFT' as const,
  location: 'Muro externo',
  fixedAmount: 450.5,
  applicationDeadline: new Date(Date.now() + 86400000).toISOString(),
  executionStart: new Date(Date.now() + 2 * 86400000).toISOString(),
  executionEnd: new Date(Date.now() + 5 * 86400000).toISOString(),
  materialsResponsibility: 'school' as const,
  toolsResponsibility: 'provider' as const,
})
const draft = (photos: number[] = []) =>
  payload.create({
    collection: 'opportunities',
    overrideAccess: false,
    user: manager,
    data: { ...values(), photos },
  })
const photo = (user = manager) =>
  payload.create({
    collection: 'media',
    overrideAccess: false,
    user,
    data: {
      alt: 'Foto de teste de uma parede',
      school: user === manager ? school : otherSchool,
    },
    file: {
      data: image,
      name: `${randomUUID()}.png`,
      mimetype: 'image/png',
      size: image.length,
    },
  })

describe('Publicação e propriedade dos registros', () => {
  it('mantém rascunhos privados e ignora publicação e autoria enviadas por campos comuns', async () => {
    const opportunity = await payload.create({
      collection: 'opportunities',
      overrideAccess: false,
      user: manager,
      data: {
        ...values(),
        status: 'OPEN',
        publishedAt: new Date().toISOString(),
        publishedBy: otherManager.id,
        createdBy: otherManager.id,
      },
    })
    expect(opportunity.status).toBe('DRAFT')
    expect(opportunity.publishedAt).toBeFalsy()
    expect(
      typeof opportunity.createdBy === 'object'
        ? opportunity.createdBy?.id
        : opportunity.createdBy,
    ).toBe(manager.id)
    await expect(
      payload.findByID({
        collection: 'opportunities',
        id: opportunity.id,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    await expect(
      payload.findByID({
        collection: 'opportunities',
        id: opportunity.id,
        user: otherManager,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('publica pela operação interna autorizada e não expõe usuários na resposta pública', async () => {
    const opportunity = await draft()
    const published = await payload.update({
      collection: 'opportunities',
      id: opportunity.id,
      user: manager,
      overrideAccess: false,
      context: { publishingOpportunity: true },
      data: { status: 'OPEN' },
    })
    expect(published.status).toBe('OPEN')
    expect(published.publishedAt).toBeTruthy()
    const publicDoc = await payload.findByID({
      collection: 'opportunities',
      id: opportunity.id,
      overrideAccess: false,
      depth: 2,
    })
    expect(publicDoc.title).toBe(opportunity.title)
    expect(publicDoc.createdBy).toBeUndefined()
    expect(publicDoc.publishedBy).toBeUndefined()
    expect(JSON.stringify(publicDoc)).not.toContain(manager.email)
  })

  it('impede escrita do visitante, prestador e gestora de outra escola', async () => {
    await expect(
      payload.create({
        collection: 'opportunities',
        overrideAccess: false,
        data: values(),
      }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'opportunities',
        overrideAccess: false,
        user: provider,
        data: values(),
      }),
    ).rejects.toThrow()
    const opportunity = await draft()
    await expect(
      payload.update({
        collection: 'opportunities',
        id: opportunity.id,
        overrideAccess: false,
        user: otherManager,
        data: { title: 'Alteração indevida' },
      }),
    ).rejects.toThrow()
    const saved = await payload.update({
      collection: 'opportunities',
      id: opportunity.id,
      overrideAccess: false,
      user: manager,
      data: { school: otherSchool },
    })
    expect(
      typeof saved.school === 'object' ? saved.school?.id : saved.school,
    ).toBe(school)
  })

  it('valida valor, datas, condições obrigatórias e prazo futuro na publicação', async () => {
    await expect(
      payload.create({
        collection: 'opportunities',
        user: manager,
        overrideAccess: false,
        data: { ...values(), fixedAmount: 0 },
      }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'opportunities',
        user: manager,
        overrideAccess: false,
        data: { ...values(), fixedAmount: 12.345 },
      }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'opportunities',
        user: manager,
        overrideAccess: false,
        data: {
          ...values(),
          executionEnd: new Date(Date.now() - 86400000).toISOString(),
        },
      }),
    ).rejects.toThrow()
    const expired = await payload.create({
      collection: 'opportunities',
      user: manager,
      overrideAccess: false,
      data: {
        ...values(),
        applicationDeadline: new Date(Date.now() - 86400000).toISOString(),
      },
    })
    await expect(
      payload.update({
        collection: 'opportunities',
        id: expired.id,
        user: manager,
        overrideAccess: false,
        context: { publishingOpportunity: true },
        data: { status: 'OPEN' },
      }),
    ).rejects.toThrow()
  })
})

describe('Proteção de fotos e conteúdo institucional', () => {
  it('gera versões reduzidas e mantém uploads soltos e fotos de rascunho privados', async () => {
    const media = await photo()
    expect(media.mimeType).toBe('image/webp')
    expect(media.sizes?.thumbnail?.url).toBeTruthy()
    await expect(
      payload.findByID({
        collection: 'media',
        id: media.id,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    const opportunity = await draft([media.id])
    await expect(
      payload.findByID({
        collection: 'media',
        id: media.id,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    await payload.update({
      collection: 'opportunities',
      id: opportunity.id,
      user: manager,
      overrideAccess: false,
      context: { publishingOpportunity: true },
      data: { status: 'OPEN' },
    })
    const publicMedia = await payload.findByID({
      collection: 'media',
      id: media.id,
      overrideAccess: false,
    })
    expect(publicMedia.uploadedBy).toBeUndefined()
    await payload.update({
      collection: 'opportunities',
      id: opportunity.id,
      user: manager,
      overrideAccess: false,
      data: { photos: [] },
    })
    await expect(
      payload.findByID({
        collection: 'media',
        id: media.id,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('rejeita associação de foto de outra escola e preserva o vínculo do arquivo', async () => {
    const foreign = await photo(otherManager)
    await expect(draft([foreign.id])).rejects.toThrow()
    const own = await photo()
    const changed = await payload.update({
      collection: 'media',
      id: own.id,
      user: manager,
      overrideAccess: false,
      data: { school: otherSchool, uploadedBy: otherManager.id },
    })
    expect(
      typeof changed.school === 'object' ? changed.school?.id : changed.school,
    ).toBe(school)
    expect(
      typeof changed.uploadedBy === 'object'
        ? changed.uploadedBy?.id
        : changed.uploadedBy,
    ).toBe(manager.id)
    await expect(
      payload.update({
        collection: 'media',
        id: own.id,
        user: otherManager,
        overrideAccess: false,
        data: { alt: 'Alteração indevida' },
      }),
    ).rejects.toThrow()
  })

  it('impõe até três fotos distintas por oportunidade', async () => {
    const photos = await Promise.all([photo(), photo(), photo(), photo()])
    await expect(draft(photos.map((p) => p.id))).rejects.toThrow()
    await expect(draft([photos[0].id, photos[0].id])).rejects.toThrow()
    const accepted = await draft(photos.slice(0, 3).map((p) => p.id))
    expect(accepted.photos).toHaveLength(3)
  })

  it('recusa formatos disfarçados, imagens corrompidas, arquivos grandes e uploads de prestador', async () => {
    for (const data of [
      Buffer.from('arquivo que nao e uma foto'),
      image.subarray(0, 64),
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>',
      ),
      Buffer.alloc(5 * 1024 * 1024 + 1),
    ]) {
      await expect(
        payload.create({
          collection: 'media',
          user: manager,
          overrideAccess: false,
          data: { alt: 'Inválida', school },
          file: {
            data,
            name: 'foto.png',
            mimetype: 'image/png',
            size: data.length,
          },
        }),
      ).rejects.toThrow()
    }
    await expect(photo(provider)).rejects.toThrow()
  })

  it('restringe a edição do conteúdo institucional ao administrador', async () => {
    await expect(
      payload.updateGlobal({
        slug: 'site-content',
        user: manager,
        overrideAccess: false,
        data: { headline: 'Não autorizado' },
      }),
    ).rejects.toThrow()
    const content = await payload.findGlobal({
      slug: 'site-content',
      overrideAccess: false,
    })
    expect(content.projectName).toBeTruthy()
  })

  it('permite publicar e remover a imagem institucional com a mesma proteção de arquivos', async () => {
    const original = await payload.findGlobal({
      slug: 'site-content',
      depth: 0,
      overrideAccess: true,
    })
    const media = await photo()
    try {
      await payload.updateGlobal({
        slug: 'site-content',
        user: administrator,
        overrideAccess: false,
        data: { school, coverImage: media.id },
      })
      const content = await payload.findGlobal({
        slug: 'site-content',
        overrideAccess: false,
        depth: 1,
      })
      expect(
        typeof content.coverImage === 'object'
          ? content.coverImage?.id
          : content.coverImage,
      ).toBe(media.id)
      await payload.updateGlobal({
        slug: 'site-content',
        user: administrator,
        overrideAccess: false,
        data: { coverImage: null },
      })
      await expect(
        payload.findByID({
          collection: 'media',
          id: media.id,
          overrideAccess: false,
        }),
      ).rejects.toThrow()
    } finally {
      await payload.updateGlobal({
        slug: 'site-content',
        user: administrator,
        overrideAccess: false,
        data: {
          school:
            (typeof original.school === 'object'
              ? original.school?.id
              : original.school) ?? null,
          coverImage:
            (typeof original.coverImage === 'object'
              ? original.coverImage?.id
              : original.coverImage) ?? null,
        },
      })
    }
  })
})
