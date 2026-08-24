/**
 * Normalizes any date string (DD/MM/YYYY, YYYY/MM/DD, DD-MM-YYYY, ISO strings, etc.)
 * into a strict, standard 'YYYY-MM-DD' string compatible with HTML <input type="date">.
 */
export function normalizeDateToYYYYMMDD(dateStr?: string | null): string {
  const today = new Date().toISOString().split('T')[0]
  if (!dateStr || typeof dateStr !== 'string') {
    return today
  }

  const clean = dateStr.trim()

  // 1. Strict YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean
  }

  // 2. YYYY/MM/DD or YYYY.MM.DD or YYYY-M-D
  const ymdMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // 3. DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/)
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // 4. Try Standard JavaScript Date parsing
  try {
    const parsed = new Date(clean)
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear()
      const month = (parsed.getMonth() + 1).toString().padStart(2, '0')
      const day = parsed.getDate().toString().padStart(2, '0')
      if (year >= 2000 && year <= 2100) {
        return `${year}-${month}-${day}`
      }
    }
  } catch {
    // Fallback to today
  }

  return today
}
