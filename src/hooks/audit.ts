import type { CollectionAfterChangeHook } from 'payload'

export const auditChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
  collection,
}) => {
  const accessChanged =
    collection.slug === 'users' &&
    operation === 'update' &&
    (doc.role !== previousDoc?.role ||
      doc.status !== previousDoc?.status ||
      String(doc.school?.id ?? doc.school) !==
        String(previousDoc?.school?.id ?? previousDoc?.school))

  await req.payload.create({
    collection: 'activity-logs',
    overrideAccess: true,
    req,
    data: {
      action: accessChanged
        ? 'access.changed'
        : `${collection.slug}.${operation}`,
      targetCollection: collection.slug,
      targetId: String(doc.id),
      actor: req.user?.id,
    },
  })
  return doc
}
