import { auth, db } from '@/lib/firebase/config'
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth'
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore'
import type { UserProfile, UserRole } from '@/types'
import { walletService } from '@/lib/services/wallet.firebase'

// Check if user is initial super admin
function determineInitialRole(email: string): UserRole {
  const adminEmails = ['admin@saveme.id', 'superadmin@saveme.id']
  if (adminEmails.includes(email.toLowerCase())) {
    return 'SUPER_ADMIN'
  }
  return 'USER'
}

export async function signInWithGoogle(): Promise<{ user: FirebaseUser; isNewUser: boolean }> {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })

  const credential = await signInWithPopup(auth, provider)
  const user = credential.user

  if (!user.email) {
    throw new Error('Akun Google tidak memiliki alamat email yang terverifikasi.')
  }

  // 1. Check if user document already exists in Firestore by UID
  const userRef = doc(db, 'users', user.uid)
  const userSnap = await getDoc(userRef)

  if (userSnap.exists()) {
    // Existing account: update last login timestamp only, do not touch wallet/profile/onboarding
    await updateDoc(userRef, {
      updatedAt: serverTimestamp(),
    })
    return { user, isNewUser: false }
  }

  // 2. Check if email already exists in Firestore (e.g. from an existing registration)
  const emailQuery = query(
    collection(db, 'users'),
    where('email', '==', user.email.toLowerCase())
  )
  const emailSnap = await getDocs(emailQuery)

  if (!emailSnap.empty) {
    // Profile already exists with this email! Link/sync to this UID to maintain data consistency
    const existingData = emailSnap.docs[0].data()
    await setDoc(userRef, {
      ...existingData,
      uid: user.uid,
      updatedAt: serverTimestamp(),
    })
    return { user, isNewUser: false }
  }

  // 3. Completely new user: initialize basic profile
  const role: UserRole = determineInitialRole(user.email)
  await setDoc(userRef, {
    uid: user.uid,
    name: user.displayName || 'Pengguna SaveMe',
    email: user.email.toLowerCase(),
    role,
    hasCompletedOnboarding: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  // Auto-seed initial operational cash wallet with Rp 0
  try {
    await walletService.syncInitialBalanceWallet(user.uid, 0)
  } catch (err) {
    console.error('[auth] Error auto-seeding wallet for Google user:', err)
  }

  return { user, isNewUser: true }
}

export async function registerWithEmail(name: string, email: string, password: string): Promise<FirebaseUser> {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  const user = credential.user

  await updateProfile(user, { displayName: name })

  const role: UserRole = determineInitialRole(email)

  // Create initial user document in Firestore
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    name,
    email: user.email,
    role,
    hasCompletedOnboarding: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  // Auto-seed initial operational cash wallet with Rp 0
  try {
    await walletService.syncInitialBalanceWallet(user.uid, 0)
  } catch (err) {
    console.error('[auth] Error auto-seeding wallet for registered user:', err)
  }

  return user
}

export async function loginWithEmail(email: string, password: string): Promise<FirebaseUser> {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return credential.user
}

export async function logoutUser(): Promise<void> {
  await signOut(auth)
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim())
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, 'users', uid)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
      return null
    }

    const data = snapshot.data()
    return {
      uid: data.uid || uid,
      email: data.email || '',
      name: data.name || '',
      role: data.role || 'USER',
      hasCompletedOnboarding: data.hasCompletedOnboarding ?? false,
      monthlyIncome: data.monthlyIncome || 0,
      initialBalance: data.initialBalance || 0,
      savingsTarget: data.savingsTarget || 20,
      incomeType: data.incomeType || 'SALARIED',
      hasFixedSalary: data.hasFixedSalary ?? true,
      allowanceFrequency: data.allowanceFrequency || 'MONTHLY',
      allowanceAmount: data.allowanceAmount || 0,
      paydayScheduleType:
        data.paydayScheduleType ||
        (data.isEndOfMonthPayday ? 'END_OF_MONTH' : data.paydayDay === 1 ? 'START_OF_MONTH' : 'CUSTOM'),
      paydayDay: data.paydayDay || 25,
      isEndOfMonthPayday: data.isEndOfMonthPayday ?? false,
      primarySalaryWalletId: data.primarySalaryWalletId,
      primarySalaryWalletName: data.primarySalaryWalletName,
      lastAllocatedMonth: data.lastAllocatedMonth,
      monthlyBudget: data.monthlyBudget || 0,
      monthlyBudgetMonth: data.monthlyBudgetMonth,
      appPin: data.appPin,
      isPinEnabled: data.isPinEnabled ?? false,
      completedTours: data.completedTours || [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as UserProfile
  } catch (error) {
    console.error('[auth] Error fetching user profile:', error)
    return null
  }
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  const docRef = doc(db, 'users', uid)
  const cleanData: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  }
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleanData[key] = value
    }
  }
  await updateDoc(docRef, cleanData)
}

export interface OnboardingData {
  initialBalance: number
  monthlyIncome: number
  savingsTarget: number
  monthlyBudget?: number
  monthlyBudgetMonth?: string
  incomeType?: 'SALARIED' | 'STUDENT_ALLOWANCE' | 'FREELANCE_VARIABLE' | 'NONE'
  hasFixedSalary?: boolean
  paydayDay?: number
  paydayScheduleType?: 'START_OF_MONTH' | 'END_OF_MONTH' | 'CUSTOM'
}

export async function completeUserOnboarding(uid: string, data: OnboardingData): Promise<void> {
  const docRef = doc(db, 'users', uid)

  const payload: Record<string, unknown> = {
    hasCompletedOnboarding: true,
    initialBalance: data.initialBalance,
    monthlyIncome: data.monthlyIncome,
    savingsTarget: data.savingsTarget,
    incomeType: data.incomeType ?? (data.monthlyIncome > 0 ? 'SALARIED' : 'NONE'),
    hasFixedSalary: data.hasFixedSalary ?? (data.monthlyIncome > 0),
    updatedAt: serverTimestamp(),
  }

  if (data.paydayDay !== undefined) {
    payload.paydayDay = data.paydayDay
  }
  if (data.paydayScheduleType !== undefined) {
    payload.paydayScheduleType = data.paydayScheduleType
    payload.isEndOfMonthPayday = data.paydayScheduleType === 'END_OF_MONTH'
  }

  if (data.monthlyBudget !== undefined) {
    payload.monthlyBudget = data.monthlyBudget
  }
  if (data.monthlyBudgetMonth !== undefined) {
    payload.monthlyBudgetMonth = data.monthlyBudgetMonth
  }

  // Update profile fields
  await updateDoc(docRef, payload)

  // ALWAYS sync initial balance directly into primary cash wallet (even if 0, ensures wallet exists)
  try {
    await walletService.syncInitialBalanceWallet(uid, data.initialBalance)
  } catch (err) {
    console.error('[auth] Error syncing wallet in completeUserOnboarding:', err)
  }
}
