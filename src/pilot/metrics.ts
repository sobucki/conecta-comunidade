import { APIError, type PayloadRequest } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import { managementPanel, isAdministrator } from '../access'
import { userSchool } from '../opportunities/rules'

export function observationPeriod(start: unknown, end: unknown) {
  if (
    typeof start !== 'string' ||
    typeof end !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(end)
  )
    throw new APIError('Informe datas válidas no formato ano-mês-dia.', 400)
  const from = new Date(`${start}T00:00:00-03:00`)
  const until = new Date(`${end}T00:00:00-03:00`)
  if (
    !Number.isFinite(+from) ||
    !Number.isFinite(+until) ||
    from > until ||
    from.toISOString().slice(0, 10) !== start ||
    until.toISOString().slice(0, 10) !== end
  )
    throw new APIError('Período inválido.', 400)
  until.setUTCDate(until.getUTCDate() + 1)
  return { from: from.toISOString(), until: until.toISOString() }
}

export async function pilotMetrics(
  req: PayloadRequest,
  start: unknown,
  end: unknown,
) {
  if (!managementPanel({ req }))
    throw new APIError('Acesso reservado à gestão.', 403)
  const school = userSchool(req.user)
  if (!isAdministrator(req.user) && !school)
    throw new APIError('Escola não autorizada.', 403)
  const { from, until } = observationPeriod(start, end)
  // Uma consulta mantém todos os indicadores no mesmo snapshot do PostgreSQL.
  const result = await req.payload.db.drizzle.execute(sql`
    WITH events AS (
      SELECT e.* FROM application_events e WHERE e.created_at >= ${from}::timestamptz AND e.created_at < ${until}::timestamptz
        AND e.action IN ('submit','resubmit') AND (${isAdministrator(req.user)} OR e.school_id = ${school || 0})
    ), cohort AS (
      SELECT o.id, o.published_at FROM opportunities o WHERE o.published_at >= ${from}::timestamptz AND o.published_at < ${until}::timestamptz
        AND (${isAdministrator(req.user)} OR o.school_id = ${school || 0})
    ), firsts AS (
      SELECT c.id, EXTRACT(EPOCH FROM (MIN(a.first_submitted_at) - c.published_at)) AS seconds
      FROM cohort c JOIN applications a ON a.opportunity_id = c.id AND a.first_submitted_at < ${until}::timestamptz GROUP BY c.id, c.published_at
    ) SELECT
      (SELECT COUNT(*)::int FROM users u WHERE u.role='provider' AND u.created_at >= ${from}::timestamptz AND u.created_at < ${until}::timestamptz AND (${isAdministrator(req.user)} OR u.school_id=${school || 0})) AS registered,
      (SELECT COUNT(DISTINCT candidate_id)::int FROM events) AS participants,
      (SELECT COUNT(*)::int FROM cohort) AS published,
      (SELECT COUNT(*)::int FROM events) AS submissions,
      (SELECT COUNT(*)::int FROM events WHERE action='submit') AS first_submissions,
      (SELECT COUNT(*)::int FROM events WHERE action='resubmit') AS resubmissions,
      (SELECT COUNT(*)::int FROM firsts) AS opportunities_with_candidates,
      (SELECT AVG(seconds)::float8 FROM firsts) AS average_seconds
  `)
  const values = result.rows[0] as {
    registered: number
    participants: number
    published: number
    submissions: number
    first_submissions: number
    resubmissions: number
    opportunities_with_candidates: number
    average_seconds: number | null
  }
  return {
    ...values,
    from,
    until,
    scope: isAdministrator(req.user) ? 'Todas as escolas' : 'Escola autorizada',
    percentage: Number(values.published)
      ? (Number(values.opportunities_with_candidates) /
          Number(values.published)) *
        100
      : null,
  }
}

export async function metricsEndpoint(req: PayloadRequest) {
  const result = await pilotMetrics(
    req,
    req.searchParams.get('inicio'),
    req.searchParams.get('fim'),
  )
  return Response.json(result, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
