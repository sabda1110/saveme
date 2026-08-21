export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN'

export type TransactionType = 'INCOME' | 'EXPENSE'
export type CategoryType = 'INCOME' | 'EXPENSE' | 'BOTH'
export type WalletType = 'BANK' | 'EWALLET' | 'CASH' | 'OTHER'

export type IncomeType = 'SALARIED' | 'STUDENT_ALLOWANCE' | 'FREELANCE_VARIABLE' | 'NONE'
export type AllowanceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY'
export type PaydayScheduleType = 'START_OF_MONTH' | 'END_OF_MONTH' | 'CUSTOM'

export interface UserProfile {
  uid: string
  email: string
  name: string
  role: UserRole
  photoURL?: string
  hasCompletedOnboarding?: boolean
  monthlyIncome?: number
  initialBalance?: number
  savingsTarget?: number // in percentage, e.g., 20 = 20%
  // Financial Profile & Payday Modes
  incomeType?: IncomeType // 'SALARIED' | 'STUDENT_ALLOWANCE' | 'FREELANCE_VARIABLE' | 'NONE'
  hasFixedSalary?: boolean // false if student/freelance without fixed monthly payroll
  allowanceFrequency?: AllowanceFrequency // for students e.g. DAILY, WEEKLY, MONTHLY
  allowanceAmount?: number // for students
  paydayScheduleType?: PaydayScheduleType // 'START_OF_MONTH' (1st), 'END_OF_MONTH' (28/29/30/31), 'CUSTOM'
  paydayDay?: number // e.g. 25 (tanggal 25 setiap bulan), 1 (tanggal 1), etc. Default: 25
  isEndOfMonthPayday?: boolean // true if payday is always last day of month (28/29/30/31)
  primarySalaryWalletId?: string // Dompet penampung gaji/uang saku utama (e.g. Rekening BCA / GoPay)
  primarySalaryWalletName?: string
  lastAllocatedMonth?: string // e.g. "2026-08" to guard against double allocation in a single month
  monthlyBudget?: number // Quick budget set by user for the month (Rp)
  monthlyBudgetMonth?: string // e.g. "2026-08" — which month this budget applies to
  createdAt?: unknown
  updatedAt?: unknown
}

export interface SalaryAllocationRecord {
  id: string
  userId: string
  monthStr: string // e.g. "2026-08"
  monthName: string // e.g. "Agustus 2026"
  incomeType: IncomeType
  totalSalary: number
  operatingAmount: number
  lockedAmount: number
  goalsAmount: number
  primaryWalletId: string
  primaryWalletName: string
  lockedWalletId?: string
  lockedWalletName?: string
  goalsAllocation?: { goalId: string; goalName: string; amount: number }[]
  notes?: string
  allocatedAt: string // ISO date string
  createdAt?: unknown
}

export interface Category {
  id: string
  name: string
  icon: string
  type: CategoryType
}

export interface Wallet {
  id: string
  userId: string
  name: string // e.g. "BCA", "GoPay", "Dompet Tunai"
  type: WalletType
  balance: number
  accountNumber?: string
  icon: string // emoji e.g. '🏦', '📱', '💵', '💳'
  color?: string
  isDefault?: boolean
  isLocked?: boolean // true if frozen / savings-only (excluded from daily spending budget)
  createdAt?: unknown
  updatedAt?: unknown
}

export interface CreateWalletDto {
  name: string
  type: WalletType
  balance: number
  accountNumber?: string
  icon: string
  color?: string
  isLocked?: boolean
}

export interface UpdateWalletDto {
  name?: string
  type?: WalletType
  balance?: number
  accountNumber?: string
  icon?: string
  color?: string
  isLocked?: boolean
}

export interface TransferWalletDto {
  fromWalletId: string
  toWalletId: string
  amount: number
  notes?: string
  date?: string
}

export interface ReceiptScanResult {
  merchantName: string
  totalAmount: number
  transactionDate: string
  suggestedCategoryId: string
  suggestedCategoryName: string
  items?: { name: string; price: number }[]
  notes?: string
}

export interface Transaction {
  id: string
  userId: string
  categoryId: string
  categoryName: string
  categoryIcon: string
  type: TransactionType
  amount: number
  description?: string
  transactionDate: string // YYYY-MM-DD
  walletId?: string
  walletName?: string
  createdAt?: unknown
  updatedAt?: unknown
}

export type BillType = 'RECURRING' | 'INSTALLMENT'

export interface RecurringBill {
  id: string
  userId: string
  name: string
  amount: number
  categoryId: string
  categoryName: string
  categoryIcon: string
  dueDay: number // 1 to 31
  autoDeduct: boolean
  lastProcessedMonth?: string // Format: "YYYY-MM"
  billType?: BillType // 'RECURRING' (default) vs 'INSTALLMENT'
  walletId?: string
  walletName?: string
  totalTenor?: number // e.g. 12 bulan
  paidTenor?: number // e.g. 4 bulan
  totalPrincipal?: number // e.g. Rp 12.000.000 (total hutang pokok)
  notes?: string
  createdAt?: unknown
  updatedAt?: unknown
}

export interface SavingsGoal {
  id: string
  userId: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate?: string // YYYY-MM-DD
  icon: string // e.g. "💻", "🏖️", "🛡️"
  color?: string
  notes?: string
  createdAt?: unknown
  updatedAt?: unknown
}

export interface DashboardSummary {
  balance: number
  totalIncome: number
  totalExpense: number
  savingsRate: number
  transactions: Transaction[]
  categoryBreakdown: {
    name: string
    icon: string
    amount: number
    percentage: number
  }[]
}

export interface SystemStats {
  totalUsers: number
  totalTransactions: number
  totalVolume: number
  recentUsers: UserProfile[]
}

export interface QuickTemplate {
  id: string
  userId: string
  name: string
  amount: number
  icon: string
  categoryId: string
  categoryName: string
  categoryIcon: string
  walletId?: string
  walletName?: string
  createdAt?: unknown
  updatedAt?: unknown
}

export interface CreateQuickTemplateDto {
  name: string
  amount: number
  icon: string
  categoryId: string
  categoryName: string
  categoryIcon: string
  walletId?: string
  walletName?: string
}

export interface UpdateQuickTemplateDto {
  name?: string
  amount?: number
  icon?: string
  categoryId?: string
  categoryName?: string
  categoryIcon?: string
  walletId?: string
  walletName?: string
}

