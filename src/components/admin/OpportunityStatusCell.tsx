'use client'
import { opportunityStatusLabel } from '@/selection/status'

export function OpportunityStatusCell({
  rowData,
}: {
  rowData: { status: string; applicationDeadline: string }
}) {
  return <span>{opportunityStatusLabel(rowData)}</span>
}
