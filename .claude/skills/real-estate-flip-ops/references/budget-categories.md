# Budget Categories — Rehab Cost Estimation & Scope of Work

## Table of Contents
1. [Scope of Work Tiers](#scope-of-work-tiers)
2. [Standard Budget Categories](#standard-budget-categories)
3. [Budget vs Actuals Structure](#budget-vs-actuals-structure)
4. [Data Model Requirements](#data-model-requirements)

---

## Scope of Work Tiers

Every rehab falls into one of three tiers. The system should support selecting a tier as a quick-start template that pre-populates budget categories:

### Cosmetic Rehab — $10-$25 per sq ft
Paint (interior + exterior), new flooring, updated fixtures (lighting, hardware, faucets), landscaping cleanup, deep clean. No structural or mechanical work. Typical timeline: 2-4 weeks.

### Heavy Rehab — $35-$50 per sq ft
Everything in cosmetic PLUS: new kitchen (cabinets, countertops, appliances), new bathrooms, some exterior work (siding, gutters, deck), possible HVAC update, minor electrical/plumbing updates. Keeping existing floor plan. Typical timeline: 6-10 weeks.

### Full Gut Rehab — $60-$100+ per sq ft
Down to studs. New roof, new HVAC, new electrical, new plumbing, new drywall, possibly moving walls (floor plan changes), foundation work, full exterior. Typical timeline: 12-20 weeks.

---

## Standard Budget Categories

These are the categories a house flipper uses. They map to construction trades, NOT accounting categories. The software must use these, not generic ones.

### Exterior Categories
| Category | Typical Subcategories |
|----------|----------------------|
| Roof | Tear-off, new shingles/metal, flashing, gutters, downspouts, fascia |
| Siding / Exterior Walls | Vinyl siding, Hardie board, stucco repair, brick repointing, painting |
| Windows | Replacement windows, new construction windows, trim, screens |
| Exterior Doors | Front entry door, back door, storm doors, hardware |
| Garage | Door replacement, opener, floor coating, framing repairs |
| Deck / Patio | New deck, repair, staining, concrete patio, pavers |
| Landscaping | Grading, sod, plants, mulch, tree removal, irrigation, fencing |
| Driveway / Walkway | Concrete, asphalt, pavers, repair cracks |
| Foundation | Crack repair, waterproofing, piering, crawl space work |

### Interior Categories
| Category | Typical Subcategories |
|----------|----------------------|
| Demo / Cleanup | Interior demo, debris removal, dumpster rental, haul-off |
| Framing / Structural | Wall removal, wall addition, header beams, subfloor repair, joists |
| Insulation | Attic insulation, wall insulation, crawl space |
| Drywall | Hang, tape, mud, texture, patch/repair |
| Interior Paint | Walls, ceilings, trim, doors, primer |
| Flooring | Hardwood, LVP, tile, carpet, underlayment, transitions |
| Kitchen | Cabinets, countertops, backsplash, sink, faucet, appliances, range hood |
| Bathrooms | Vanity, toilet, tub/shower, tile, faucets, mirrors, accessories |
| Interior Doors & Trim | Door slabs, jambs, casing, baseboards, crown molding, hardware |
| Closets | Shelving, organizers, doors |
| Fireplace | Insert, mantel, tile surround, gas line |
| Stairs / Railings | Treads, risers, balusters, handrails |

### Mechanical / Systems Categories
| Category | Typical Subcategories |
|----------|----------------------|
| Electrical | Panel upgrade, rewire, outlets, switches, light fixtures, ceiling fans, smoke detectors |
| Plumbing | Re-pipe, water heater, supply lines, drain lines, fixtures, hose bibs |
| HVAC | Furnace, AC, ductwork, thermostat, mini-split, maintenance |

### Soft Costs / Other
| Category | Typical Subcategories |
|----------|----------------------|
| Permits | Building permit, electrical permit, plumbing permit, HVAC permit, inspections |
| Architectural / Engineering | Plans, structural engineer report |
| Miscellaneous | Locksmith, cleaning service, pest control, mold remediation, asbestos abatement |
| Contingency | Budget buffer (typically 10-15% of total rehab) |

---

## Budget vs Actuals Structure

This is the CORE financial tracking view for a flipper during an active project. It answers: "Am I over or under budget on each category?"

### How it works
1. **Budget (Estimate)**: Set during deal analysis — the planned spend per category
2. **Actuals (Spent)**: Populated from QuickBooks expenses OR manual entry
3. **Variance**: Budget - Actuals (positive = under budget, negative = over budget)
4. **% Complete**: Actuals / Budget × 100

### Display Requirements
```
Category          | Budget    | Actual    | Variance  | % Spent | Status
------------------|-----------|-----------|-----------|---------|--------
Roof              | $12,000   | $11,500   | +$500     | 96%     | ✅ Under
Kitchen           | $18,000   | $21,200   | -$3,200   | 118%    | 🔴 Over
Plumbing          | $5,000    | $3,000    | +$2,000   | 60%     | 🔵 In Progress
Electrical        | $4,500    | $0        | +$4,500   | 0%      | ⚪ Not Started
...               |           |           |           |         |
TOTAL             | $65,000   | $52,700   | +$12,300  | 81%     |
Contingency (10%) | $6,500    | —         | —         |         |
GRAND TOTAL       | $71,500   | $52,700   | +$18,800  |         |
```

### Color Coding Rules
- **Green / Under**: Actuals < Budget
- **Yellow / Warning**: Actuals > 90% of Budget but < 100%
- **Red / Over**: Actuals > Budget
- **Gray / Not Started**: Actuals = $0

---

## Data Model Requirements

### Entities
```
BudgetCategory (template level — reusable across projects)
  - id, name, parent_category_id (nullable, for subcategories)
  - sort_order
  - is_default (boolean — included in standard template)
  - scope_tier (cosmetic, heavy, gut, all)

ProjectBudget (per project)
  - id, project_id (FK)
  - budget_category_id (FK)
  - estimated_amount (the plan)
  - notes

ProjectExpense (individual expense line items)
  - id, project_id (FK)
  - budget_category_id (FK)
  - amount
  - date
  - vendor_name
  - description
  - receipt_url (file attachment)
  - qb_transaction_id (nullable — links to QuickBooks if synced)
  - payment_method (cash, check, credit_card, lender_draw)
  - created_by
  - created_at

RehabEstimateTemplate (user's saved templates for quick estimation)
  - id, user_id (FK)
  - name (e.g., "My Standard Cosmetic Rehab")
  - scope_tier
  - items: JSON array of { category_id, default_amount, per_sqft_rate }
```

### Important Business Rules
1. Users must be able to create CUSTOM categories beyond the defaults
2. Budget categories should support two levels of hierarchy (category → subcategory)
3. Expenses can be entered manually OR synced from QuickBooks — the system must handle both and deduplicate
4. A single expense can only map to ONE budget category (no splitting — if needed, create two expense entries)
5. The contingency line should auto-calculate as a percentage of total budget (user-configurable, default 10%)
6. Budget templates should be saveable and reusable across projects
7. When a user creates a new project, they should be able to pick a template OR start blank
