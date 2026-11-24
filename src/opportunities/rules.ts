import { APIError, type Access, type PayloadRequest, type Where } from 'payload'
import type { User } from '../payload-types'
import { isActive, isAdministrator } from '../access'

export function relationID(value: unknown): number | undefined {
  const id =
    value && typeof value === 'object' && 'id' in value ? value.id : value
  if (typeof id === 'number' && Number.isSafeInteger(id) && id > 0) return id
  if (typeof id === 'string' && /^\d+$/.test(id)) return Number(id)
  return undefined
}

export function userSchool(user: { school?: User['school'] } | null | undefined) {
  return relationID(user?.school)
}

export function publicOpportunities(): Where {
  return {
    and: [
      { status: { not_equals: 'DRAFT' } },
      { publishedAt: { exists: true } },
    ],
  }
}

export const manageSchoolRecords: Access = ({ req }) => {
  if (isAdministrator(req.user)) return true
  if (
    !isActive(req.user) ||
    req.user.role !== 'manager' ||
    !userSchool(req.user)
  )
    return false
  return { school: { equals: userSchool(req.user) } }
}

export const readOpportunities: Access = ({ req }) => {
  if (isActive(req.user) && ['admin', 'manager'].includes(req.user.role))
    return manageSchoolRecords({ req })
  return publicOpportunities()
}

export function assignedSchool(
  req: PayloadRequest,
  requested: unknown,
  original?: unknown,
) {
  const school =
    relationID(original) ??
    (isAdministrator(req.user) ? relationID(requested) : userSchool(req.user))
  if (!school) throw new APIError('Informe a escola responsável.', 400)
  if (!isAdministrator(req.user) && school !== userSchool(req.user))
    throw new APIError('Escola não autorizada.', 403)
  return school
}

export async function validatePhotoSchool(
  req: PayloadRequest,
  photos: unknown[],
  school: number,
) {
  const ids = photos.map(relationID)
  if (
    ids.length > 3 ||
    ids.some((id) => !id) ||
    new Set(ids).size !== ids.length
  ) {
    throw new APIError('Selecione até três fotos diferentes.', 400)
  }
  for (const id of ids) {
    const media = await req.payload.findByID({
      collection: 'media',
      id: id!,
      depth: 0,
      req,
      overrideAccess: false,
    })
    if (relationID(media.school) !== school)
      throw new APIError('A foto deve pertencer à escola da oportunidade.', 400)
  }
}
