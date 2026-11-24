import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import {
  APIError,
  type CollectionBeforeOperationHook,
  type PayloadRequest,
} from 'payload'

// Todas as escritas concorrentes da oportunidade e de suas candidaturas
// usam a mesma trava, mantida até commit/rollback da transação do Payload.
export async function lockOpportunity(req: PayloadRequest, id: number) {
  const transactionID = await req.transactionID
  const sessions = req.payload.db.sessions as
    PostgresAdapter['sessions'] | undefined
  const db = transactionID && sessions?.[transactionID]?.db
  if (!db) throw new APIError('A operação exige uma transação ativa.', 500)
  await db.execute(
    sql`select id from opportunities where id = ${id} for update`,
  )
}

export const lockOpportunityUpdate: CollectionBeforeOperationHook = async ({
  args,
  operation,
}) => {
  if (operation === 'update') {
    if (!('id' in args) || !args.id)
      throw new APIError('Altere uma oportunidade de cada vez.', 400)
    // beforeOperation precede a leitura de originalDoc, evitando validação obsoleta.
    await lockOpportunity(args.req, Number(args.id))
  }
  return args
}
