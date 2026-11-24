import type { GlobalConfig } from 'payload'
import { managementPanel } from '../access'
export const PilotDashboard: GlobalConfig = {
  slug: 'pilot-dashboard',
  label: 'Indicadores do piloto',
  access: { read: managementPanel, update: () => false },
  admin: {
    hidden: ({ user }) => !['admin', 'manager'].includes(user?.role || ''),
  },
  fields: [
    {
      name: 'metrics',
      type: 'ui',
      admin: {
        components: { Field: '@/components/admin/PilotMetrics#PilotMetrics' },
      },
    },
  ],
}
