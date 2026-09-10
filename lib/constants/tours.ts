import type { Tour } from 'nextstepjs'

export const APP_TOURS: Tour[] = [
  {
    tour: 'dashboardTour',
    steps: [
      {
        title: 'Pusat Kendali Dashboard',
        content:
          'Pusat kendali keuangan Anda untuk memantau saldo, jatah belanja harian, dan ringkasan mutasi secara seketika.',
        selector: '#dashboard-header',
        side: 'bottom',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
      {
        title: 'Aksi Cepat Transaksi',
        content:
          'Catat transaksi baru secara manual atau gunakan fitur Scan Struk AI untuk pencatatan otomatis dari foto nota.',
        selector: '#dashboard-quick-actions',
        side: 'bottom-right',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
      {
        title: 'Jatah Belanja Hari Ini',
        content:
          'Batas pengeluaran harian yang dihitung otomatis berdasarkan sisa saldo operasional dibagi sisa hari dalam bulan ini.',
        selector: '#dashboard-daily-limit',
        side: 'bottom',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
      {
        title: 'Ringkasan Kantong & Rekening',
        content:
          'Pantau alokasi dana di setiap rekening operasional maupun kantong beku yang Anda miliki.',
        selector: '#dashboard-wallets-overview',
        side: 'top',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
    ],
  },
  {
    tour: 'dailyTour',
    steps: [
      {
        title: 'Jatah Belanja & AI Coach',
        content:
          'Halaman ini membantu Anda menjaga ritme pengeluaran agar tidak mengalami defisit sebelum tanggal gajian berikutnya.',
        selector: '#daily-header',
        side: 'bottom',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
      {
        title: 'SaveMe AI Financial Coach',
        content:
          'Konsultasikan kapasitas kas belanja, cicilan belum bayar, dan rekomendasi strategi harian secara cerdas dengan AI.',
        selector: '#daily-ai-coach',
        side: 'bottom',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
      {
        title: 'Ambang Batas Cerdas',
        content:
          'Sistem otomatis mengamankan porsi tabungan impian dan cicilan agar sisa jatah belanjamu adalah uang murni yang aman dihabiskan.',
        selector: '#daily-smart-threshold',
        side: 'bottom',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
      {
        title: 'Status Jatah Belanja Hari Ini',
        content:
          'Meteran pengeluaran harian real-time untuk memastikan ritme belanja aman hingga gajian berikutnya.',
        selector: '#daily-status-card',
        side: 'top',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
    ],
  },
  {
    tour: 'transactionsTour',
    steps: [
      {
        title: 'Daftar Transaksi',
        content:
          'Semua riwayat mutasi keuangan pribadi Anda tercatat rapi di sini lengkap dengan filter pencarian dan visualisasi.',
        selector: '#tx-header',
        side: 'bottom',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
      {
        title: 'Pencatatan Transaksi Baru',
        content:
          'Gunakan tombol Catat Transaksi untuk input manual atau Scan Struk AI untuk membaca struk secara instan.',
        selector: '#tx-action-buttons',
        side: 'bottom-right',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
      {
        title: 'Mode Daftar & Kalender',
        content:
          'Beralih antara tampilan daftar kronologis dan tampilan kalender untuk melihat distribusi pengeluaran harian.',
        selector: '#tx-view-mode-toggle',
        side: 'bottom',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
      {
        title: 'Filter & Pencarian',
        content:
          'Saring data transaksi berdasarkan rentang tanggal, kategori transaksi, maupun dompet penampung.',
        selector: '#tx-filters-bar',
        side: 'top',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
    ],
  },
  {
    tour: 'walletsTour',
    steps: [
      {
        title: 'Manajemen Kantong & Rekening',
        content:
          'Kelola berbagai rekening bank, e-wallet, uang tunai, dan pisahkan antara dana operasional belanja dengan dana beku.',
        selector: '#wallets-header',
        side: 'bottom',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
      {
        title: 'Tambah Dompet Baru',
        content:
          'Tambahkan akun rekening baru sesuai jenis dompet seperti Bank, E-Wallet, Cash, atau Lainnya.',
        selector: '#wallets-add-button',
        side: 'bottom',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
      {
        title: 'Daftar Rekening & Status',
        content:
          'Lihat rincian saldo dan status apakah kantong berstatus operasional aktif atau dikunci sebagai kantong beku.',
        selector: '#wallets-list-section',
        side: 'top',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
    ],
  },
  {
    tour: 'savingsTour',
    steps: [
      {
        title: 'Celengan Impian & Tabungan',
        content:
          'Kumpulkan dana untuk impian masa depan, baik secara mandiri maupun bersama teman dan keluarga.',
        selector: '#savings-header',
        side: 'bottom',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
      {
        title: 'Navigasi Tab Celengan',
        content:
          'Beralih antara tab Pribadi, Tab Bersama dengan teman/keluarga, dan Riwayat Pencapaian Impian.',
        selector: '#savings-tabs-section',
        side: 'bottom',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
      {
        title: 'Kalkulator Kelayakan Tabungan',
        content:
          'Fitur pintar yang menganalisis kemampuan finansial Anda sebelum menetapkan komitmen tabungan baru.',
        selector: '#savings-feasibility-calc',
        side: 'top',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
    ],
  },
  {
    tour: 'billsTour',
    steps: [
      {
        title: 'Cicilan & Tagihan Rutin',
        content:
          'Pastikan kewajiban pembayaran bulanan seperti listrik, internet, kos, dan cicilan tercatat dan terbayar tepat waktu.',
        selector: '#bills-header',
        side: 'bottom',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
      {
        title: 'Tambah Tagihan Baru',
        content:
          'Catat tagihan berulang dengan tanggal jatuh tempo bulanan dan rekening pembayaran default.',
        selector: '#bills-add-button',
        side: 'bottom',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
      {
        title: 'Ringkasan Pembayaran',
        content:
          'Pantau persentase tagihan yang sudah lunas dan total kewajiban yang masih perlu dibayarkan bulan ini.',
        selector: '#bills-status-summary',
        side: 'top',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
    ],
  },
  {
    tour: 'debtsTour',
    steps: [
      {
        title: 'Pencatatan Hutang & Piutang',
        content:
          'Catat uang yang Anda pinjamkan kepada orang lain (Piutang) dan uang yang Anda pinjam dari pihak lain (Hutang).',
        selector: '#debts-header',
        side: 'bottom',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
      {
        title: 'Catat Pinjaman Baru',
        content:
          'Buat catatan baru lengkap dengan nama pihak terkait, nominal, opsi tanggal jatuh tempo atau fleksibel.',
        selector: '#debts-add-button',
        side: 'bottom',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
      {
        title: 'Pemisahan Tab Piutang & Hutang',
        content:
          'Navigasi mudah antara daftar uang yang harus Anda tagih dan kewajiban yang harus Anda lunasi.',
        selector: '#debts-tabs-toggle',
        side: 'bottom',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
    ],
  },
  {
    tour: 'reportsTour',
    steps: [
      {
        title: 'Laporan Keuangan & Analisis',
        content:
          'Dapatkan wawasan komprehensif mengenai pola pengeluaran, perbandingan arus kas, dan grafik distribusi kategori.',
        selector: '#reports-header',
        side: 'bottom',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
      {
        title: 'Pilihan Periode Laporan',
        content:
          'Pilih rentang waktu bulan ini, bulan lalu, atau kuartal untuk menganalisis performa anggaran.',
        selector: '#reports-period-selector',
        side: 'bottom',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
      {
        title: 'Salin & Ekspor Laporan',
        content:
          'Salin teks ringkasan laporan keuangan ke clipboard untuk pembukuan atau dokumentasi pribadi.',
        selector: '#reports-export-buttons',
        side: 'bottom-right',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
    ],
  },
  {
    tour: 'templatesTour',
    steps: [
      {
        title: 'Pusat Template & Kategori',
        content:
          'Kelola template transaksi 1-klik untuk pengeluaran rutin dan atur preferensi kategori transaksi Anda.',
        selector: '#templates-header',
        side: 'bottom',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
      {
        title: 'Navigasi Tab Hub',
        content:
          'Pilih antara tab Template Cepat untuk transaksi instan dan tab Kategori Transaksi untuk kustomisasi kategori.',
        selector: '#templates-tabs-toggle',
        side: 'bottom',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
      {
        title: 'Kelola Kategori & Template',
        content:
          'Buat kategori kustom baru, nonaktifkan kategori bawaan yang tidak Anda perlukan, atau pulihkan kapan saja.',
        selector: '#templates-action-section',
        side: 'bottom-right',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
    ],
  },
  {
    tour: 'payrollTour',
    steps: [
      {
        title: 'Alokasi Gaji & Pendapatan',
        content:
          'Bagi penghasilan bulanan ke pos-pos penting sejak awal gajian menggunakan prinsip Pay Yourself First.',
        selector: '#payroll-header',
        side: 'bottom',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
      {
        title: 'Pilihan Mode Pendapatan',
        content:
          'Mendukung mode Karyawan dengan tanggal gajian tetap serta mode Freelance / Variabel bagi pelajar dan pekerja lepas.',
        selector: '#payroll-mode-selector',
        side: 'bottom',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
      {
        title: 'Slider Pembagian Alokasi',
        content:
          'Sesuaikan persentase alokasi untuk Kas Belanja Operasional, Tabungan Impian, dan Pembayaran Tagihan.',
        selector: '#payroll-sliders-section',
        side: 'top',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
    ],
  },
  {
    tour: 'profileTour',
    steps: [
      {
        title: 'Profil Pengguna & Keamanan',
        content:
          'Pusat pengaturan identitas akun, keamanan aplikasi, preferensi tema, dan panduan penggunaan.',
        selector: '#profile-header',
        side: 'bottom',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
      {
        title: 'Preferensi Anggaran Global',
        content:
          'Atur apakah saldo bebas harian secara otomatis memotong estimasi cicilan dan tagihan rutin bulanan.',
        selector: '#profile-budget-pref-card',
        side: 'top',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
      {
        title: 'Keamanan PIN 6-Digit',
        content:
          'Aktifkan perlindungan PIN untuk mengunci layar aplikasi dan menjaga kerahasiaan data keuangan Anda.',
        selector: '#profile-pin-card',
        side: 'top',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
      {
        title: 'Pengaturan Panduan & Tutorial',
        content:
          'Anda dapat memicu ulang panduan halaman tertentu atau mereset seluruh panduan dari sini kapan saja.',
        selector: '#profile-tour-card',
        side: 'top',
        pointerPadding: 8,
        pointerRadius: 16,
        selectorRetryAttempts: 3,
        selectorRetryDelay: 200,
      },
    ],
  },
]
