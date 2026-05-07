# QuickBooks Integration — OAuth2, Sync & Entity Mapping

## Table of Contents
1. [OAuth2 Flow](#oauth2-flow)
2. [Token Management](#token-management)
3. [Sync Architecture](#sync-architecture)
4. [Entity Mapping Logic](#entity-mapping-logic)
5. [Error Handling](#error-handling)
6. [Implementation Files](#implementation-files)

---

## OAuth2 Flow

QBO uses OAuth 2.0 Authorization Code Grant.

### Step-by-Step
```
1. User clicks "Connect QuickBooks" button
2. Frontend calls GET /api/quickbooks/connect
3. Server generates CSRF state token, stores in session/cookie
4. Server redirects to Intuit authorization URL:
   https://appcenter.intuit.com/connect/oauth2
     ?client_id={QB_CLIENT_ID}
     &redirect_uri={QB_REDIRECT_URI}
     &response_type=code
     &scope=com.intuit.quickbooks.accounting
     &state={csrf_state}
5. User authorizes in Intuit's UI
6. Intuit redirects to GET /api/quickbooks/callback?code=xxx&state=xxx&realmId=xxx
7. Server verifies state, exchanges code for tokens:
   POST https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer
   Authorization: Basic base64(client_id:client_secret)
   Body: grant_type=authorization_code&code={code}&redirect_uri={uri}
8. Server receives: { access_token, refresh_token, expires_in, x_refresh_token_expires_in }
9. Server stores tokens (encrypted) in qb_connection table
10. Server redirects user to /settings/quickbooks?connected=true
11. Trigger initial sync
```

### Scopes
Only scope needed: `com.intuit.quickbooks.accounting` — covers all accounting data (invoices, expenses, bills, vendors, accounts, reports).

---

## Token Management

### Token Lifetimes
- **Access token**: ~1 hour (3600 seconds)
- **Refresh token**: ~100 days
- After 100 days with no refresh, user must re-authorize

### Refresh Logic
Before every QBO API call:
```ts
async function getValidAccessToken(connectionId: string): Promise<string> {
  const conn = await db.qb_connection.findUnique({ where: { id: connectionId } })

  // If access token still valid (with 5 min buffer), use it
  if (conn.token_expires_at > new Date(Date.now() + 5 * 60 * 1000)) {
    return decrypt(conn.access_token)
  }

  // Otherwise refresh
  const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=refresh_token&refresh_token=${decrypt(conn.refresh_token)}`,
  })

  const tokens = await response.json()

  if (tokens.error) {
    // Refresh token expired or revoked — mark connection as needing reauth
    await db.qb_connection.update({
      where: { id: connectionId },
      data: { sync_status: 'pending_reauth' },
    })
    throw new Error('QB_REAUTH_REQUIRED')
  }

  // Store new tokens
  await db.qb_connection.update({
    where: { id: connectionId },
    data: {
      access_token: encrypt(tokens.access_token),
      refresh_token: encrypt(tokens.refresh_token),
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000),
    },
  })

  return tokens.access_token
}
```

### Encryption
Tokens must be encrypted at rest. Use AES-256-GCM with an encryption key stored in environment variables, NOT in the database.

```ts
// lib/quickbooks/auth.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex') // 32 bytes

export function encrypt(text: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, KEY, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag().toString('hex')
  return `${iv.toString('hex')}:${tag}:${encrypted}`
}

export function decrypt(data: string): string {
  const [ivHex, tagHex, encrypted] = data.split(':')
  const decipher = createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
```

---

## Sync Architecture

### Two Sync Modes

**1. Polling Sync (MVP — simpler)**
- Triggered manually by user or on a cron (every 30 min)
- Queries QBO for all changes since `last_sync_at`
- Uses QBO's SQL-like query: `SELECT * FROM Purchase WHERE MetaData.LastUpdatedTime > '{timestamp}'`

**2. Webhook Sync (Post-MVP — real-time)**
- QBO sends event notifications when entities change
- Webhook handler receives entity IDs, then fetches full entity data
- Requires a publicly accessible webhook URL and Intuit verification

### Polling Sync Algorithm
```
function syncFromQuickBooks(connectionId):
  1. Get valid access token (refresh if needed)
  2. Get last_sync_at from qb_connection
  3. Create qb_sync_log entry (status: running)
  
  4. For each entity type in [Purchase, Bill, BillPayment]:
     a. Query QBO: SELECT * FROM {type} WHERE MetaData.LastUpdatedTime > '{last_sync}'
     b. Handle pagination (STARTPOSITION, MAXRESULTS)
     c. For each transaction:
        - Check if qb_transaction exists (by qb_entity_type + qb_entity_id)
        - If exists: update fields, set synced_at = now()
        - If new: insert with mapping_status = 'needs_review'
        - Run auto-match logic (see Entity Mapping below)
     d. Track counts: fetched, new, updated
  
  5. Update qb_connection.last_sync_at = now()
  6. Update qb_sync_log (status: success, counts)
  7. Return summary
```

### QBO Query Examples
```sql
-- All purchases since last sync
SELECT * FROM Purchase WHERE MetaData.LastUpdatedTime > '2024-03-01T00:00:00Z'
  STARTPOSITION 1 MAXRESULTS 100

-- All bills from a specific vendor
SELECT * FROM Bill WHERE VendorRef = '42'

-- All invoices (income)
SELECT * FROM Invoice WHERE MetaData.LastUpdatedTime > '2024-03-01T00:00:00Z'
```

### Rate Limits
- Standard: 500 requests/minute per company (realm ID)
- Implement exponential backoff on 429/403 responses
- Batch reads where possible: fetch 100 entities per query, not one at a time

---

## Entity Mapping Logic

When a QB transaction syncs, the system tries to auto-match it to a dashboard project and budget category.

### Auto-Match by Class → Project
QBO Classes tag transactions to projects. If John tags a plumbing bill with Class "1428 Maple Ridge":

```ts
function autoMatchProject(qbClassName: string, orgId: string): string | null {
  // Try exact match on project name
  const project = await db.project.findFirst({
    where: {
      organization_id: orgId,
      name: { equals: qbClassName, mode: 'insensitive' },
    },
  })
  if (project) return project.id

  // Try fuzzy match (contains the class name or address)
  const fuzzy = await db.project.findFirst({
    where: {
      organization_id: orgId,
      OR: [
        { name: { contains: qbClassName, mode: 'insensitive' } },
        { property: { address_line1: { contains: qbClassName, mode: 'insensitive' } } },
      ],
    },
  })
  return fuzzy?.id ?? null
}
```

### Auto-Match by Account → Budget Category
QBO Accounts (sub-accounts under COGS) map to budget categories:

```ts
// Mapping table (configurable per org, seeded with defaults)
const DEFAULT_ACCOUNT_MAPPING: Record<string, string> = {
  'Plumbing': 'plumbing',
  'Electrical': 'electrical',
  'HVAC': 'hvac',
  'Roofing': 'roof',
  'Flooring': 'flooring',
  'Kitchen': 'kitchen',
  'Paint': 'interior_paint',
  'Drywall': 'drywall',
  'Demo': 'demo_cleanup',
  'Landscaping': 'landscaping',
  // ...
}
```

### Mapping Statuses
| Status | Meaning | User Action Needed? |
|--------|---------|:---:|
| `auto_matched` | Both project and category matched automatically | Review recommended |
| `user_confirmed` | User verified the auto-match | No |
| `needs_review` | Could not auto-match (missing class, unknown account) | Yes |
| `ignored` | User marked as not project-related (personal expense, etc.) | No |
| `duplicate` | Matches an existing manual expense entry | Yes (merge or ignore) |

### Transaction Mapper UI
Show a table of `needs_review` transactions with dropdowns for:
- **Project**: dropdown of all active projects
- **Category**: dropdown of budget categories
- **Action**: Confirm / Ignore / Mark Duplicate

Batch confirmation should be supported (select multiple, assign same project).

---

## Error Handling

| Error | Handling |
|-------|---------|
| 401 Unauthorized | Token expired → auto-refresh → retry once |
| 403 Rate Limited | Exponential backoff, retry after `Retry-After` header |
| Token refresh fails | Set `sync_status = 'pending_reauth'`, notify user |
| Network timeout | Retry up to 3 times with backoff, log to sync_log |
| Entity not found | Skip entity, log warning, continue sync |
| Partial sync failure | Complete what you can, set `status = 'partial'`, log errors |

### User-Facing Error States
- **Connected & Syncing**: Green status, last sync time shown
- **Connected & Error**: Yellow warning, "Last sync failed — retrying" with details
- **Needs Reauthorization**: Red alert, "QuickBooks connection expired — click to reconnect"
- **Disconnected**: Gray, "Connect QuickBooks" button

---

## Implementation Files

All QB code lives in `src/lib/quickbooks/`:

| File | Responsibility |
|------|---------------|
| `auth.ts` | OAuth2 helpers, token encrypt/decrypt, token refresh |
| `api.ts` | Low-level QBO API wrapper (GET/POST with auth headers, rate limiting) |
| `sync.ts` | Sync engine: fetch entities, upsert qb_transaction, update sync log |
| `mapping.ts` | Auto-match logic: class→project, account→category, duplicate detection |

And API routes in `src/app/api/quickbooks/`:

| File | Responsibility |
|------|---------------|
| `connect/route.ts` | Generate auth URL + redirect |
| `callback/route.ts` | Exchange code for tokens, store, redirect |
| `sync/route.ts` | Validate auth, call sync engine, return results |
| `webhook/route.ts` | Verify signature, queue entity fetch |
| `disconnect/route.ts` | Revoke tokens, cleanup |
