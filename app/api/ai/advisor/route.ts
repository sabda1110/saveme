import { NextResponse } from 'next/server'

interface FinancialContext {
  monthlyIncome?: number
  safeToSpendDaily?: number
  safeToSpendMonthly?: number
  totalBills?: number
  todayExpense?: number
  savingsTargetRate?: number
  totalSavingsAccumulated?: number
  savingsGoals?: { name: string; target: number; current: number }[]
  wallets?: { name: string; type: string; balance: number; isLocked?: boolean }[]
  userQuery?: string
  checkItemName?: string
  checkItemPrice?: number
  // Report Analysis Mode
  isReportMode?: boolean
  reportData?: {
    periodLabel: string
    totalIncome: number
    totalExpense: number
    netSavings: number
    savingsRate: number
    healthScore: number
    healthGrade: string
    topCategories: { name: string; icon: string; amount: number; percentage: number }[]
    momComparison?: {
      expenseChangePercent: number
      incomeChangePercent: number
      expenseDiff: number
      incomeDiff: number
    }
    operatingCash: number
    lockedSavings: number
  }
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
      isReportMode,
      reportData,
    } = body

    let prompt = ''

    if (isReportMode && reportData) {
      // Mode: Comprehensive Report & Financial Diagnostic
      prompt = `
Kamu adalah "SaveMe Senior Financial Diagnostic AI" — analis perencana keuangan pribadi profesional, empatik, tajam, dan solutif.
Gunakan format markdown yang rapi dengan bullet points, headers yang jelas, dan emoji yang relevan.

DATA ANALITIK LAPORAN KEUANGAN PENGGUNA (${reportData.periodLabel}):
- 💰 Total Pemasukan Periode Ini: Rp ${reportData.totalIncome.toLocaleString('id-ID')}
- 💸 Total Pengeluaran Periode Ini: Rp ${reportData.totalExpense.toLocaleString('id-ID')}
- 📈 Saldo Bersih (Cashflow): ${reportData.netSavings >= 0 ? '+' : '-'}Rp ${Math.abs(reportData.netSavings).toLocaleString('id-ID')}
- 🎯 Rasio Tabungan Aktual: ${reportData.savingsRate}% (Target Ideal: 20%)
- 🛡️ Skor Kesehatan Finansial (0-100): ${reportData.healthScore}/100 (${reportData.healthGrade})

STRUKTUR KANTONG KAS:
- 🟢 Total Kas Belanja Aktif (Operasional): Rp ${reportData.operatingCash.toLocaleString('id-ID')}
- 🔒 Total Tabungan Beku & Dana Terkunci: Rp ${reportData.lockedSavings.toLocaleString('id-ID')}

TREN DIBANDINGKAN BULAN LALU (MoM):
${
  reportData.momComparison
    ? `- Perubahan Pengeluaran: ${reportData.momComparison.expenseChangePercent >= 0 ? '+' : ''}${reportData.momComparison.expenseChangePercent}% (${reportData.momComparison.expenseDiff >= 0 ? 'Naik' : 'Turun'} Rp ${Math.abs(reportData.momComparison.expenseDiff).toLocaleString('id-ID')})
- Perubahan Pemasukan: ${reportData.momComparison.incomeChangePercent >= 0 ? '+' : ''}${reportData.momComparison.incomeChangePercent}% (${reportData.momComparison.incomeDiff >= 0 ? 'Naik' : 'Turun'} Rp ${Math.abs(reportData.momComparison.incomeDiff).toLocaleString('id-ID')})`
    : '- Data periode sebelumnya belum tersedia untuk perbandingan'
}

KATEGORI PENGELUARAN TERBESAR:
${
  reportData.topCategories.length > 0
    ? reportData.topCategories
        .map(
          (c, i) =>
            `${i + 1}. ${c.icon} ${c.name}: Rp ${c.amount.toLocaleString('id-ID')} (${c.percentage}% dari total pengeluaran)`
        )
        .join('\n')
    : '- Belum ada data pengeluaran'
}

TUGAS UTAMA ANALISIS:
1. **Diagnosis Kesehatan Keuangan & Evaluasi Boros/Sehat**: Berikan penilaian lugas dan objektif mengenai pola keuangan di periode ${reportData.periodLabel}. Apakah ada pos pengeluaran yang boros/bocor halus? Apakah rasio tabungan sudah sehat?
2. **Evaluasi Disiplin Kantong & Tabungan Beku**: Apresiasi jika tabungan beku aman, atau berikan saran jika kas belanja menipis agar tidak mengorbankan dana darurat.
3. **3 Langkah Strategis untuk Bulan Berikutnya**: Berikan 3 poin tindakan konkret dan realistis agar kondisi keuangan semakin surplus dan target impian tercapai.
`
    } else {
      const remainingDailyBudget = safeToSpendDaily - todayExpense
      const spendingWallets = wallets.filter((w) => !w.isLocked)
      const lockedWallets = wallets.filter((w) => w.isLocked)
      const totalSpendingCash = spendingWallets.reduce((s, w) => s + (Number(w.balance) || 0), 0)
      const totalLockedSavings = lockedWallets.reduce((s, w) => s + (Number(w.balance) || 0), 0)

      prompt = `
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
        prompt += `
PERTANYAAN PENGGUNA:
"${userQuery}"

TUGASMU:
Jawab dengan mempertimbangkan pemisahan kantong operasional vs kantong beku dan jatah harian secara taktis dan bersahabat.
`
      } else {
        prompt += `
TUGASMU:
1. **Evaluasi Status Belanja Hari Ini**: Nyatakan apakah aman, waspada, atau overbudget berdasarkan sisa jatah hari ini.
2. **Rekomendasi Alokasi Kantong Belanja**: Berikan saran konkret dari kantong operasional mana belanja harian sebaiknya diambil. Jika ada kantong beku, berikan apresiasi karena tidak disentuh.
3. **Langkah Taktis Hari Ini**: Berikan 2-3 tips mengoptimalkan sisa jatah harian.
`
      }
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
