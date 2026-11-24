import type { Access, FieldAccess, PayloadRequest } from 'payload'
import type { User } from '../payload-types'

export function isActive(user: User | null | undefined): user is User {
  return user?.status === 'active'
}

export function isAdministrator(user: User | null | undefined): boolean {
  return isActive(user) && user.role === 'admin'
}

export const adminOnly: Access = ({ req }) => isAdministrator(req.user)
export const adminField: FieldAccess = ({ req }) => isAdministrator(req.user)

export const ownAccountOrAdmin: Access = ({ req }) => {
  if (isAdministrator(req.user)) return true
  if (!isActive(req.user)) return false
  return { id: { equals: req.user.id } }
}

export const schoolScope: Access = ({ req }) => {
  if (isAdministrator(req.user)) return true
  if (!isActive(req.user) || !req.user.school) return false
  const id =
    typeof req.user.school === 'object' ? req.user.school.id : req.user.school
  return { id: { equals: id } }
}

export const managementPanel = ({ req }: { req: PayloadRequest }): boolean =>
  isActive(req.user) && ['admin', 'manager'].includes(req.user.role)
