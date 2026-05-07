# Deal Analysis — Formulas, Methodology & Data Model

## Table of Contents
1. [Core Formulas](#core-formulas)
2. [The Flip Analyzer](#the-flip-analyzer)
3. [The BRRRR Analyzer](#the-brrrr-analyzer)
4. [Comparable Sales (Comps)](#comparable-sales)
5. [Investment Reports](#investment-reports)
6. [Data Model Requirements](#data-model-requirements)

---

## Core Formulas

### After Repair Value (ARV)
The estimated market value of the property AFTER all renovations are complete. Determined by analyzing comparable sales (comps) in the immediate neighborhood — houses that sold in the last 3-6 months that are fully renovated with similar sq footage, bed/bath count, and lot size.

**ARV is NOT the current value. It is the projected future sale price.**

### Maximum Purchase Price (MPP) — The 70% Rule
```
MPP = (ARV × 0.70) - Estimated Rehab Costs
```

The 30% margin covers: ~15% profit + ~15% fixed costs (buying costs, holding costs, selling costs, financing costs).

**Adjustments by market and experience:**
- Conservative (new investor): 65-70% of ARV
- Standard: 70% of ARV
- Competitive market / experienced investor: 75% of ARV
- Hot coastal market / cosmetic flip only: 78-80% of ARV
- Investor with RE license (saves 3% commission): can go 3% higher

**The software should let users set their own % rule as a personal setting**, not hardcode 70%.

### The Detailed MPP Formula (More Accurate)
```
MPP = ARV - Rehab Costs - Fixed Costs - Desired Profit
```
Where Fixed Costs = Buying Closing Costs + Holding Costs + Selling Closing Costs + Financing Costs

This is more accurate for properties outside the $150K-$400K sweet spot where the 70% rule works best. For cheap properties (<$100K), fixed costs are a larger percentage; for expensive properties (>$500K), the 70% rule is too conservative.

### Return on Investment (ROI)
```
ROI = (Net Profit / Total Cash Invested) × 100
```

### Cash-on-Cash Return
```
Cash-on-Cash = (Annual Pre-Tax Cash Flow / Total Cash Invested) × 100
```
Used primarily for BRRRR/rental analysis, not flips.

### Annualized ROI
```
Annualized ROI = ROI × (365 / Days Held)
```
Important because a 20% ROI on a 3-month flip is far better than 20% on a 12-month flip.

---

## The Flip Analyzer

The Flip Analyzer is the primary deal evaluation tool. It walks the user through a step-by-step analysis:

### Input Fields (Required)
| Field | Type | Description |
|-------|------|-------------|
| Property Address | text | Full address including zip |
| Square Footage | number | Total living area |
| Bedrooms | number | Bed count |
| Bathrooms | number | Bath count (supports 0.5 for half baths) |
| Lot Size | number | Lot sq ft or acres |
| Year Built | number | Original construction year |
| Property Type | enum | SFR, Duplex, Triplex, Quad, Townhome, Condo |
| ARV | currency | After Repair Value from comp analysis |
| Purchase Price | currency | Asking or offer price |
| Rehab Estimate | currency | Total estimated rehab cost |
| Financing Type | enum | Cash, Hard Money, Conventional, Private Money |

### Input Fields (Financing — if not Cash)
| Field | Type | Description |
|-------|------|-------------|
| Loan Amount | currency | Or LTV percentage |
| Interest Rate | percentage | Annual rate |
| Loan Term | months | Typical hard money: 6-12 months |
| Origination Fee (Points) | percentage | Typical: 1-3 points |
| Other Loan Fees | currency | Appraisal, inspection, doc fees |

### Input Fields (Costs)
| Field | Type | Description |
|-------|------|-------------|
| Buying Closing Costs | currency | Title, escrow, recording, attorney |
| Estimated Holding Period | months | Time from purchase close to sale close |
| Monthly Holding Costs | currency | Taxes + insurance + utilities + landscaping |
| Selling Closing Costs | currency | Title, escrow, transfer taxes |
| Agent Commission (Buy) | percentage | 0% if buying direct, 2-3% if using agent |
| Agent Commission (Sell) | percentage | Typically 5-6% total (2.5-3% per side) |

### Calculated Outputs
| Output | Formula |
|--------|---------|
| Total Acquisition Cost | Purchase Price + Buying Closing + Loan Fees |
| Total Rehab Cost | Rehab Estimate (from budget or lump sum) |
| Total Holding Cost | Monthly Holding × Holding Period + Total Loan Interest |
| Total Selling Cost | (ARV × Sell Commission %) + Selling Closing Costs |
| Total Project Cost | Acquisition + Rehab + Holding + Selling |
| Total Cash Invested | Down Payment + Closing + Holding (out of pocket) |
| Net Profit | ARV - Total Project Cost |
| ROI | Net Profit / Total Cash Invested × 100 |
| Annualized ROI | ROI × (365 / (Holding Period × 30)) |
| Profit Margin | Net Profit / ARV × 100 |

### Deal Score / Traffic Light
The software should show a simple visual indicator:
- **Green**: Net Profit > 15% of ARV and ROI > 20%
- **Yellow**: Net Profit 10-15% of ARV or ROI 10-20%
- **Red**: Net Profit < 10% of ARV or ROI < 10%

---

## The BRRRR Analyzer

BRRRR = Buy, Rehab, Rent, Refinance, Repeat. An alternative exit strategy where instead of selling, the investor refinances and holds as a rental.

### Additional Input Fields (beyond Flip Analyzer)
| Field | Type | Description |
|-------|------|-------------|
| Monthly Rent | currency | Expected rental income |
| Vacancy Rate | percentage | Typical: 5-10% |
| Property Management Fee | percentage | Typical: 8-10% of rent |
| Monthly Maintenance Reserve | currency | Or % of rent (typical 5%) |
| Refinance LTV | percentage | What the bank will lend on ARV (typical 70-75%) |
| Refinance Interest Rate | percentage | Long-term conventional rate |
| Refinance Term | years | Typically 30 years |

### Key BRRRR Outputs
| Output | Formula |
|--------|---------|
| Cash Left in Deal | Total Invested - Refinance Loan Amount |
| Monthly Cash Flow | Rent - Vacancy - Mgmt - Maintenance - Mortgage - Taxes - Insurance |
| Annual Cash Flow | Monthly × 12 |
| Cash-on-Cash Return | Annual Cash Flow / Cash Left in Deal × 100 |
| Equity Captured | ARV - Refinance Loan Amount |

**Ideal BRRRR**: Cash Left in Deal = $0 (you pulled ALL your money out) and Cash Flow > $200/month.

---

## Comparable Sales

Comps are the foundation of ARV. The system should support:

### Comp Criteria
- **Location**: Same neighborhood/subdivision, ideally within 0.5 miles
- **Recency**: Sold within last 3-6 months (adjust for market speed)
- **Similarity**: Within 200 sq ft, same bed/bath count (±1), similar lot size, similar age
- **Condition**: Must be renovated/updated comps (not distressed sales)

### Comp Data Fields
| Field | Type |
|-------|------|
| Address | text |
| Sale Price | currency |
| Sale Date | date |
| Square Footage | number |
| Price per Sq Ft | calculated |
| Bedrooms / Bathrooms | numbers |
| Lot Size | number |
| Year Built | number |
| Distance from Subject | calculated |
| Days on Market | number |
| Notes | text (e.g., "pool adds value", "busy street discount") |

### ARV Calculation from Comps
```
ARV = Average of top 3-5 most comparable sale prices
      (adjusted for sq ft differences using price-per-sqft)
```

The system should let users select which comps to include/exclude and see the ARV update in real time.

---

## Investment Reports

Flippers use professional investment reports to:
1. Get funding from hard money lenders or private investors
2. Present deals to partners
3. Document the analysis for their own records

### Report Sections
1. Executive Summary (property photo, address, ARV, purchase price, profit, ROI)
2. Property Details (specs, condition, photos)
3. Comparable Sales Analysis (comp table + map)
4. Rehab Scope of Work (budget by category)
5. Financial Analysis (full P&L projection)
6. Exit Strategy (flip timeline or BRRRR rental analysis)

The system should auto-generate these as PDF from the deal data.

---

## Data Model Requirements

### Minimum entities for Deal Analysis
```
Property
  - id, address, city, state, zip, county
  - sqft, bedrooms, bathrooms, lot_size, year_built, property_type
  - current_value, arv
  - status (lead, analyzed, under_contract, purchased, etc.)
  - pipeline_stage (see project-lifecycle.md)
  - created_at, updated_at

DealAnalysis
  - id, property_id (FK)
  - analysis_type (flip, brrrr)
  - arv, purchase_price, rehab_estimate
  - financing_type, loan_amount, interest_rate, loan_term, points
  - buying_closing_costs, selling_closing_costs
  - holding_period_months, monthly_holding_cost
  - buy_agent_commission_pct, sell_agent_commission_pct
  - user_arv_percentage (their personal % rule, default 70)
  - calculated fields (mpp, total_cost, net_profit, roi, annualized_roi)
  - notes
  - created_at, updated_at

Comp
  - id, deal_analysis_id (FK)
  - address, sale_price, sale_date
  - sqft, bedrooms, bathrooms, lot_size, year_built
  - distance_from_subject, days_on_market
  - price_per_sqft (calculated)
  - included_in_arv (boolean — user can exclude)
  - notes
```

### Notes for developers
- A property can have MULTIPLE deal analyses (different scenarios, flip vs BRRRR)
- Comps belong to a specific analysis, not to the property
- All currency fields should store cents (integer) to avoid floating point issues
- The ARV percentage should be a user-level setting with a per-analysis override
- Calculated fields should be computed on read, not stored, to stay in sync
