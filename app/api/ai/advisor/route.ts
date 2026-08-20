import { NextResponse } from 'next/server'

interface FinancialContext {
  monthlyIncome: number
  safeToSpendDaily: number
  safeToSpendMonthly: number
  totalBills: number
  todayExpense: number
  savingsTargetRate: number
  totalSavingsAccumulated: number
  savingsGoals: { name: string; target: number; current: number }[]
  wallets?: { name: string; type: string; balance: number; isLocked?: boolean }[]
  userQuery?: string
  checkItemName?: string
  checkItemPrice?: number
}

const AVAILABLE_MODELS = [
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-2.0-flash-lite",
]

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FinancialContext
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY tidak ditemukan di environment server.' },
        { status: 500 }
      )
    }

    const {
      monthlyIncome = 0,
      safeToSpendDaily = 0,
      safeToSpendMonthly = 0,
      totalBills = 0,
      todayExpense = 0,
      savingsTargetRate = 20,
      totalSavingsAccumulated = 0,
      savingsGoals = [],
      wallets = [],
      userQuery,
      checkItemName,
      checkItemPrice,
    } = body

    const remainingDailyBudget = safeToSpendDaily - todayExpense

    const spendingWallets = wallets.filter((w) => !w.isLocked)
    const lockedWallets = wallets.filter((w) => w.isLocked)

    const totalSpendingCash = spendingWallets.reduce((s, w) => s + (Number(w.balance) || 0), 0)
    const totalLockedSavings = lockedWallets.reduce((s, w) => s + (Number(w.balance) || 0), 0)

    // Construct Context Prompt
    let prompt = `
Kamu adalah "SaveMe AI Coach" — perencana keuangan pribadi cerdas, ramah, dan solutif.
Gunakan format markdown yang rapi dengan bullet points, headers, dan emoji yang relevan.

DATA FINANSIAL TERPADU PENGGUNA:
- Gaji/Pemasukan Bulanan: Rp ${monthlyIncome.toLocaleString('id-ID')}
- Total Tagihan/Cicilan Rutin: Rp ${totalBills.toLocaleString('id-ID')} / bulan
- Target Menabung: ${savingsTargetRate}% dari pemasukan
- Total Sisa Belanja Bulanan yang Aman: Rp ${safeToSpendMonthly.toLocaleString('id-ID')}
- Batas Aman Belanja Harian (Safe-to-Spend): Rp ${safeToSpendDaily.toLocaleString('id-ID')} / hari
- Pengeluaran Hari Ini: Rp ${todayExpense.toLocaleString('id-ID')}
- Sisa Jatah Belanja Hari Ini: Rp ${remainingDailyBudget.toLocaleString('id-ID')}

STRUKTUR KANTONG KEUANGAN (MULTI-WALLET):
- 🟢 Total Kas Operasional (Kantong Belanja Aktif): Rp ${totalSpendingCash.toLocaleString('id-ID')}
  ${spendingWallets.length > 0
    ? spendingWallets.map((w) => `  • [${w.type}] ${w.name}: Rp ${w.balance.toLocaleString('id-ID')}`).join('\n')
    : '  • Tidak ada kantong operasional aktif'}
- 🔒 Total Tabungan Beku & Dana Terkunci (Tidak Boleh Dibelanjakan Harian): Rp ${totalLockedSavings.toLocaleString('id-ID')}
  ${lockedWallets.length > 0
    ? lockedWallets.map((w) => `  • [🔒 BEKU] ${w.name}: Rp ${w.balance.toLocaleString('id-ID')}`).join('\n')
    : '  • Belum ada kantong tabungan beku'}

CELENGAN IMPIAN:
- Total Terkumpul: Rp ${totalSavingsAccumulated.toLocaleString('id-ID')}
${savingsGoals.length > 0
  ? savingsGoals.map((g) => `• ${g.name}: Rp ${g.current.toLocaleString('id-ID')} / Target Rp ${g.target.toLocaleString('id-ID')}`).join('\n')
  : '• Belum ada celengan impian'}
`

    if (checkItemName && checkItemPrice) {
      // Mode: Spending Item Decision Checker ("Boleh Beli Gak Ya?")
      prompt += `
PERTANYAAN KHUSUS (Cek Keputusan Belanja):
Pengguna ingin membeli: "${checkItemName}" seharga Rp ${checkItemPrice.toLocaleString('id-ID')}.

TUGASMU:
1. Berikan kesimpulan tegas di awal: [BOLEH DIBELI SEKARANG ✅], [PERLU DITUNDA / NABUNG DULU ⏳], atau [OVERBUDGET BAHAYA ❌].
2. Analisis dampaknya terhadap sisa jatah belanja hari ini (Rp ${remainingDailyBudget.toLocaleString('id-ID')}) dan kas operasional (Rp ${totalSpendingCash.toLocaleString('id-ID')}).
3. Jika saldo kantong beku (Rp ${totalLockedSavings.toLocaleString('id-ID')}) ada, INGATKAN jangan sampai membobol tabungan beku demi belanja konsumtif.
4. Sarankan kantong operasional mana yang tepat untuk pembayaran jika diizinkan.
`
    } else if (userQuery) {
      // Mode: Custom User Financial Question
      prompt += `
PERTANYAAN PENGGUNA:
"${userQuery}"

TUGASMU:
Jawab dengan mempertimbangkan pemisahan kantong operasional vs kantong beku dan jatah harian secara taktis dan bersahabat.
`
    } else {
      // Mode: Daily Briefing & Health Assessment
      prompt += `
TUGASMU:
1. **Evaluasi Status Belanja Hari Ini**: Nyatakan apakah aman, waspada, atau overbudget berdasarkan sisa jatah hari ini.
2. **Rekomendasi Alokasi Kantong Belanja**: Berikan saran konkret dari kantong operasional mana belanja harian sebaiknya diambil (misal: gunakan saldo e-wallet/tunai untuk jajan harian, dan pertahankan saldo rekening bank untuk melunasi tagihan). Jika ada kantong beku, berikan apresiasi karena tidak disentuh.
3. **Langkah Taktis Hari Ini**: Berikan 2-3 tips mengoptimalkan sisa jatah harian.
`
    }

    // Attempt calling models with fallback
    let lastError: string | null = null

    for (const modelName of AVAILABLE_MODELS) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: prompt }],
                },
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1000,
              },
            }),
          }
        )

        if (response.ok) {
          const data = await response.json()
          const advice =
            data.candidates?.[0]?.content?.parts?.[0]?.text ||
            'Maaf, AI tidak dapat menghasilkan saran saat ini.'
          return NextResponse.json({ advice })
        } else {
          lastError = await response.text()
          console.warn(`[Gemini API Warning] Model ${modelName} failed:`, lastError)
        }
      } catch (err: unknown) {
        const errObj = err as { message?: string }
        lastError = errObj.message || 'Fetch error'
        console.warn(`[Gemini API Error] Model ${modelName} thrown:`, err)
      }
    }

    return NextResponse.json(
      {
        error: 'Gagal mendapatkan respon dari Gemini AI.',
        details: lastError,
      },
      { status: 502 }
    )
  } catch (error: unknown) {
    console.error('[AI Advisor API Error]:', error)
    const errObj = error as { message?: string }
    return NextResponse.json(
      { error: errObj.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
