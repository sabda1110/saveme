import type { DriveStep } from 'driver.js'

export type AppTour = {
  tourId: string
  pageName: string
  steps: DriveStep[]
}

export const APP_TOURS: AppTour[] = [
  {
    tourId: 'dashboardTour',
    pageName: 'Dashboard',
    steps: [
      {
        element: '#dashboard-header',
        popover: {
          title: 'Pusat Kendali Dashboard',
          description:
            'Pusat kendali keuangan Anda untuk memantau saldo, jatah belanja harian, dan ringkasan mutasi secara seketika.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#dashboard-quick-actions',
        popover: {
          title: 'Aksi Cepat Transaksi',
          description:
            'Catat transaksi baru secara manual atau gunakan fitur Scan Struk AI untuk pencatatan otomatis dari foto nota.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '#dashboard-daily-limit',
        popover: {
          title: 'Jatah Belanja Hari Ini',
          description:
            'Batas pengeluaran harian yang dihitung otomatis berdasarkan sisa saldo operasional dibagi sisa hari dalam bulan ini.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#dashboard-wallets-overview',
        popover: {
          title: 'Ringkasan Kantong & Rekening',
          description:
            'Pantau alokasi dana di setiap rekening operasional maupun kantong beku yang Anda miliki.',
          side: 'top',
          align: 'start',
        },
      },
    ],
  },
  {
    tourId: 'dailyTour',
    pageName: 'Jatah Harian',
    steps: [
      {
        element: '#daily-header',
        popover: {
          title: 'Jatah Belanja & AI Coach',
          description:
            'Halaman ini membantu Anda menjaga ritme pengeluaran agar tidak mengalami defisit sebelum tanggal gajian berikutnya.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#daily-ai-coach',
        popover: {
          title: 'SaveMe AI Financial Coach',
          description:
            'Konsultasikan kapasitas kas belanja, cicilan belum bayar, dan rekomendasi strategi harian secara cerdas dengan AI.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#daily-smart-threshold',
        popover: {
          title: 'Ambang Batas Cerdas',
          description:
            'Sistem otomatis mengamankan porsi tabungan impian dan cicilan agar sisa jatah belanjamu adalah uang murni yang aman dihabiskan.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#daily-status-card',
        popover: {
          title: 'Status Jatah Belanja Hari Ini',
          description:
            'Meteran pengeluaran harian real-time untuk memastikan ritme belanja aman hingga gajian berikutnya.',
          side: 'top',
          align: 'start',
        },
      },
    ],
  },
  {
    tourId: 'transactionsTour',
    pageName: 'Transaksi',
    steps: [
      {
        element: '#tx-header',
        popover: {
          title: 'Daftar Transaksi',
          description:
            'Semua riwayat mutasi keuangan pribadi Anda tercatat rapi di sini lengkap dengan filter pencarian dan visualisasi.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tx-action-buttons',
        popover: {
          title: 'Pencatatan Transaksi Baru',
          description:
            'Gunakan tombol Catat Transaksi untuk input manual atau Scan Struk AI untuk membaca struk secara instan.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '#tx-view-mode-toggle',
        popover: {
          title: 'Mode Daftar & Kalender',
          description:
            'Beralih antara tampilan daftar kronologis dan tampilan kalender untuk melihat distribusi pengeluaran harian.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tx-filters-bar',
        popover: {
          title: 'Filter & Pencarian',
          description:
            'Saring data transaksi berdasarkan rentang tanggal, kategori transaksi, maupun dompet penampung.',
          side: 'top',
          align: 'start',
        },
      },
    ],
  },
  {
    tourId: 'walletsTour',
    pageName: 'Kantong & Rekening',
    steps: [
      {
        element: '#wallets-header',
        popover: {
          title: 'Manajemen Kantong & Rekening',
          description:
            'Kelola berbagai rekening bank, e-wallet, uang tunai, dan pisahkan antara dana operasional belanja dengan dana beku.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#wallets-add-button',
        popover: {
          title: 'Tambah Dompet Baru',
          description:
            'Tambahkan akun rekening baru sesuai jenis dompet seperti Bank, E-Wallet, Cash, atau Lainnya.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#wallets-list-section',
        popover: {
          title: 'Daftar Rekening & Status',
          description:
            'Lihat rincian saldo dan status apakah kantong berstatus operasional aktif atau dikunci sebagai kantong beku.',
          side: 'top',
          align: 'start',
        },
      },
    ],
  },
  {
    tourId: 'savingsTour',
    pageName: 'Celengan Impian',
    steps: [
      {
        element: '#savings-header',
        popover: {
          title: 'Celengan Impian & Tabungan',
          description:
            'Kumpulkan dana untuk impian masa depan, baik secara mandiri maupun bersama teman dan keluarga.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#savings-tabs-section',
        popover: {
          title: 'Navigasi Tab Celengan',
          description:
            'Beralih antara tab Pribadi, Tab Bersama dengan teman/keluarga, dan Riwayat Pencapaian Impian.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#savings-feasibility-calc',
        popover: {
          title: 'Kalkulator Kelayakan Tabungan',
          description:
            'Fitur pintar yang menganalisis kemampuan finansial Anda sebelum menetapkan komitmen tabungan baru.',
          side: 'top',
          align: 'start',
        },
      },
    ],
  },
  {
    tourId: 'billsTour',
    pageName: 'Cicilan & Tagihan',
    steps: [
      {
        element: '#bills-header',
        popover: {
          title: 'Cicilan & Tagihan Rutin',
          description:
            'Pastikan kewajiban pembayaran bulanan seperti listrik, internet, kos, dan cicilan tercatat dan terbayar tepat waktu.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#bills-add-button',
        popover: {
          title: 'Tambah Tagihan Baru',
          description:
            'Catat tagihan berulang dengan tanggal jatuh tempo bulanan dan rekening pembayaran default.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#bills-status-summary',
        popover: {
          title: 'Ringkasan Pembayaran',
          description:
            'Pantau persentase tagihan yang sudah lunas dan total kewajiban yang masih perlu dibayarkan bulan ini.',
          side: 'top',
          align: 'start',
        },
      },
    ],
  },
  {
    tourId: 'debtsTour',
    pageName: 'Hutang & Piutang',
    steps: [
      {
        element: '#debts-header',
        popover: {
          title: 'Pencatatan Hutang & Piutang',
          description:
            'Catat uang yang Anda pinjamkan kepada orang lain (Piutang) dan uang yang Anda pinjam dari pihak lain (Hutang).',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#debts-add-button',
        popover: {
          title: 'Catat Pinjaman Baru',
          description:
            'Buat catatan baru lengkap dengan nama pihak terkait, nominal, opsi tanggal jatuh tempo atau fleksibel.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#debts-tabs-toggle',
        popover: {
          title: 'Pemisahan Tab Piutang & Hutang',
          description:
            'Navigasi mudah antara daftar uang yang harus Anda tagih dan kewajiban yang harus Anda lunasi.',
          side: 'bottom',
          align: 'start',
        },
      },
    ],
  },
  {
    tourId: 'reportsTour',
    pageName: 'Laporan & Analisis',
    steps: [
      {
        element: '#reports-header',
        popover: {
          title: 'Laporan Keuangan & Analisis',
          description:
            'Dapatkan wawasan komprehensif mengenai pola pengeluaran, perbandingan arus kas, dan grafik distribusi kategori.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#reports-period-selector',
        popover: {
          title: 'Pilihan Periode Laporan',
          description:
            'Pilih rentang waktu bulan ini, bulan lalu, atau kuartal untuk menganalisis performa anggaran.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#reports-export-buttons',
        popover: {
          title: 'Salin & Ekspor Laporan',
          description:
            'Salin teks ringkasan laporan keuangan ke clipboard untuk pembukuan atau dokumentasi pribadi.',
          side: 'bottom',
          align: 'end',
        },
      },
    ],
  },
  {
    tourId: 'templatesTour',
    pageName: 'Template & Kategori',
    steps: [
      {
        element: '#templates-header',
        popover: {
          title: 'Pusat Template & Kategori',
          description:
            'Kelola template transaksi 1-klik untuk pengeluaran rutin dan atur preferensi kategori transaksi Anda.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#templates-tabs-toggle',
        popover: {
          title: 'Navigasi Tab Hub',
          description:
            'Pilih antara tab Template Cepat untuk transaksi instan dan tab Kategori Transaksi untuk kustomisasi kategori.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#templates-action-section',
        popover: {
          title: 'Kelola Kategori & Template',
          description:
            'Buat kategori kustom baru, nonaktifkan kategori bawaan yang tidak Anda perlukan, atau pulihkan kapan saja.',
          side: 'bottom',
          align: 'end',
        },
      },
    ],
  },
  {
    tourId: 'payrollTour',
    pageName: 'Alokasi Gaji & Payroll',
    steps: [
      {
        element: '#payroll-header',
        popover: {
          title: 'Alokasi Gaji & Pendapatan',
          description:
            'Bagi penghasilan bulanan ke pos-pos penting sejak awal gajian menggunakan prinsip Pay Yourself First.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#payroll-mode-selector',
        popover: {
          title: 'Pilihan Mode Pendapatan',
          description:
            'Mendukung mode Karyawan dengan tanggal gajian tetap serta mode Freelance / Variabel bagi pelajar dan pekerja lepas.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#payroll-sliders-section',
        popover: {
          title: 'Slider Pembagian Alokasi',
          description:
            'Sesuaikan persentase alokasi untuk Kas Belanja Operasional, Tabungan Impian, dan Pembayaran Tagihan.',
          side: 'top',
          align: 'start',
        },
      },
    ],
  },
  {
    tourId: 'profileTour',
    pageName: 'Profil & Pengaturan',
    steps: [
      {
        element: '#profile-header',
        popover: {
          title: 'Profil Pengguna & Keamanan',
          description:
            'Pusat pengaturan identitas akun, keamanan aplikasi, preferensi tema, dan panduan penggunaan.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#profile-budget-pref-card',
        popover: {
          title: 'Preferensi Anggaran Global',
          description:
            'Atur apakah saldo bebas harian secara otomatis memotong estimasi cicilan dan tagihan rutin bulanan.',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '#profile-pin-card',
        popover: {
          title: 'Keamanan PIN 6-Digit',
          description:
            'Aktifkan perlindungan PIN untuk mengunci layar aplikasi dan menjaga kerahasiaan data keuangan Anda.',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '#profile-tour-card',
        popover: {
          title: 'Pengaturan Panduan & Tutorial',
          description:
            'Anda dapat memicu ulang panduan halaman tertentu atau mereset seluruh panduan dari sini kapan saja.',
          side: 'top',
          align: 'start',
        },
      },
    ],
  },
]
