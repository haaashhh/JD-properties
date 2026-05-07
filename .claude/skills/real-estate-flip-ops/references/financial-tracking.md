# Financial Tracking — Costs, QuickBooks Mapping & Margin Analysis

## Table of Contents
1. [Complete Cost Breakdown of a Flip](#complete-cost-breakdown)
2. [Profit & Loss Per Project](#profit--loss-per-project)
3. [QuickBooks Integration Mapping](#quickbooks-integration-mapping)
4. [Real-Time Margin Tracking](#real-time-margin-tracking)
5. [Reporting & Tax Considerations](#reporting--tax)
6. [Data Model Requirements](#data-model-requirements)

---

## Complete Cost Breakdown

Every dollar in a flip falls into one of four buckets. The system MUST track all four, not just rehab.

### 1. Acquisition Costs
| Item | Typical Range | Notes |
|------|--------------|-------|
| Purchase Price | Varies | The property itself |
| Title Insurance (Buyer) | $500-$2,000 | Required by lender |
| Escrow / Settlement Fee | $500-$1,500 | Closing agent fee |
| Recording Fees | $50-$300 | County recorder |
| Attorney Fee | $300-$1,000 | If attorney state |
| Appraisal Fee | $300-$600 | Required by lender |
| Inspection Fee | $300-$500 | Pre-purchase inspection |
| Loan Origination (Points) | 1-3% of loan | Hard money lender fee |
| Other Loan Fees | $500-$2,000 | Doc prep, underwriting, wire fees |
| Transfer Tax (Buyer portion) | Varies by state | Some states split between buyer/seller |
| Prorated Taxes/Insurance | Varies | Adjustments at closing |

**Typical acquisition costs (excluding purchase price): 3-5% of purchase price**

### 2. Rehab Costs
See `budget-categories.md` for detailed breakdown. Summary:
- Cosmetic: $10-$25/sqft
- Heavy: $35-$50/sqft
- Full Gut: $60-$100+/sqft
- Always add 10-15% contingency

### 3. Holding Costs
| Item | Typical Monthly | Notes |
|------|----------------|-------|
| Loan Interest | Varies | Hard money: 10-15% annual, paid monthly |
| Property Taxes | Varies | Prorated from county rate |
| Property Insurance | $100-$300/mo | Builder's risk or vacant property policy |
| Utilities | $150-$400/mo | Electric, water, gas (needed during rehab) |
| Landscaping | $100-$200/mo | Prevent municipal fines |
| HOA Dues | $0-$500/mo | If applicable |
| Security | $0-$200/mo | Vacant property monitoring if needed |

**Typical holding costs: $1,500-$4,000/month depending on loan size and location**

**Critical**: Holding period = days from acquisition close to sale close. Every day costs money. Speed is profit.

### 4. Selling Costs
| Item | Typical Range | Notes |
|------|--------------|-------|
| Listing Agent Commission | 2.5-3% of sale price | Seller pays |
| Buyer Agent Commission | 2.5-3% of sale price | Seller traditionally pays (market dependent) |
| Title Insurance (Seller) | $500-$2,000 | Owner's policy |
| Escrow / Settlement Fee | $500-$1,500 | May be split |
| Transfer Tax (Seller) | Varies by state | Documentary stamps, etc. |
| Home Warranty | $400-$600 | Often provided as buyer incentive |
| Staging | $1,000-$3,000 | Furniture rental for showings |
| Photography | $200-$500 | Professional listing photos |
| Repairs from Buyer Inspection | $0-$5,000+ | Negotiated credits/repairs |
| Loan Payoff | Varies | Principal + any remaining interest |
| Prorated Taxes | Varies | Seller pays through close date |

**Typical selling costs: 8-10% of sale price**

---

## Profit & Loss Per Project

### The P&L View
This is the most important financial view. It should be available for every project in any stage.

```
REVENUE
  Sale Price (actual or projected)           $250,000
  Less: Seller Closing Costs                  ($6,000)
  Less: Agent Commissions (total)            ($15,000)
  Less: Loan Payoff                         ($140,000)
  ─────────────────────────────────────────
  Net Sale Proceeds                           $89,000

COSTS
  Purchase Price                             $150,000
  Buyer Closing Costs                          $5,500
  Loan Origination / Fees                      $4,500
  Rehab Costs (actual or estimated)           $45,000
  Holding Costs (actual or estimated)          $8,000
  ─────────────────────────────────────────
  Total Investment                           $213,000

PROFIT
  Net Profit (Net Sale Proceeds - Total Costs
             adjusted for loan)               $37,000
  ROI                                          24.7%
  Profit Margin (Net Profit / Sale Price)      14.8%
  Annualized ROI                               59.2%
  Days Held                                      152
```

### Active vs Sold Projects
- **Active projects**: Use ESTIMATED sale price (ARV), estimated remaining costs. Show "Projected Profit."
- **Sold projects**: Use ACTUAL numbers for everything. Show "Actual Profit."
- The dashboard should clearly label which numbers are projected vs actual.

---

## QuickBooks Integration Mapping

### Why QuickBooks Integration Matters
John currently pays contractors via QuickBooks. Then he manually re-enters the same data into FlipperForce. The integration eliminates this double entry.

### QuickBooks Online (QBO) Entities → Dashboard Entities

| QBO Entity | Dashboard Entity | Mapping Logic |
|-----------|-----------------|---------------|
| **Bill** (from vendor) | ProjectExpense | Map by vendor + class/project tag |
| **Expense** (direct purchase) | ProjectExpense | Map by class/project tag or memo |
| **Check** (payment) | ProjectExpense | Map by payee + class |
| **Invoice** (to customer) | SaleTransaction | For tracking income from property sale |
| **Vendor** | Contractor | Match by name or create mapping |
| **Customer** | Property/Buyer | Map to project's buyer record |
| **Account** | BudgetCategory | Chart of accounts → budget categories |
| **Class** | Project | QBO Classes can tag transactions to projects |

### Recommended QBO Setup for Flippers
1. **Use Classes** in QBO to tag every transaction to a property/project (e.g., Class = "1428 Maple Ridge")
2. **Use Sub-accounts** under Costs of Goods Sold for rehab categories (Plumbing, Electrical, etc.)
3. **Use Vendors** consistently for contractor names

### Sync Strategy
1. **Initial Connect**: OAuth2 flow → get access + refresh tokens
2. **Initial Import**: Pull all transactions with project-related Classes from last 12 months
3. **Ongoing Sync**: 
   - Option A: Webhook-driven (QBO sends events when transactions are created/updated)
   - Option B: Polling every 15-30 minutes using `SELECT * FROM Purchase WHERE MetaData.LastUpdatedTime > '{last_sync}'`
4. **Mapping**: Each synced transaction needs user confirmation of:
   - Which project it belongs to (auto-match by Class, user confirms)
   - Which budget category it maps to (auto-match by Account, user confirms)
5. **Conflict Resolution**: If a transaction exists in both QB and manual entry, flag as potential duplicate

### QBO API Key Entities
```
Purchase (expenses paid by business)
  - PaymentType: Cash, Check, CreditCard
  - AccountRef → maps to expense account (budget category)
  - EntityRef → vendor (contractor)
  - Line items with amount, description
  - TxnDate, TotalAmt
  - ClassRef → project

Bill (invoice FROM vendor, not yet paid)
  - VendorRef → contractor
  - Line items
  - DueDate, Balance
  - ClassRef → project

BillPayment (payment of a Bill)
  - VendorRef
  - TotalAmt
  - PayType

Invoice (invoice TO customer/buyer)
  - CustomerRef → buyer
  - Line items
  - TotalAmt, Balance, DueDate
```

### Sync Status Tracking
Every synced transaction should show:
- QB Transaction ID
- QB Sync Date
- Auto-matched project (confirmed/pending)
- Auto-matched category (confirmed/pending)
- Status: synced, needs_review, conflict, ignored

---

## Real-Time Margin Tracking

### The Margin Dashboard
This is what John wants most — seeing at a glance whether he's making money.

**Per Project:**
```
Project: 1428 Maple Ridge
Purchase: $155,000 | ARV: $250,000 | Rehab Budget: $45,000

Capital Deployed: $178,500  (purchase + closing + rehab spent so far)
Remaining to Spend: $12,300  (rehab budget remaining)
Projected Total Cost: $213,000
Projected Sale Price: $250,000
Projected Net Profit: $37,000  (after all costs)
Current Margin: 14.8%
Status: 🟢 On track (under budget by $2,100)
```

**Portfolio Summary:**
```
Active Projects: 3
Total Capital Deployed: $771,800
Total Projected Profit: $218,355
Average ROI (Active): 19.8%
Completed (Last 12 Mo): 2 projects
Average Actual ROI (Completed): 22.3%
```

### Alerts
The system should alert when:
- A budget category exceeds its estimate by > 10%
- Total project costs exceed projected costs
- Holding period exceeds original estimate
- A project's projected profit drops below user-defined threshold

---

## Reporting & Tax

### Reports the System Should Generate
1. **Project P&L** — Per project, detailed revenue/cost breakdown
2. **Portfolio Summary** — All projects, key metrics comparison table
3. **Budget vs Actuals** — Per project, per category variance report
4. **Expense Report** — All expenses for a project or date range, exportable
5. **Revenue & Profit Over Time** — Chart showing monthly/quarterly revenue and profit trend
6. **Capital Deployed Over Time** — How much cash is tied up at any point
7. **Pipeline Report** — Properties by stage with projected values

### Tax Reporting Needs
- **1099-NEC**: For contractors paid > $600 in a calendar year (QB handles this, but dashboard should flag)
- **Schedule C / Entity Return**: Profit per project is income, costs are COGS
- **Expense Export**: CSV export of all expenses by project, category, date, vendor — for accountant
- **Capital Gains**: If holding > 1 year, different tax treatment (rare for flips)

---

## Data Model Requirements

### Financial Entities (beyond what's in other reference files)
```
ProjectFinancials (summary record, calculated from components)
  - id, project_id (FK)
  - purchase_price, buyer_closing_costs, loan_origination_fees
  - total_rehab_budget, total_rehab_actual
  - total_holding_cost_actual
  - sale_price, seller_closing_costs, agent_commissions
  - loan_payoff_amount
  - net_profit (calculated)
  - roi (calculated)
  - status (projected, final)

QuickBooksConnection
  - id, user_id (FK)
  - realm_id (QBO company ID)
  - access_token (encrypted)
  - refresh_token (encrypted)
  - token_expires_at
  - last_sync_at
  - sync_status (active, error, disconnected)

QuickBooksTransaction (mirror of synced QBO data)
  - id, qb_connection_id (FK)
  - qb_entity_type (Purchase, Bill, BillPayment, Invoice)
  - qb_entity_id (QBO's ID)
  - qb_txn_date
  - qb_vendor_name
  - qb_class_name (project tag in QBO)
  - qb_account_name (expense account)
  - qb_amount
  - qb_memo
  - qb_last_updated

  # Mapping fields
  - mapped_project_id (FK, nullable — user confirms)
  - mapped_budget_category_id (FK, nullable — user confirms)
  - mapping_status (auto_matched, user_confirmed, needs_review, ignored, duplicate)
  - linked_expense_id (FK to ProjectExpense, nullable)
  
  - synced_at, created_at, updated_at

QuickBooksSyncLog
  - id, qb_connection_id (FK)
  - sync_started_at, sync_completed_at
  - transactions_fetched, transactions_new, transactions_updated
  - errors (JSON)
  - status (success, partial, failed)
```

### Key Business Rules
1. QuickBooks is the source of truth for actual expenses. Manual entries are supplementary.
2. When a QB transaction syncs, auto-match to project by Class name and to category by Account name.
3. Users must be able to override auto-matches and mark transactions as "ignored" (not all QB expenses are project-related).
4. The system must handle QB token refresh (tokens expire every ~1 hour, refresh tokens last longer).
5. Never store raw QB credentials — only OAuth tokens, encrypted at rest.
6. Sync should be resilient — if a sync fails, log the error and retry next cycle without losing data.
