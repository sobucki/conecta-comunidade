import { getPayload } from 'payload'
import config from '../../src/payload.config'
import {
  assertDevelopmentDatabase,
  seedDevelopment,
} from '../../src/seed/development'

export default async function setup() {
  assertDevelopmentDatabase(process.env.DATABASE_URL)
  const payload = await getPayload({ config })
  try {
    await seedDevelopment(payload)
  } finally {
    await payload.destroy()
  }
}
