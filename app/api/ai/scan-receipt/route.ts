import { NextRequest, NextResponse } from 'next/server'
import { normalizeDateToYYYYMMDD } from '@/lib/utils/date'

interface ScanReceiptRequestBody {
  imageBase64: string
  mimeType?: string
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured on server' },
        { status: 500 }
      )
    }

    const body: ScanReceiptRequestBody = await req.json()
    const { imageBase64, mimeType = 'image/jpeg' } = body

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'Gambar struk (imageBase64) wajib disertakan' },
        { status: 400 }
      )
    }

    // Clean base64 string safely regardless of data URL format
    const cleanBase64 = imageBase64.includes(';base64,')
      ? imageBase64.split(';base64,')[1].trim()
      : imageBase64.trim()

    const prompt = `Anda adalah asisten AI OCR keuangan profesional (Receipt OCR Parser).
Tugas Anda adalah membaca gambar struk / nota pembayaran ini dan mengekstrak informasi finansial ke dalam format JSON murni.

Kategori yang tersedia:
- 'Food' (Makanan & Minuman / Restoran / Cafe / Minimarket camilan)
- 'Transportation' (Bensin / Parkir / Tol / Ojek Online / Tiket)
- 'Shopping' (Belanja Pakaian / Gadget / Kebutuhan Rumah)
- 'Bills' (Listrik / Air / Pulsa / Internet / Tagihan)
- 'Health' (Obat / Apotek / Dokter)
- 'Entertainment' (Bioskop / Hiburan / Game)
- 'Education' (Buku / Kursus)
- 'Other' (Lain-lain)

Kembalikan HANYA format JSON valid tanpa tanda markdown (no backticks):
{
  "merchantName": "Nama Toko / Tempat (contoh: Indomaret, SPBU Pertamina, Starbucks)",
  "totalAmount": 50000,
  "transactionDate": "YYYY-MM-DD (format tahun-bulan-tanggal sesuai struk, atau hari ini jika tidak terbaca)",
  "suggestedCategoryId": "id kategori yang paling cocok (contoh: 'Food', 'Transportation', 'Shopping', dll)",
  "suggestedCategoryName": "Nama Kategori (contoh: 'Food', 'Transportation', dll)",
  "items": [
    { "name": "Nama barang/menu", "price": 25000 }
  ],
  "notes": "Ringkasan singkat struk"
}`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: cleanBase64,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            response_mime_type: 'application/json',
          },
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Gemini OCR Error]:', errorText)
      return NextResponse.json(
        { error: 'Gagal memproses gambar dengan Gemini AI', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'

    // Clean JSON text
    const cleanedJsonStr = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    const parsed = JSON.parse(cleanedJsonStr)

    // Normalize transaction date to strict YYYY-MM-DD
    parsed.transactionDate = normalizeDateToYYYYMMDD(parsed.transactionDate)

    // Ensure numeric amount
    parsed.totalAmount = Number(parsed.totalAmount) || 0
    parsed.merchantName = typeof parsed.merchantName === 'string' ? parsed.merchantName.trim() : 'Struk Belanja'
    parsed.suggestedCategoryId = typeof parsed.suggestedCategoryId === 'string' ? parsed.suggestedCategoryId.trim() : 'Food'
    parsed.suggestedCategoryName = typeof parsed.suggestedCategoryName === 'string' ? parsed.suggestedCategoryName.trim() : 'Makanan'

    return NextResponse.json({
      success: true,
      data: parsed,
    })
  } catch (error: unknown) {
    console.error('[scan-receipt route error]:', error)
    const errObj = error as { message?: string }
    return NextResponse.json(
      { error: errObj.message || 'Terjadi kesalahan saat memindai struk' },
      { status: 500 }
    )
  }
}
