---
name: frontend
description: Frontend development guidelines for SaveMe using Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS v4. Use this skill when building pages, components, layouts, forms, or any UI-related code.
---

# SaveMe Frontend Skill

## Framework: Next.js 16 App Router

SaveMe uses **Next.js 16** with the **App Router**. This is NOT the same as Next.js 13-15.
Always read `node_modules/next/dist/docs/` for reference BEFORE writing any Next.js-specific code.

### Key Rules
- Default to **Server Components** — no `'use client'` unless required
- Use `'use client'` only when component needs: state, event handlers, browser APIs, or custom hooks
- Pages and layouts are Server Components by default in App Router
- Route groups: `(auth)` for public pages, `(app)` for protected pages

### Route Structure
```
app/
├── (auth)/                   ← Public routes (no sidebar)
│   ├── login/page.tsx
│   └── register/page.tsx
├── (app)/                    ← Protected routes (with sidebar layout)
│   ├── layout.tsx            ← Auth guard + sidebar
│   ├── dashboard/page.tsx
│   ├── transactions/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   └── profile/page.tsx
└── api/                      ← Route Handlers (backend)
```

---

## Component Architecture: Atomic Design

SaveMe menggunakan **Atomic Design** methodology (Brad Frost). Setiap komponen harus diletakkan di level yang tepat sesuai hierarkinya.

```
Atoms         →  Elemen terkecil, tidak dapat dipecah lagi
    ↓
Molecules     →  Kombinasi atoms yang punya satu fungsi
    ↓
Organisms     →  Kombinasi molecules, membentuk section UI yang utuh
    ↓
Templates     →  Layout halaman tanpa real data
    ↓
Pages         →  Next.js page.tsx — templates + real data dari server
```

---

### Folder Structure

```
components/
├── atoms/                    ← Paling reusable, tidak domain-specific
│   ├── Button/
│   │   ├── Button.tsx
│   │   └── index.ts
│   ├── Input/
│   ├── Label/
│   ├── Badge/
│   ├── Icon/
│   ├── Spinner/
│   ├── Skeleton/
│   └── Avatar/
│
├── molecules/                ← Kombinasi atoms, punya satu tujuan
│   ├── FormField/            (Label + Input + error text)
│   ├── AmountDisplay/        (formatted currency + income/expense color)
│   ├── CategoryTag/          (icon + category name)
│   ├── StatCard/             (label + value + optional trend)
│   ├── SearchInput/          (Input + search Icon)
│   └── TransactionBadge/     (Badge INCOME/EXPENSE)
│
├── organisms/                ← Domain-aware, bisa state lokal
│   ├── Sidebar/              (navigation)
│   ├── TransactionCard/      (satu baris transaksi lengkap)
│   ├── TransactionList/      (list TransactionCard + pagination)
│   ├── TransactionForm/      (form add/edit transaksi)
│   ├── TransactionFilter/    (filter bar)
│   ├── DashboardSummary/     (3 StatCards: balance, income, expense)
│   ├── ExpenseByCategoryChart/
│   ├── IncomeVsExpenseChart/
│   └── RecentTransactions/   (list 5 transaksi terbaru)
│
└── templates/                ← Layout tanpa data nyata
    ├── AuthTemplate/         (centered card layout)
    └── AppTemplate/          (sidebar + main content layout)
```

---

### Rules Per Level

#### Atoms
- **Tidak tahu domain** — tidak boleh ada kata "Transaction", "Dashboard", dll
- **Fully reusable** — bisa dipakai di halaman apapun
- **Stateless jika memungkinkan** — terima props, emit events
- **Contoh:** `Button`, `Input`, `Label`, `Badge`, `Spinner`, `Skeleton`, `Avatar`

```typescript
// ✅ Atom — domain-agnostic
interface BadgeProps {
  variant: 'success' | 'danger' | 'neutral'
  children: React.ReactNode
}
export function Badge({ variant, children }: BadgeProps) { ... }

// ❌ Bukan atom — terlalu domain-specific
export function IncomeBadge() { ... }
```

#### Molecules
- **Menggabungkan atoms** untuk satu tujuan spesifik
- **Boleh sedikit domain-aware** tapi masih relatif reusable
- **Contoh:** `FormField` (Label+Input+error), `AmountDisplay`, `CategoryTag`

```typescript
// FormField = Label (atom) + Input (atom) + error text
interface FormFieldProps {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}
export function FormField({ id, label, error, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}
```

#### Organisms
- **Domain-aware dan kompleks** — boleh tahu tentang Transaction, Category, dll
- **Boleh punya state lokal** (form state, open/close, dll)
- **Menerima data sebagai props** — tidak langsung fetch ke API
- **Contoh:** `TransactionForm`, `TransactionCard`, `Sidebar`

```typescript
// ✅ Organism — menerima data dari parent (page/template)
interface TransactionListProps {
  transactions: Transaction[]
  onDelete: (id: string) => void
  pagination: PaginationMeta
  onPageChange: (page: number) => void
}
export function TransactionList({ transactions, onDelete, pagination, onPageChange }: TransactionListProps) { ... }
```

#### Templates
- **Layout tanpa data nyata** — hanya menerima children/slots
- **Tidak punya state** — Server Component
- **Contoh:** `AuthTemplate`, `AppTemplate`

```typescript
// AuthTemplate — layout centered untuk login/register
export function AuthTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
```

#### Pages (Next.js page.tsx)
- **Selalu Server Component** (kecuali ada alasan kuat)
- **Fetch data di sini** — pakai service layer langsung
- **Compose template + organisms** dengan real data
- **Letakkan di `app/` bukan di `components/`**

```typescript
// app/(app)/dashboard/page.tsx
export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const summary = await dashboardService.getSummary(session.userId)

  // Template membentuk layout, organisms mengisi konten
  return (
    <main>
      <DashboardSummary data={summary} />         {/* organism */}
      <RecentTransactions transactions={summary.recent} /> {/* organism */}
    </main>
  )
}
```

---

### Server vs Client Component per Level

| Level | Default | 'use client' jika... |
|---|---|---|
| Atoms | Client Component | Selalu — atoms sering interaktif (Button, Input) |
| Molecules | Server Component | Ada state lokal atau event handler |
| Organisms | Server Component | Ada form state, toggle, atau fetch client-side |
| Templates | Server Component | Hampir tidak pernah |
| Pages | Server Component | Tidak pernah — gunakan organism/molecule sebagai client boundary |

**Strategi:** Dorong `'use client'` serendah mungkin dalam hierarki.

```typescript
// ✅ BENAR — hanya organism yg butuh interaktivitas jadi client
// page.tsx = Server Component
export default async function TransactionPage() {
  const data = await transactionService.findMany({ userId })
  return <TransactionList transactions={data} /> // organism
}

// TransactionList.tsx = Client Component (karena ada delete confirmation)
'use client'
export function TransactionList({ transactions }: Props) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  // ...
}
```

---

### Naming Conventions

| Level | File | Export |
|---|---|---|
| Atoms | `Button/Button.tsx` + `Button/index.ts` | Named export |
| Molecules | `FormField/FormField.tsx` + `FormField/index.ts` | Named export |
| Organisms | `TransactionForm/TransactionForm.tsx` + `index.ts` | Named export |
| Templates | `AuthTemplate/AuthTemplate.tsx` + `index.ts` | Named export |
| Pages | `app/(app)/dashboard/page.tsx` | Default export |

```typescript
// components/atoms/Button/index.ts
export { Button } from './Button'
export type { ButtonProps } from './Button'

// Usage — import dari level, bukan dari file langsung
import { Button } from '@/components/atoms/Button'
import { FormField } from '@/components/molecules/FormField'
import { TransactionForm } from '@/components/organisms/TransactionForm'
```

---

### Component Inventory (SaveMe)

#### Atoms
| Component | Props | Notes |
|---|---|---|
| `Button` | `variant`, `size`, `loading`, `disabled` | Primary/secondary/danger/ghost |
| `Input` | `id`, `type`, `placeholder`, `error`, `disabled` | |
| `Label` | `htmlFor`, `required` | |
| `Badge` | `variant` (success/danger/neutral) | |
| `Spinner` | `size` | For button loading state |
| `Skeleton` | `className` | Flexible shimmer placeholder |
| `Avatar` | `name`, `size` | Initials avatar |

#### Molecules
| Component | Composition | Notes |
|---|---|---|
| `FormField` | Label + Input + error | Wrapper untuk form fields |
| `AmountDisplay` | — | Currency formatted, green/red |
| `CategoryTag` | Icon + Label | Category name + emoji |
| `StatCard` | — | Balance/income/expense card |
| `TransactionBadge` | Badge | INCOME/EXPENSE badge |
| `SearchInput` | Input + Icon | Search with icon |

#### Organisms
| Component | Notes |
|---|---|
| `Sidebar` | Navigation, active state, logout |
| `TransactionCard` | Full transaction row dengan actions |
| `TransactionList` | List + pagination |
| `TransactionForm` | Add/edit form (CategorySelect, DatePicker, AmountInput) |
| `TransactionFilter` | Date range, type, category filter bar |
| `DashboardSummary` | 3 StatCards |
| `PeriodSelector` | Today/Week/Month/Year/Custom tabs |
| `ExpenseByCategoryChart` | Donut chart dengan legend |
| `IncomeVsExpenseChart` | Bar chart |
| `RecentTransactions` | Latest 5 transactions |

### Server vs Client Components
```typescript
// Server Component (DEFAULT — no directive needed)
export default async function TransactionList() {
  const data = await fetch('/api/transactions')  // or direct service call
  return <ul>{data.map(t => <TransactionCard key={t.id} transaction={t} />)}</ul>
}

// Client Component (only when needed)
'use client'
export function PeriodSelector({ onChange }: { onChange: (p: Period) => void }) {
  const [selected, setSelected] = useState<Period>('month')
  // ...
}
```

---

## Data Fetching

### In Server Components
```typescript
// Preferred: direct service call in RSC
export default async function DashboardPage() {
  const session = await getSession()
  const summary = await dashboardService.getSummary(session.userId, dateFrom, dateTo)
  return <SummaryCards data={summary} />
}
```

### In Client Components
```typescript
// Use fetch() with appropriate error handling
'use client'
export function TransactionListClient() {
  const [data, setData] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/transactions')
      .then(r => r.json())
      .then(res => { if (res.success) setData(res.data) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <TransactionSkeleton />
  if (!data.length) return <EmptyState />
  return <TransactionList data={data} />
}
```

---

## Form Handling

- Use controlled inputs with `useState`
- Validate on submit (and optionally on blur)
- Show field-level errors below inputs
- Disable submit button during loading
- Clear form on success

```typescript
'use client'
export function TransactionForm() {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    // ...call API, handle errors, reset form
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input id="amount" error={errors.amount} />
      <Button loading={loading}>Save</Button>
    </form>
  )
}
```

---

## Loading, Empty, and Error States

Every data-driven component MUST handle:

```typescript
if (loading) return <Skeleton />
if (error) return <ErrorState message={error} onRetry={refetch} />
if (!data.length) return <EmptyState message="No transactions yet" action={<Button>Add one</Button>} />
return <DataView data={data} />
```

Use `<Suspense fallback={<Skeleton />}>` for server-side loading boundaries.

---

## Styling: Tailwind CSS v4

SaveMe uses **Tailwind CSS v4** (not v3). The API may differ.

Design tokens are defined in `app/globals.css` and referenced via CSS variables.

```css
/* Always prefer design tokens */
.card { background: var(--color-bg-surface); }

/* Use Tailwind utilities for layout/spacing */
<div className="flex gap-4 p-6">
```

Color usage conventions:
- `text-green-400` / `bg-green-500/20` → income
- `text-red-400` / `bg-red-500/20` → expense
- `text-slate-400` → secondary text

---

## TypeScript Rules

- Always type component props with an interface or type alias
- Never use `any` — use `unknown` + type guard if needed
- Define shared types in `types/index.ts`

```typescript
interface TransactionCardProps {
  transaction: Transaction
  onDelete?: (id: string) => void
}

export function TransactionCard({ transaction, onDelete }: TransactionCardProps) {
  // ...
}
```

---

## Accessibility

- Every form input must have an associated `<label>` with `htmlFor`
- Icon-only buttons must have `aria-label`
- Interactive elements must be keyboard-accessible
- Use semantic HTML (`<nav>`, `<main>`, `<header>`, `<section>`, `<article>`)
- Maintain visible focus indicators

---

## Performance

- Server Components by default — reduces client JS bundle
- Use `next/image` for any images
- Use `next/font` for Inter font loading
- Avoid unnecessary `useEffect` — prefer server-side data fetching
- Memoize expensive computations with `useMemo` only when profiled

---

## MCP Tools Used

| Task | Tool |
|---|---|
| Read existing components | `view_file` |
| Search component patterns | `grep_search` |
| Create new component | `write_to_file` |
| Edit component | `replace_file_content` |
| Read Next.js docs | `view_file node_modules/next/dist/docs/` |
| Verify UI visually | `browser_subagent` |

---

## References

- `saveme-project/ARCHITECTURE.md` — folder structure and component strategy
- `saveme-project/DESIGN.md` — design system tokens and component specs
- `saveme-project/REQUIREMENTS.md` — feature requirements
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md`
