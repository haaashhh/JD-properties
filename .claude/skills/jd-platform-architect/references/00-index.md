# Reference Index — Route Here First

| Topic | File | When to read |
|-------|------|-------------|
| Database tables, relationships, RLS, migrations | `database-schema.md` | Any schema design, data modeling, or migration task |
| API endpoints, request/response contracts | `api-routes.md` | Building or reviewing API routes, integration points |
| File tree, component patterns, naming conventions | `codebase-structure.md` | Starting a new module, reviewing project structure, setting up the repo |
| QuickBooks OAuth2, sync, entity mapping | `quickbooks-integration.md` | Anything involving QB connect, expense sync, token management |
| Module-by-module build plan with tasks | `build-sequence.md` | Planning sprints, generating Claude Code instructions, sequencing work |

**If starting the project from scratch**: read `codebase-structure.md` → `database-schema.md` → `build-sequence.md`

**If building a specific module**: read `build-sequence.md` (find the module) → `api-routes.md` (find the routes) → `database-schema.md` (find the tables)
