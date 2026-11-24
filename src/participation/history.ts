import type { PayloadRequest } from 'payload'
import type { Application, ApplicationEvent } from '../payload-types'
import { relationID } from '../opportunities/rules'

export async function recordApplicationEvent(
  req: PayloadRequest,
  doc: Application,
  action: ApplicationEvent['action'],
  privateReason?: string,
) {
  return req.payload.create({
    collection: 'application-events',
    req,
    overrideAccess: true,
    data: {
      application: doc.id,
      school: relationID(doc.school)!,
      candidate: relationID(doc.candidate)!,
      actor: req.user!.id,
      action,
      revision: doc.revision,
      privateReason,
      snapshot: {
        availability: doc.availability,
        experience: doc.experience,
        status: doc.status,
        candidateName: doc.candidateName,
        profile: doc.profileSnapshot,
        acceptedAt: doc.acceptedAt,
        conditions: doc.acceptedConditions,
      },
    },
  })
}
