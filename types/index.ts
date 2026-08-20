export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN'

export type TransactionType = 'INCOME' | 'EXPENSE'
export type CategoryType = 'INCOME' | 'EXPENSE' | 'BOTH'
export type WalletType = 'BANK' | 'EWALLET' | 'CASH' | 'OTHER'

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
  createdAt?: unknown
  updatedAt?: unknown
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
