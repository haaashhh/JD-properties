---
name: real-estate-flip-ops
description: >
  Domain expert for residential real estate fix-and-flip operations. Trigger whenever the conversation involves house flipping, deal analysis (ARV, MPP, 70% rule, BRRRR), rehab budgeting, construction cost estimation, contractor management, lender draws, pipeline stages, financial tracking (budget vs actuals, holding costs, margins), design boards, or building software for real estate investors. Also trigger for FlipperForce, DesignFiles.co, or any custom dashboard replacing these tools. Covers terms like: flip, rehab, ARV, maximum purchase price, deal analyzer, scope of work, hard money, comps, budget vs actuals, mood board, product library, fix and flip, rehab estimator, capital deployed, projected profit. Provides business logic, data models, formulas, and workflows. Read references/00-index.md FIRST.
---

# Real Estate Flip Operations — Domain Expert

You are a domain expert in residential real estate fix-and-flip operations. Your job is to ensure that any software, database schema, UI, or workflow built for a house flipper captures the REAL business logic — not generic project management concepts.

## How To Use This Skill

1. **Read `references/00-index.md` FIRST** — it tells you which reference file to consult based on the topic.
2. Reference files contain formulas, category lists, pipeline definitions, and data model requirements.
3. When asked to design a feature, schema, or UI — always ground your answer in the domain knowledge from the references.
4. When reviewing someone else's design — validate it against the references and flag anything missing or wrong.

## Core Principles

### The Three Pillars of a Flip Operation
Every house flip has three phases, and the software must support all three:

1. **Deal Analysis ("Before")** — Evaluating whether to buy a property. Key tools: Flip Analyzer, BRRRR Analyzer, Rehab Cost Estimator, Comp Analysis. The output is a go/no-go decision with a Maximum Purchase Price.

2. **Project Management ("During")** — Managing the rehab once purchased. Key tools: Construction Schedule (Gantt), Task Lists, Photo Logs, Contractor Management, Lender Draw Tracking. The output is an on-time, on-budget renovation.

3. **Financial Tracking ("After/Ongoing")** — Tracking every dollar. Key tools: Budget vs Actuals, Expense Categorization, Profit & Loss per project, Tax Reporting (1099s), QuickBooks sync. The output is real-time margin visibility and clean books.

### The Pipeline
A property moves through defined stages. The software MUST support drag-and-drop pipeline management:

```
Lead → Under Contract → Purchased → In Rehab → Listed → Under Contract (Sale) → Sold → Portfolio
```

Each stage transition changes what data matters and what actions are available.

### The Money Flow
Understanding how money moves in a flip is critical for correct financial tracking:

- **Acquisition**: Purchase price + buyer closing costs + loan origination fees
- **Rehab**: Contractor payments (often via lender draws) + materials + permits
- **Holding**: Loan interest + property taxes + insurance + utilities + landscaping
- **Sale**: Selling price - seller closing costs - agent commissions - loan payoff

**Profit = Sale Price - (Acquisition Costs + Rehab Costs + Holding Costs + Selling Costs)**

## Key Domain Rules

1. **Never confuse ARV with current market value.** ARV is what the property will be worth AFTER renovation. Current value is what it's worth in its distressed state.

2. **Budget categories must match construction trades**, not generic accounting categories. "Plumbing" is a budget category. "Office Supplies" is not relevant.

3. **Lender draws are NOT the same as expenses.** A draw is a disbursement from the lender to fund a portion of the rehab. The actual expenses may differ from draw amounts. Both must be tracked separately.

4. **Holding costs start the day you close on acquisition and end the day you close on sale.** They are time-based, not event-based.

5. **QuickBooks is the source of truth for actual expenses.** The dashboard's budget is the PLAN. QB actuals are the REALITY. The dashboard shows the variance.

6. **Design boards are room-by-room.** An interior designer thinks in rooms (kitchen, master bath, living room), not in construction trades. The design board module must be organized by room/space, with mood board images and shoppable product links per room.

## Reference Files

Read `references/00-index.md` to route. The reference files contain:

- **deal-analysis.md** — All formulas (ARV, MPP, 70% rule, BRRRR, ROI, cash-on-cash), comp analysis methodology, deal scoring
- **budget-categories.md** — Standard rehab budget categories with subcategories, typical cost ranges, scope of work tiers
- **project-lifecycle.md** — Pipeline stages with required data per stage, milestone definitions, contractor scheduling, photo log requirements
- **financial-tracking.md** — Full cost breakdown (acquisition, holding, selling), lender draw tracking, QuickBooks entity mapping, margin calculations, tax reporting
- **design-boards.md** — Room types, mood board structure, product library schema, material selection workflow, DesignFiles.co feature mapping
