// Load .env.local before any test runs so SUPABASE_* vars are available.
import { config as loadEnv } from 'dotenv'
import path from 'node:path'

loadEnv({ path: path.resolve(__dirname, '..', '.env.local') })
