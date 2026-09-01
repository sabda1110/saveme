/**
 * Utility for Secure 6-Digit PIN Hashing and Verification
 * Uses native Web Crypto API (SHA-256)
 */

export async function hashPin(pin: string, salt = 'saveme-secure-pin-salt'): Promise<string> {
  const text = `${salt}:${pin.trim()}`
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPin(
  enteredPin: string,
  storedHash: string,
  salt = 'saveme-secure-pin-salt'
): Promise<boolean> {
  if (!enteredPin || !storedHash) return false
  const enteredHash = await hashPin(enteredPin, salt)
  return enteredHash === storedHash
}
