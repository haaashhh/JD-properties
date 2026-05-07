# Project Lifecycle — Pipeline, Milestones & Scheduling

## Table of Contents
1. [Pipeline Stages](#pipeline-stages)
2. [Required Data Per Stage](#required-data-per-stage)
3. [Construction Scheduling](#construction-scheduling)
4. [Task Management](#task-management)
5. [Photo Logs](#photo-logs)
6. [Contractor Management](#contractor-management)
7. [Lender Draw Tracking](#lender-draw-tracking)
8. [Data Model Requirements](#data-model-requirements)

---

## Pipeline Stages

Every property in the system lives in one of these stages. The UI should show a Kanban-style pipeline board where properties can be dragged between stages.

| Stage | Description | Key Actions |
|-------|-------------|-------------|
| **Lead** | Potential deal identified, not yet analyzed | Add property details, run initial numbers |
| **Analyzing** | Running deal analysis, pulling comps | Run Flip/BRRRR analyzer, visit property |
| **Offer Made** | Submitted an offer to seller | Track offer amount, counter-offers, deadlines |
| **Under Contract** | Offer accepted, in due diligence | Schedule inspections, finalize financing, build SOW |
| **Purchased** | Closed on acquisition | Record actual purchase price, begin project setup |
| **In Rehab** | Active construction | Track budget, schedule, draws, photos |
| **Punch List** | Rehab substantially complete, finishing touches | Final walkthrough items, cleaning, staging |
| **Listed** | On market for sale | Track listing price, showing feedback, DOM |
| **Under Contract (Sale)** | Accepted offer from buyer | Buyer inspection, appraisal, closing prep |
| **Sold** | Sale closed, funds received | Record final sale price, calculate actual profit |
| **Portfolio** | Completed — in historical records | Reference for lender presentations, tax reporting |

### Pipeline Dashboard KPIs
The main dashboard should show:
- **Active Projects**: Count of properties in "Purchased" through "Under Contract (Sale)"
- **Capital Deployed**: Total cash invested across active projects
- **Projected Profit (Active)**: Sum of projected net profit on active deals
- **Average ROI (Last 12 Mo)**: Based on sold properties
- **Pipeline by Stage**: Donut/bar chart showing property count per stage

---

## Required Data Per Stage

### Lead Stage
- Property address, basic specs (bed/bath/sqft)
- Source (MLS, wholesaler, direct mail, driving for dollars, auction)
- Asking price
- Quick ARV estimate
- Notes / photos

### Analyzing Stage
- Full comp analysis with selected comps
- Detailed rehab estimate (by category)
- Deal analysis results (MPP, projected profit, ROI)
- Property condition notes
- Inspection report (if available)

### Under Contract Stage
- Offer price (accepted)
- Contract date, closing date, inspection deadline, financing deadline
- Earnest money amount
- Financing details (lender, loan terms)
- Scope of Work finalized
- Construction schedule drafted

### Purchased / In Rehab Stage
- Actual purchase price and closing costs
- Budget locked (from rehab estimate)
- Contractor assignments per category
- Schedule with milestones
- Active expense tracking (budget vs actuals)
- Lender draw schedule
- Photo log (before/during/after)

### Listed Stage
- Listing price
- Listing date
- Agent name/contact
- Showing feedback log
- Days on Market counter (auto-calculated)
- Price reduction history

### Sold Stage
- Sale price
- Sale date
- Actual selling costs (commissions, closing)
- Final P&L calculation
- Before/after photos (for portfolio)
- Lessons learned notes

---

## Construction Scheduling

### Schedule Format
Flippers typically use a simplified Gantt chart showing construction phases in chronological order. This is NOT a full MS Project — it's a visual timeline.

### Standard Construction Sequence
This is the typical order of operations (trades can overlap but this is the dependency chain):

1. **Permits** — Pull before any work starts
2. **Demo** — Tear out old materials, gut if needed
3. **Structural** — Foundation, framing, headers, subfloor
4. **Rough Mechanical** — Rough-in plumbing, electrical, HVAC (before drywall)
5. **Inspections** — City inspects rough mechanical
6. **Insulation** — After rough mechanical passes inspection
7. **Drywall** — Hang, tape, mud, texture
8. **Interior Paint** — Walls and ceilings
9. **Flooring** — After paint to avoid damage
10. **Kitchen Install** — Cabinets, countertops, backsplash
11. **Bathroom Install** — Vanities, tile, fixtures
12. **Trim & Doors** — Baseboards, casing, door hardware
13. **Finish Mechanical** — Outlets, switches, fixtures, toilets, faucets
14. **Exterior** — Roof, siding, windows, landscaping (can parallel interior)
15. **Final Inspections** — Certificate of occupancy if needed
16. **Cleaning & Staging** — Deep clean, stage for sale
17. **Photography** — Professional photos for listing

### Schedule Data Per Item
| Field | Type |
|-------|------|
| Task/Phase Name | text |
| Contractor Assigned | FK to contractor |
| Start Date | date |
| End Date | date |
| Duration (days) | calculated |
| Dependencies | list of prerequisite task IDs |
| Status | not_started, in_progress, complete, blocked |
| Notes | text |

---

## Task Management

Beyond the construction schedule, flippers track individual to-dos:

### Task Types
- **Pre-Purchase**: Get inspections, pull permits, finalize financing
- **During Rehab**: Specific work items within a phase
- **Pre-Sale**: Stage home, schedule photographer, list on MLS
- **Administrative**: File insurance claim, send draw request to lender

### Task Fields
| Field | Type |
|-------|------|
| Title | text |
| Project | FK |
| Assigned To | FK (team member or contractor) |
| Due Date | date |
| Priority | low, medium, high |
| Status | todo, in_progress, done |
| Category | pre_purchase, rehab, pre_sale, admin |
| Notes | text |

---

## Photo Logs

Photos are critical for: tracking progress, documenting issues, lender draw requests, before/after comparisons, and portfolio presentations.

### Photo Requirements
- Every photo must be tagged with: project, room/area, date taken, caption
- Photos should support chronological timeline view (oldest → newest)
- Before/during/after tagging for portfolio use
- Bulk upload support (contractors take many photos per visit)
- Mobile upload support (contractors upload from phone on-site)

### Room/Area Tags
Kitchen, Living Room, Dining Room, Master Bedroom, Bedroom 2/3/4, Master Bath, Bathroom 2/3, Hallway, Basement, Attic, Garage, Front Exterior, Rear Exterior, Side Exterior, Yard, Roof, Driveway, Other

---

## Contractor Management

### Contractor Record
| Field | Type |
|-------|------|
| Name / Company | text |
| Trade | enum (GC, Plumber, Electrician, HVAC, Roofer, Painter, Flooring, Drywall, etc.) |
| Phone | text |
| Email | text |
| License Number | text |
| Insurance Expiry | date |
| Rating | 1-5 stars |
| Notes | text |
| Active | boolean |

### Contractor-Project Association
A project can have multiple contractors. A contractor can work on multiple projects. Track:
- Which categories/tasks they're assigned to
- Their bid amount vs actual payment
- Payment history (linked to expenses)

---

## Lender Draw Tracking

When using a hard money loan, the lender doesn't release rehab funds upfront. Instead, they release money in "draws" as work is completed.

### How Draws Work
1. Investor completes a phase of work (e.g., roof is done)
2. Investor submits a draw request with photos and receipts
3. Lender sends an inspector to verify work completion
4. Lender releases funds (the "draw")

### Draw Data
| Field | Type |
|-------|------|
| Draw Number | integer (sequential: 1, 2, 3...) |
| Project | FK |
| Request Date | date |
| Amount Requested | currency |
| Categories Included | list of budget categories covered |
| Supporting Photos | list of photo IDs |
| Inspector Name | text |
| Inspection Date | date |
| Amount Approved | currency |
| Disbursement Date | date |
| Status | requested, inspection_scheduled, approved, disbursed, denied |
| Notes | text |

### Draw vs Expense Distinction
- **Draw**: Money coming IN from the lender to the investor
- **Expense**: Money going OUT from the investor to contractors/vendors
- These are separate tracks. Total draws ≠ total expenses (there's often a gap the investor funds out of pocket)

---

## Data Model Requirements

### Core Entities
```
Project
  - id, property_id (FK)
  - name (e.g., "1428 Maple Ridge")
  - pipeline_stage (enum — see stages above)
  - stage_changed_at (timestamp)
  - purchase_date, target_completion_date, actual_completion_date
  - sale_date, listing_date
  - status (active, completed, cancelled)
  - created_at, updated_at

ProjectMilestone
  - id, project_id (FK)
  - name, start_date, end_date, duration_days
  - contractor_id (FK, nullable)
  - dependency_ids (array of milestone IDs)
  - status (not_started, in_progress, complete, blocked)
  - sort_order, notes

ProjectTask
  - id, project_id (FK), milestone_id (FK, nullable)
  - title, description
  - assigned_to_user_id, assigned_to_contractor_id
  - due_date, priority, status, category
  - created_at, completed_at

ProjectPhoto
  - id, project_id (FK)
  - file_url, thumbnail_url
  - room_area (enum)
  - phase (before, during, after)
  - caption, taken_at
  - uploaded_by, uploaded_at

Contractor
  - id, user_id (FK — belongs to the investor's account)
  - name, company, trade, phone, email
  - license_number, insurance_expiry
  - rating, notes, is_active

LenderDraw
  - id, project_id (FK)
  - draw_number, request_date, amount_requested
  - inspection_date, inspector_name
  - amount_approved, disbursement_date
  - status, notes

LenderDrawCategory (which budget categories a draw covers)
  - id, lender_draw_id (FK), budget_category_id (FK)
  - amount_for_category
```
