'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import {
  Camera,
  UploadCloud,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ShoppingBag,
} from 'lucide-react'
import type { ReceiptScanResult } from '@/types'

interface ReceiptScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onApplyResult: (result: ReceiptScanResult) => void
}

export function ReceiptScannerModal({
  isOpen,
  onClose,
  onApplyResult,
}: ReceiptScannerModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState<string>('image/jpeg')
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ReceiptScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setScanResult(null)
    setMimeType(file.type || 'image/jpeg')

    const reader = new FileReader()
    reader.onload = () => {
      setSelectedImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleScanReceipt = async () => {
    if (!selectedImage) {
      setError('Silakan pilih atau foto struk terlebih dahulu')
      return
    }

    setScanning(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImage,
          mimeType,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengekstrak struk belanja')
      }

      setScanResult(data.data)
    } catch (err: unknown) {
      console.error('[ReceiptScanner] Error scanning receipt:', err)
      const errObj = err as { message?: string }
      setError(errObj.message || 'Gagal membaca struk. Pastikan foto struk terlihat jelas dan terang.')
    } finally {
      setScanning(false)
    }
  }

  const handleConfirmApply = () => {
    if (!scanResult) return
    onApplyResult(scanResult)
    onClose()
  }

  const handleReset = () => {
    setSelectedImage(null)
    setScanResult(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] rounded-t-3xl sm:rounded-2xl w-full max-w-lg p-5 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-none duration-200 text-slate-900 dark:text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 mb-4 border-b border-slate-200 dark:border-[#2d3348]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                AI Smart Receipt Scanner
                <Sparkles className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Ekstrak otomatis nota belanja dengan Gemini 3.6 Vision
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#21263a]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Upload / Camera Action Area */}
        {!selectedImage ? (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-[#2d3348] hover:border-purple-500/50 rounded-2xl p-8 text-center transition-colors bg-slate-50 dark:bg-[#21263a]/30">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Foto atau Unggah Struk Belanja
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-5">
              Dukung struk Indomaret, Alfamart, restoran, bensin, atau struk fisik/digital lainnya.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="flex items-center gap-3">
              <Button
                variant="glow"
                size="md"
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<Camera className="w-4 h-4" />}
              >
                Pilih / Ambil Foto
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Image Preview with Scanning Animation */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-[#2d3348] bg-slate-900 max-h-56 flex items-center justify-center group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedImage}
                alt="Receipt Preview"
                className="w-full h-full object-contain max-h-56"
              />

              {/* Scanning Laser Beam Animation */}
              {scanning && (
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/30 to-transparent animate-pulse border-y-2 border-emerald-400 pointer-events-none" />
              )}

              {!scanning && !scanResult && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-slate-300 hover:text-white hover:bg-black transition-all cursor-pointer"
                  title="Ganti Foto"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Extracted Data View */}
            {scanResult ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#21263a] border border-emerald-500/40 shadow-xl flex flex-col gap-3.5 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#2d3348]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      Ekstraksi Struk Berhasil!
                    </span>
                  </div>
                  <Badge variant="brand" size="sm">
                    {scanResult.suggestedCategoryName || 'Kategori Terdeteksi'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348]">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-semibold">
                      Nama Merchant / Toko:
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate block mt-0.5">
                      {scanResult.merchantName || 'Toko / Resto'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348]">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-semibold">
                      Total Belanja:
                    </span>
                    <span className="text-xs sm:text-sm font-bold font-mono text-green-600 dark:text-green-400 block mt-0.5">
                      {formatRupiah(scanResult.totalAmount)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 px-1">
                  <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <Calendar className="w-3.5 h-3.5" /> Tanggal:
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {scanResult.transactionDate}
                  </span>
                </div>

                {/* Items breakdown list if found */}
                {scanResult.items && scanResult.items.length > 0 && (
                  <div className="mt-1 pt-2 border-t border-slate-200 dark:border-[#2d3348]">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5 flex items-center gap-1">
                      <ShoppingBag className="w-3.5 h-3.5" /> Rincian Item:
                    </span>
                    <div className="max-h-24 overflow-y-auto flex flex-col gap-1 pr-1">
                      {scanResult.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300 bg-white dark:bg-[#1a1d27]/70 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#2d3348]/60"
                        >
                          <span className="truncate max-w-[180px]">{it.name}</span>
                          <span className="font-mono font-semibold text-slate-900 dark:text-slate-200">
                            {formatRupiah(it.price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-[#2d3348]">
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    Foto Ulang
                  </Button>
                  <Button
                    variant="glow"
                    size="sm"
                    onClick={handleConfirmApply}
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Gunakan & Catat Transaksi
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="ghost" size="md" onClick={handleReset} disabled={scanning}>
                  Batal
                </Button>
                <Button
                  variant="glow"
                  size="md"
                  loading={scanning}
                  onClick={handleScanReceipt}
                  leftIcon={<Sparkles className="w-4 h-4" />}
                >
                  {scanning ? 'Gemini Sedang Memindai...' : 'Pindai Struk dengan AI'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
