<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:saveme-project-rules -->

# SaveMe Project Rules

## Source of Truth

All architecture decisions, requirements, and design documentation live in:
```
/Users/user/Documents/Catatan/Project-Kerjaa/saveme-project/
```

**Before implementing any feature, read:**
1. `saveme-project/REQUIREMENTS.md`
2. `saveme-project/ARCHITECTURE.md`
3. Relevant Agent Skill (`frontend`, `backend`, `database`, `design`)

## Agent Skills

**Before working on any task, you MUST use `view_file` to READ the relevant SKILL.md file.**
Do not assume the skill contents — always read the actual file.

| Domain | Skill File to Read | When to Use |
|---|---|---|
| Frontend | `.agents/skills/frontend/SKILL.md` | Pages, components, layouts, forms, UI |
| Backend | `.agents/skills/backend/SKILL.md` | Firebase Auth, services, validation, session |
| Database | `.agents/skills/database/SKILL.md` | Cloud Firestore collections, queries, security rules |
| Design | `.agents/skills/design/SKILL.md` | Colors, typography, animations, states |

**Example:**
```
# When building a new page:
1. view_file .agents/skills/frontend/SKILL.md  ← READ THIS FIRST
2. view_file .agents/skills/design/SKILL.md    ← THEN THIS
3. Plan → Wait approval → Implement
```

## Critical Security Rule

**userId must ALWAYS come from the authenticated Firebase Auth session (`user.uid`) — NEVER from unverified client inputs.**

```typescript
// ✅ CORRECT
const { user } = useAuth()
const data = await getUserTransactions(user.uid)

// ❌ FORBIDDEN
const userId = request.nextUrl.searchParams.get('userId')
```

## MANDATORY: Plan Before Implement

**You MUST create an implementation plan and wait for user approval before writing any code.**

This rule applies to ALL tasks that involve:
- Creating new files or folders
- Modifying existing source code
- Installing new packages
- Database collection or schema updates
- Any change that affects the application structure or behavior

### Planning Workflow

```
User Request
    ↓
1. Research & Inspect
   - Read relevant saveme-project/ docs
   - Read relevant Agent Skill
   - Inspect existing code with grep_search / view_file
    ↓
2. Create Implementation Plan
   - List every file to be created/modified/deleted
   - Describe what changes will be made
   - Identify any open questions or risks
   - Present plan to user
    ↓
3. STOP — Wait for User Approval
   (Do NOT write code until user explicitly approves)
    ↓
4. Implement (after approval)
    ↓
5. Test & Verify
    ↓
6. Update Documentation
```

### Exceptions (no plan needed)
- Read-only tasks: reading files, explaining code, answering questions
- Trivial fixes: typos, comment updates, formatting
- User explicitly says "just do it" or "langsung implement"

### Plan Format

When creating a plan, use this structure:

```
## Plan: [Feature Name]

### What will change
- [NEW] path/to/new/file.ts — description
- [MODIFY] path/to/existing/file.ts — what changes
- [DELETE] path/to/removed/file.ts — why

### Packages to install (if any)
- package-name: reason

### Database changes (if any)
- Collections / Security rules: description

### Open questions
- Any decisions that need user input

### Risk / Notes
- Any important considerations
```

## MCP Tool Mapping

The agent uses built-in tools mapped to these responsibilities:

| Responsibility | Tool(s) |
|---|---|
| Read files / docs | `view_file`, `list_dir` |
| Search codebase | `grep_search`, `find_by_name` |
| Create files | `write_to_file` |
| Edit files | `replace_file_content`, `multi_replace_file_content` |
| Run commands (npm, git) | `run_command` |
| Research libraries | `search_web`, `read_url_content` |
| Read Next.js docs | `view_file node_modules/next/dist/docs/` |
| Visual verification | `browser_subagent` |
| Generate UI mockups | `generate_image` |

### MCP Safety Rules

The following require **explicit user confirmation** — agent must NOT run these automatically:

```
❌ Never auto-run:
  git commit / git push / git push --force
  Deleting production database collections
  Any production deployment
  npm install in production
  Deleting large amounts of data
```

```
✅ Safe to run automatically (during implementation, after plan approval):
  Reading files and searching code
  Creating / editing files
  npm install (development only)
  npm run dev
  git status / git diff (read-only)
```

## Development Workflow

```
Read Documentation → Read Skill → Plan → [USER APPROVAL] → Implement → Test → Update Docs
```

## Slash Command Shortcuts

You can trigger specific playbooks and workflows instantly using these slash command shortcuts:

| Shortcut | Playbook / Target | Deskripsi |
|---|---|---|
| `/feat <fitur>` | `.agents/playbooks/start-feature.md` | **Mulai Fitur Baru** — Riset, baca skill, buat plan, tunggu persetujuan |
| `/bug <masalah>` | `.agents/playbooks/debug-issue.md` | **Investigasi & Debug** — Reproduce, cek layer, temukan root cause, buat fix |
| `/finish` (atau `/finis`) | `.agents/playbooks/finish-feature.md` | **Finalisasi Fitur** — Tes `tsc/build`, cek sekuriti, update docs/roadmap, rekomendasi commit |
| `/review` | `.agents/playbooks/security-review.md` | **Audit Keamanan** — Validasi `userId`, role superadmin, Zod, sanitasi data |
| `/update` | `saveme-project/` | **Sync Dokumentasi** — Update roadmap, ADR decisions, dan database doc |
| `/db` | `.agents/playbooks/database-migration.md` | **Firestore Schema** — Koleksi baru, security rules, composite index |
| `/api` | `.agents/playbooks/add-api-endpoint.md` | **Backend / Service** — Service Firestore atau Next.js Route Handler |
| `/page` | `.agents/playbooks/add-page.md` | **Halaman Baru** — Page App Router, Layout, UI Component |

## Playbooks

Playbooks are step-by-step operational guides for specific workflows.
Always follow the relevant playbook when doing that type of work.

| Playbook | When to Use |
|---|---|
| `.agents/playbooks/start-feature.md` | **Starting any new feature or task** — research, read skills, plan, get approval |
| `.agents/playbooks/finish-feature.md` | **After implementing** — verify, security check, update docs, update roadmap |
| `.agents/playbooks/add-api-endpoint.md` | Creating or modifying services or Route Handlers |
| `.agents/playbooks/add-page.md` | Creating new Next.js pages or layouts |
| `.agents/playbooks/database-migration.md` | Firestore collections, security rules, indexes |
| `.agents/playbooks/security-review.md` | Security review before shipping any feature |
| `.agents/playbooks/debug-issue.md` | Investigating and fixing bugs |

**Every task flow:**
```
start-feature.md
    ↓ (specific work)
add-api-endpoint.md / add-page.md / database-migration.md
    ↓
security-review.md (if touching user data)
    ↓
finish-feature.md
```

## Next.js Version Notice

This project uses **Next.js 16** with App Router. Read `node_modules/next/dist/docs/` for authoritative documentation before implementing Next.js-specific patterns.

<!-- END:saveme-project-rules -->
