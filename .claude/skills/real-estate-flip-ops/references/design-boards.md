# Design Boards — Mood Boards, Product Library & Material Selections

## Table of Contents
1. [What Design Boards Replace](#what-design-boards-replace)
2. [Room-Based Organization](#room-based-organization)
3. [Mood Board Structure](#mood-board-structure)
4. [Product Library](#product-library)
5. [Material Selections Workflow](#material-selections-workflow)
6. [Data Model Requirements](#data-model-requirements)

---

## What Design Boards Replace

John's interior designer currently uses **DesignFiles.co** — a separate platform for managing design selections, mood boards, and product sourcing. The custom dashboard replaces this by building design board functionality directly into the project.

### Core DesignFiles Features to Replicate
1. **Mood Boards**: Visual collages showing the design direction for a room (color palette, style, textures)
2. **Product Library**: Saved products (furniture, fixtures, finishes) with images, prices, and purchase links
3. **Shopping Lists**: Auto-generated list of products needed for a project with links to buy
4. **Client/Team Sharing**: The interior designer uploads boards; John and his team review them

### What We're NOT Replicating
- 3D floor plans (out of scope for MVP)
- Client portal with e-signatures and contracts
- Payment processing for design services
- Product sourcing browser extension

The goal is simpler: give the interior designer a place to upload mood boards and material links directly inside the project, so John doesn't have to jump to a separate app.

---

## Room-Based Organization

Design boards are organized by ROOM, not by construction trade. This is how interior designers think.

### Standard Room Types
| Room | Common in Flips? | Notes |
|------|:-:|-------|
| Kitchen | ✅ Always | Highest impact on ARV — most design attention |
| Master Bathroom | ✅ Always | Second highest impact |
| Master Bedroom | ✅ Usually | Paint, flooring, lighting, closet |
| Living Room | ✅ Usually | Open concept often connects to kitchen |
| Dining Room | Sometimes | May be combined with living |
| Bathroom 2 | ✅ Usually | Hall bath / guest bath |
| Bathroom 3 | Sometimes | If property has 3+ baths |
| Bedroom 2 | Sometimes | Often just paint/flooring |
| Bedroom 3/4 | Sometimes | Same as above |
| Hallway / Stairs | Sometimes | Flooring transitions, lighting |
| Laundry Room | Sometimes | Often a quick update |
| Basement | Sometimes | If finished space |
| Front Exterior | ✅ Usually | Curb appeal — first impression |
| Rear Exterior / Patio | Sometimes | Outdoor living if applicable |
| Garage | Rarely | Usually not designed, just functional |
| Whole House | ✅ Always | For design elements that span all rooms (paint color scheme, flooring type, hardware finish) |

### Room as a Design Container
Each room in a project contains:
1. One or more mood board images
2. A list of selected products (fixtures, finishes, materials)
3. Notes from the designer
4. Status (not_started, in_progress, selections_complete, approved, ordered, installed)

---

## Mood Board Structure

A mood board is a visual image (typically a collage) showing the intended aesthetic for a room.

### What a Mood Board Contains
- Color palette swatches
- Inspiration photos (style references)
- Sample materials (countertop, tile, flooring textures)
- Key furniture/fixture images
- Overall vibe description

### Technical Requirements
- Upload as image files (JPG, PNG, PDF)
- Support multiple boards per room (e.g., "Option A" vs "Option B" for client decision)
- Support image annotations/comments (nice to have for MVP, not required)
- Display as a grid/gallery within the room view

### Mood Board Data
| Field | Type |
|-------|------|
| id | uuid |
| project_id | FK |
| room | enum (see room types) |
| title | text (e.g., "Kitchen - Modern Farmhouse Option A") |
| description | text (designer's notes on the concept) |
| image_url | text (Supabase storage URL) |
| sort_order | integer |
| status | draft, presented, approved, rejected |
| uploaded_by | FK to user |
| created_at | timestamp |

---

## Product Library

The product library serves two purposes:
1. **Per-project selections**: Specific products chosen for a specific room in a specific project
2. **Global library**: Products saved for reuse across multiple projects (the designer's "favorites")

### Product Data
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| name | text | e.g., "Delta Cassidy 2-Handle Widespread Faucet" |
| brand | text | e.g., "Delta" |
| category | enum | See product categories below |
| image_url | text | Product photo |
| purchase_url | text | Link to buy (Home Depot, Amazon, vendor site) |
| price | currency | Current/last known price |
| sku | text | Manufacturer SKU if available |
| vendor | text | Where to buy |
| finish | text | e.g., "Brushed Nickel", "Matte Black" |
| dimensions | text | e.g., "24\" x 36\"" |
| notes | text | Designer notes |
| is_global | boolean | True = in global library, False = project-specific only |
| created_by | FK to user |

### Product Categories
These map to what interior designers select, not construction trades:
- Faucets & Fixtures (kitchen and bath faucets, showerheads)
- Lighting (pendants, chandeliers, sconces, recessed, vanity lights)
- Cabinet Hardware (knobs, pulls, hinges)
- Countertops (granite, quartz, butcher block, laminate)
- Tile (backsplash, floor tile, shower tile)
- Flooring (hardwood, LVP, carpet, tile)
- Paint Colors (walls, trim, accent, exterior)
- Appliances (range, refrigerator, dishwasher, microwave, washer/dryer)
- Plumbing Fixtures (toilets, sinks, tubs, shower systems)
- Mirrors
- Vanities (bathroom vanity units)
- Cabinetry (kitchen and bath cabinets)
- Doors (interior and exterior)
- Window Treatments (blinds, shades, curtains)
- Furniture (if staging is part of the scope)
- Decor & Accessories (towel bars, toilet paper holders, house numbers)

### Product-Project Association
A product from the library gets "placed" in a specific room of a specific project:

```
ProjectProductSelection
  - id
  - project_id (FK)
  - product_id (FK)
  - room (enum)
  - quantity
  - status: selected, ordered, received, installed
  - order_date
  - tracking_number
  - notes
```

---

## Material Selections Workflow

### The Typical Flow
1. **Designer creates mood boards** for each room → uploads to project
2. **Designer selects products** for each room → adds from library or creates new entries with purchase links
3. **John reviews** the selections (approves, requests changes, or rejects)
4. **Products are ordered** → status updates to "ordered" with tracking info
5. **Products arrive** → status updates to "received"
6. **Products installed** → status updates to "installed"

### Selection Status Per Room
The room-level status should aggregate from product statuses:
- **Not Started**: No products selected
- **Selections in Progress**: Some products selected, not all
- **Pending Approval**: All products selected, waiting for owner review
- **Approved**: Owner approved all selections
- **Ordering**: Some/all products ordered
- **Complete**: All products installed

### Shopping List View
Auto-generated list showing all products for a project (across all rooms) with:
- Product name, image thumbnail, price, quantity
- Purchase link (clickable)
- Room assignment
- Order status
- Total estimated cost for all materials

This view helps the designer or John quickly order everything needed.

---

## Data Model Requirements

### Core Entities
```
DesignBoard (mood board image per room)
  - id, project_id (FK)
  - room (enum)
  - title, description
  - image_url (Supabase storage)
  - sort_order
  - status (draft, presented, approved, rejected)
  - uploaded_by (FK to user)
  - created_at, updated_at

Product (global library + project-specific products)
  - id
  - name, brand, category (enum)
  - image_url, purchase_url, price, sku
  - vendor, finish, dimensions
  - notes
  - is_global (boolean)
  - created_by (FK to user)
  - created_at, updated_at

ProjectProductSelection (junction: product placed in a project room)
  - id, project_id (FK), product_id (FK)
  - room (enum)
  - quantity (default 1)
  - status (selected, approved, ordered, received, installed)
  - order_date, tracking_number
  - approved_by (FK to user, nullable)
  - approved_at (timestamp, nullable)
  - notes
  - created_at, updated_at
```

### Storage Requirements
- Mood board images stored in Supabase Storage, organized by project
- Bucket structure: `design-boards/{project_id}/{room}/{filename}`
- Product images: `products/{product_id}/{filename}`
- Support file types: JPG, PNG, WEBP, PDF
- Max file size: 10MB per image (mood boards can be large)

### Access Control
- **Interior Designer role**: Can upload mood boards, add/edit products, update selection status
- **Owner role (John)**: Can view everything, approve selections, cannot upload boards
- **Team Member role**: Can view everything, cannot approve or edit

### Key Business Rules
1. A room can have multiple mood boards (for presenting options)
2. Products can exist in the global library without being assigned to any project
3. When a product is selected for a project, it creates a ProjectProductSelection — it doesn't modify the Product itself
4. The same Product can be used in multiple projects (e.g., John always uses the same faucet brand)
5. Deleting a Product from the global library should NOT delete it from existing project selections (soft reference)
6. The shopping list is a READ view, not a separate entity — it aggregates ProjectProductSelection records
