import 'server-only'
import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { publicPayload } from '../public/data'
import { isActive } from '../access'
import { safeReturnPath } from './navigation'

export const currentUser = cache(async () => {
  const payload = await publicPayload()
  const { user } = await payload.auth({ headers: await headers() })
  return isActive(user) ? user : null
})

export async function providerSession(path: string) {
  const user = await currentUser()
  if (!user)
    redirect(`/entrar?next=${encodeURIComponent(safeReturnPath(path))}`)
  if (user.role !== 'provider') redirect('/admin')
  return user
}
