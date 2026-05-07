# API Routes — Endpoints, Contracts & Auth

## Table of Contents
1. [Route Overview](#route-overview)
2. [Authentication](#authentication)
3. [QuickBooks Routes](#quickbooks-routes)
4. [Project & Budget Routes](#project--budget-routes)
5. [Upload Routes](#upload-routes)
6. [Report Routes](#report-routes)

---

## Route Overview

Most CRUD operations are handled directly via Supabase client in server components and server actions — NOT through API routes. API routes are reserved for:
- External integrations (QuickBooks OAuth, webhooks)
- Complex server-side operations (PDF generation, file uploads)
- Operations that need the service role key

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/quickbooks/connect` | GET | Initiate OAuth2 flow |
| `/api/quickbooks/callback` | GET | Handle OAuth2 redirect |
| `/api/quickbooks/sync` | POST | Trigger manual sync |
| `/api/quickbooks/webhook` | POST | Receive QBO event notifications |
| `/api/quickbooks/disconnect` | POST | Revoke tokens, delete connection |
| `/api/projects/[id]/expenses` | POST | Create expense (with optional QB link) |
| `/api/projects/[id]/budget/apply-template` | POST | Apply budget template to project |
| `/api/deals/[id]/report` | GET | Generate PDF investment report |
| `/api/uploads/signed-url` | POST | Get signed URL for Supabase Storage |

---

## Authentication

All API routes (except QB webhook) require a valid Supabase session. Extract it from cookies:

```ts
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... proceed
}
```

The QB webhook route uses a **verifier token** instead of user auth (QBO sends events server-to-server).

---

## QuickBooks Routes

### POST `/api/quickbooks/connect`
Initiates OAuth2 Authorization Code flow.

**Action**: Redirect user to Intuit's authorization URL.

```
Response: 302 Redirect → https://appcenter.intuit.com/connect/oauth2
  ?client_id={QB_CLIENT_ID}
  &redirect_uri={QB_REDIRECT_URI}
  &response_type=code
  &scope=com.intuit.quickbooks.accounting
  &state={csrf_token}
```

### GET `/api/quickbooks/callback`
Handles the OAuth2 redirect from Intuit.

**Query Params**: `code`, `state`, `realmId`

**Action**:
1. Verify `state` matches stored CSRF token
2. Exchange `code` for access + refresh tokens via Intuit token endpoint
3. Store tokens in `qb_connection` table (encrypted)
4. Redirect user to `/settings/quickbooks?connected=true`

**Token Exchange Request**:
```
POST https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(client_id:client_secret)

grant_type=authorization_code&code={code}&redirect_uri={redirect_uri}
```

### POST `/api/quickbooks/sync`
Triggers a manual sync of QB transactions.

**Auth**: Requires authenticated user with admin/owner role.

**Request Body**:
```json
{
  "fullSync": false,
  "since": "2024-01-01"  // optional, defaults to last_sync_at
}
```

**Action**:
1. Refresh access token if expired
2. Query QBO for Purchase, Bill, BillPayment entities since last sync
3. Upsert into `qb_transaction` table
4. Run auto-matching logic (class → project, account → category)
5. Log results to `qb_sync_log`

**Response**:
```json
{
  "status": "success",
  "fetched": 47,
  "new": 12,
  "updated": 3,
  "needsReview": 8
}
```

### POST `/api/quickbooks/webhook`
Receives event notifications from QBO when transactions change.

**Auth**: Verify Intuit webhook signature (HMAC-SHA256 with verifier token).

**Payload** (from Intuit):
```json
{
  "eventNotifications": [{
    "realmId": "123456",
    "dataChangeEvent": {
      "entities": [{
        "name": "Purchase",
        "id": "789",
        "operation": "Create",
        "lastUpdated": "2024-03-15T10:30:00Z"
      }]
    }
  }]
}
```

**Action**:
1. Verify signature
2. For each entity change, queue a fetch of that specific entity from QBO API
3. Upsert into `qb_transaction`
4. Return 200 OK immediately (process async)

### POST `/api/quickbooks/disconnect`
Revokes OAuth tokens and deletes the connection.

**Action**:
1. Call Intuit revoke endpoint
2. Delete `qb_connection` record
3. Mark all `qb_transaction` records as orphaned (don't delete — keep for history)

---

## Project & Budget Routes

### POST `/api/projects/[id]/expenses`
Create a new expense, optionally linking it to a QB transaction.

**Request Body**:
```json
{
  "budgetCategoryId": "uuid",
  "amountCents": 150000,
  "expenseDate": "2024-03-15",
  "vendorName": "ABC Plumbing",
  "description": "Rough-in plumbing labor",
  "paymentMethod": "check",
  "qbTransactionId": "uuid-or-null"
}
```

**Action**:
1. Insert into `project_expense`
2. If `qbTransactionId` provided, update that `qb_transaction` record with `linked_expense_id` and set `mapping_status` to `user_confirmed`
3. Return created expense

### POST `/api/projects/[id]/budget/apply-template`
Apply a saved budget template to a project.

**Request Body**:
```json
{
  "templateId": "uuid",
  "sqft": 1800,
  "overwrite": false
}
```

**Action**:
1. Load template lines
2. For each line, calculate amount (either `default_amount_cents` or `per_sqft_rate_cents × sqft`)
3. Insert/upsert into `project_budget`
4. Return the populated budget

---

## Upload Routes

### POST `/api/uploads/signed-url`
Generate a signed upload URL for Supabase Storage.

**Request Body**:
```json
{
  "bucket": "design-boards",
  "path": "project-uuid/kitchen/mood-board-1.jpg",
  "contentType": "image/jpeg"
}
```

**Response**:
```json
{
  "signedUrl": "https://xxx.supabase.co/storage/v1/upload/sign/...",
  "path": "design-boards/project-uuid/kitchen/mood-board-1.jpg"
}
```

The client uploads directly to Supabase Storage using the signed URL. This avoids routing large files through the API.

---

## Report Routes

### GET `/api/deals/[id]/report`
Generate a PDF investment report for a deal analysis.

**Query Params**: `format=pdf` (default)

**Action**:
1. Fetch deal analysis + comps + property data
2. Render to PDF using a template (React-PDF or Puppeteer)
3. Return PDF as download

**Response**: `Content-Type: application/pdf` with attachment header.
