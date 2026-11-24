import 'server-only'
import { getPayload } from 'payload'
import config from '../payload.config'
import { publicOpportunities } from '../opportunities/rules'
import type { Media, Opportunity } from '../payload-types'

export async function publicPayload() {
  return getPayload({ config })
}
export async function siteContent() {
  const payload = await publicPayload()
  return payload.findGlobal({
    slug: 'site-content',
    overrideAccess: false,
    user: null,
    depth: 1,
  })
}
export async function openOpportunities(school: number, limit = 12, page = 1) {
  const payload = await publicPayload()
  return payload.find({
    collection: 'opportunities',
    overrideAccess: false,
    user: null,
    depth: 1,
    where: {
      and: [
        publicOpportunities(),
        { school: { equals: school } },
        { status: { equals: 'OPEN' } },
        { applicationDeadline: { greater_than: new Date().toISOString() } },
      ],
    },
    sort: '-publishedAt',
    limit,
    page,
  })
}
export function mediaObject(
  value: number | Media | null | undefined,
): Media | undefined {
  return value && typeof value === 'object' ? value : undefined
}
export function photoURL(
  media: Media,
  size: 'thumbnail' | 'display' = 'display',
) {
  return media.sizes?.[size]?.url || media.url || ''
}
export function isAccepting(opportunity: Opportunity) {
  return (
    opportunity.status === 'OPEN' &&
    Date.parse(opportunity.applicationDeadline) > Date.now()
  )
}
export const money = (amount: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    amount,
  )
export const date = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value))
export const dateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value))
export const responsibility = (value: 'school' | 'provider' | 'shared') =>
  ({
    school: 'Fornecidos pela escola',
    provider: 'Por conta do prestador',
    shared: 'Responsabilidade compartilhada',
  })[value]
