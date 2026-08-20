---
name: design
description: UI/UX design system and guidelines for SaveMe. Use this skill when making any visual or design decisions — colors, typography, spacing, component styling, layout, responsive design, animations, and overall user experience.
---

# SaveMe Design Skill

## Design Philosophy

SaveMe is a **personal finance application**. The design must communicate:

- **Trust** — users share sensitive financial data
- **Clarity** — numbers and data are always legible
- **Modernity** — dark-mode first, clean lines, subtle depth
- **Approachability** — finance doesn't have to be intimidating

---

## Atomic Design: Visual Hierarchy

SaveMe mengikuti **Atomic Design** untuk desain komponen. Setiap level memiliki karakteristik visual yang berbeda.

```
Atoms         →  Token-driven, stateless, no visual personality
Molecules     →  Purposeful combination, still neutral
Organisms     →  Domain personality, full visual context
Templates     →  Layout structure, no real data styling
Pages         →  Final composition — what user actually sees
```

### Design Token Usage per Level

| Level | Tokens Digunakan | Visual Responsibility |
|---|---|---|
| **Atoms** | Color, spacing, radius, shadow | Visual primitives only |
| **Molecules** | Layout tokens, semantic colors | Functional grouping |
| **Organisms** | All tokens + dark/light surfaces | Section visual identity |
| **Templates** | Layout only — grid, flex | Structural skeleton |
| **Pages** | Composed from all levels | Final visual output |

### Atom Design Rules
- Gunakan **variant props** bukan hardcoded color
- Warna hanya dari design tokens: `green-400`, `red-400`, `slate-400`, dll
- Ukuran dari token spacing: `p-2`, `p-3`, `p-4`, `p-6`
- Border radius konsisten: `rounded-md` (6px), `rounded-lg` (8px), `rounded-xl` (12px)

```typescript
// Button atom — semua varian dari design system
const variants = {
  primary:   'bg-green-500 hover:bg-green-600 text-white',
  secondary: 'bg-[#21263a] hover:bg-[#2d3348] text-slate-200 border border-[#2d3348]',
  danger:    'bg-red-500 hover:bg-red-600 text-white',
  ghost:     'text-slate-400 hover:text-slate-200 hover:bg-[#21263a]',
}
```

### Molecule Design Rules
- Spacing antar atom dalam molecule: `gap-1` (4px) atau `gap-2` (8px)
- Error text: `text-xs text-red-400`
- Label text: `text-sm font-medium text-slate-300`
- Helper text: `text-xs text-slate-500`

### Organism Design Rules
- Background card: `bg-[#1a1d27]`
- Border: `border border-[#2d3348]`
- Border radius: `rounded-xl`
- Padding: `p-6`
- Hover effect: `hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200`

### Template Design Rules
- Background: `bg-[#0f1117]` (page base)
- Grid layout pakai Tailwind responsive:
  ```html
  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
  ```
- Sidebar width: `w-60` (240px) — hidden mobile, show desktop

---

## Color System

### Semantic Usage
| Context | Color | Tailwind |
|---|---|---|
| Income, positive, success | `#4ade80` | `green-400` |
| Expense, negative, danger | `#f87171` | `red-400` |
| Neutral / informational | `#94a3b8` | `slate-400` |
| Warning | `#fbbf24` | `amber-400` |
| Brand / CTA | `#22c55e` | `green-500` |

### Background Scale (Dark Mode)
| Token | Value | Usage |
|---|---|---|
| `--color-bg-base` | `#0f1117` | Page background |
| `--color-bg-surface` | `#1a1d27` | Cards, panels |
| `--color-bg-elevated` | `#21263a` | Modals, dropdowns, inputs |
| `--color-bg-border` | `#2d3348` | Borders, dividers |

### Text Scale
| Token | Value | Usage |
|---|---|---|
| `--color-text-primary` | `#f1f5f9` | Headings, labels |
| `--color-text-secondary` | `#94a3b8` | Captions, metadata |
| `--color-text-muted` | `#475569` | Placeholder, disabled |

---

## Typography

**Font:** Inter (Google Fonts — `next/font/google`)

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'] })
```

### Scale
| Usage | Size | Weight | Class |
|---|---|---|---|
| Page title | 2xl–3xl | 700 | `text-2xl font-bold` |
| Section title | xl | 600 | `text-xl font-semibold` |
| Card title | lg | 600 | `text-lg font-semibold` |
| Body | base | 400 | `text-base font-normal` |
| Label | sm | 500 | `text-sm font-medium` |
| Caption/meta | xs | 400 | `text-xs text-slate-400` |
| Financial amount (large) | 3xl–4xl | 700 | `text-4xl font-bold` |
| Financial amount (normal) | lg | 600 | `text-lg font-semibold` |

Financial amounts must always be rendered with `tabular-nums` for column alignment:
```html
<span class="font-mono tabular-nums">Rp 1.250.000</span>
```

---

## Component Specifications

### Cards
```
Background:    var(--color-bg-surface) or bg-[#1a1d27]
Border:        1px solid var(--color-bg-border) or border border-[#2d3348]
Border radius: rounded-xl (12px)
Padding:       p-6 (24px)
Shadow:        shadow-sm (subtle)
Hover:         -translate-y-0.5 shadow-md transition-all duration-200
```

### Buttons

| Variant | Classes |
|---|---|
| Primary | `bg-green-500 hover:bg-green-600 text-white font-medium px-4 py-2 rounded-lg transition-colors` |
| Secondary | `bg-[#21263a] hover:bg-[#2d3348] text-slate-200 font-medium px-4 py-2 rounded-lg transition-colors border border-[#2d3348]` |
| Danger | `bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2 rounded-lg transition-colors` |
| Ghost | `text-slate-400 hover:text-slate-200 hover:bg-[#21263a] font-medium px-4 py-2 rounded-lg transition-colors` |

Loading state: show spinner (animate-spin) + disable button.

### Inputs
```
Background:    bg-[#21263a]
Border:        border border-[#2d3348]
Focus:         focus:border-green-500 focus:ring-1 focus:ring-green-500/20
Text:          text-slate-100
Placeholder:   placeholder:text-slate-500
Padding:       px-4 py-3
Border radius: rounded-lg
```

### Badges (Transaction Type)
```
INCOME:  bg-green-500/20 text-green-400 text-xs font-medium px-2 py-0.5 rounded-full
EXPENSE: bg-red-500/20   text-red-400   text-xs font-medium px-2 py-0.5 rounded-full
```

### Transaction Amount Display
```
INCOME:  text-green-400 font-semibold → "+Rp 5.000.000"
EXPENSE: text-red-400   font-semibold → "-Rp 250.000"
```

---

## Dashboard Layout

### Desktop (1024px+)
```
┌─────────┬──────────────────────────────────────────┐
│         │  Header: Page title + Period Selector     │
│Sidebar  ├──────────────────────────────────────────┤
│(240px)  │  Summary Cards (3 columns)               │
│         │  [Balance] [Income] [Expense]             │
│─────────│─────────────────────────────────────────  │
│Dashboard│  Charts (2 columns)                       │
│Transact │  [Expense by Cat | Income vs Expense]    │
│Profile  │─────────────────────────────────────────  │
│         │  Recent Transactions (full width)         │
└─────────┴──────────────────────────────────────────┘
```

### Mobile (<768px)
- Sidebar hidden → bottom navigation bar
- Summary cards: 1 column stack
- Charts: full width, stacked
- Bottom nav items: Dashboard, Transactions, Profile, Add (+)

---

## Responsive Breakpoints

| Breakpoint | Width | Key Changes |
|---|---|---|
| Mobile | < 768px | Bottom nav, stacked layout, no sidebar |
| Tablet | 768px–1024px | Sidebar icon-only (collapsed) |
| Desktop | > 1024px | Full sidebar with labels |

```html
<!-- Example responsive grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <BalanceCard />
  <IncomeCard />
  <ExpenseCard />
</div>
```

---

## Micro-animations

Apply subtle animations throughout:

```css
/* Card hover */
.card:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }

/* Button press */
.btn:active { transform: scale(0.98); }

/* Smooth transitions */
transition-all duration-200 ease-out

/* Page fade-in */
animate-in fade-in duration-300

/* Skeleton shimmer */
@keyframes shimmer { from { opacity: 0.5 } to { opacity: 1 } }
.skeleton { animation: shimmer 1.5s ease-in-out infinite alternate; }
```

---

## Loading States

**Page-level:** Use skeleton screens (NOT spinners):
```html
<!-- Skeleton card -->
<div class="bg-[#1a1d27] rounded-xl p-6 animate-pulse">
  <div class="h-4 bg-[#2d3348] rounded w-1/3 mb-4"></div>
  <div class="h-8 bg-[#2d3348] rounded w-2/3"></div>
</div>
```

**Button-level:** Spinner inside button:
```html
<button disabled class="...">
  <svg class="animate-spin w-4 h-4 mr-2" />
  Saving...
</button>
```

---

## Empty States

Every empty state requires: icon, message, optional CTA.

```html
<div class="flex flex-col items-center justify-center py-16 text-center">
  <div class="text-5xl mb-4">💰</div>
  <h3 class="text-lg font-semibold text-slate-200 mb-2">No transactions yet</h3>
  <p class="text-slate-400 text-sm mb-6">Add your first transaction to get started</p>
  <button class="btn-primary">Add Transaction</button>
</div>
```

---

## Toast Notifications

- Position: bottom-right
- Auto-dismiss: 3 seconds
- Types: success (green), error (red), info (blue)

```html
<!-- Success toast -->
<div class="fixed bottom-4 right-4 bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg flex items-center gap-2 shadow-lg animate-in slide-in-from-bottom-4">
  <CheckIcon />
  Transaction added successfully
</div>
```

---

## Charts (Recharts)

**Expense by Category:** Donut/Pie chart
- Use brand palette for segments
- Include legend below chart
- Show percentage labels

**Income vs Expense:** Bar chart
- Income bar: `#4ade80` (green)
- Expense bar: `#f87171` (red)
- X-axis: dates/periods
- Tooltip on hover

Chart container must be wrapped in `ResponsiveContainer width="100%" height={300}`.

---

## Accessibility Checklist

- [ ] Every `<input>` has a `<label htmlFor={id}>`
- [ ] Icon-only buttons have `aria-label`
- [ ] Color is not the only visual indicator (use icons + text for income/expense)
- [ ] Focus ring visible (`focus:ring-2 focus:ring-green-500`)
- [ ] Minimum touch target 44×44px on mobile
- [ ] Text contrast meets WCAG AA (4.5:1 for normal text)

---

## MCP Tools Used

| Task | Tool |
|---|---|
| Generate UI mockup | `generate_image` |
| Verify UI visually | `browser_subagent` |
| Edit CSS/components | `replace_file_content` |
| Read design tokens | `view_file app/globals.css` |

---

## References

- `saveme-project/DESIGN.md` — complete design system specification
- `saveme-project/DECISIONS.md` — design decisions (ADR-005, 006, 007)
