import type { Access, AccessResult, PayloadRequest } from 'payload'
import { APIError } from 'payload'
import { isActive, isAdministrator } from '../access'
import { relationID, userSchool } from '../opportunities/rules'
import type { Opportunity } from '../payload-types'
import { createHash } from 'node:crypto'

export const readParticipation: Access = ({ req }): AccessResult => {
  if (isAdministrator(req.user)) return true
  if (!isActive(req.user)) return false
  if (req.user.role === 'provider')
    return { candidate: { equals: req.user.id } }
  if (req.user.role === 'manager' && userSchool(req.user))
    return { school: { equals: userSchool(req.user) } }
  return false
}

export function requireProvider(req: PayloadRequest) {
  if (!isActive(req.user) || req.user.role !== 'provider')
    throw new APIError(
      'Entre com uma conta de prestador para se candidatar.',
      403,
    )
  return req.user
}

export const conditionFields = [
  'title',
  'description',
  'category',
  'location',
  'fixedAmount',
  'applicationDeadline',
  'executionStart',
  'executionEnd',
  'materialsResponsibility',
  'toolsResponsibility',
  'requirements',
  'notes',
  'photos',
] as const

export function acceptedConditions(opportunity: Opportunity) {
  return Object.fromEntries(
    conditionFields.map((key) => [
      key,
      key === 'category'
        ? relationID(opportunity.category)
        : key === 'photos'
          ? (opportunity.photos || []).map(relationID)
          : (opportunity[key] ?? null),
    ]),
  )
}

export function conditionsToken(opportunity: Opportunity) {
  return createHash('sha256')
    .update(JSON.stringify(acceptedConditions(opportunity)))
    .digest('hex')
}

export function conditionValue(key: string, value: unknown) {
  if (key === 'category') return relationID(value)
  if (key === 'photos')
    return (Array.isArray(value) ? value : []).map(relationID)
  if (['applicationDeadline', 'executionStart', 'executionEnd'].includes(key))
    return value ? new Date(String(value)).toISOString() : null
  return value === '' || value == null ? null : value
}
