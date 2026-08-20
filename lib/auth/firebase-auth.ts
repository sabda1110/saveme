import { auth, db } from '@/lib/firebase/config'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth'
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
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

  return user
}

export async function loginWithEmail(email: string, password: string): Promise<FirebaseUser> {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return credential.user
}

export async function logoutUser(): Promise<void> {
  await signOut(auth)
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
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export interface OnboardingData {
  initialBalance: number
  monthlyIncome: number
  savingsTarget: number
}

export async function completeUserOnboarding(uid: string, data: OnboardingData): Promise<void> {
  const docRef = doc(db, 'users', uid)

  // Update profile fields
  await updateDoc(docRef, {
    hasCompletedOnboarding: true,
    initialBalance: data.initialBalance,
    monthlyIncome: data.monthlyIncome,
    savingsTarget: data.savingsTarget,
    updatedAt: serverTimestamp(),
  })

  // Sync initial balance directly into primary cash wallet & record linked transaction
  if (data.initialBalance > 0) {
    await walletService.syncInitialBalanceWallet(uid, data.initialBalance)
  }
}
