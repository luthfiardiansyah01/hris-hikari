// Shared domain constants & type-safe string enums (DB uses String columns)

export const TIPE_KARYAWAN = {
  FIXED: "FIXED",
  FLEXIBLE: "FLEXIBLE",
} as const
export type TipeKaryawan = (typeof TIPE_KARYAWAN)[keyof typeof TIPE_KARYAWAN]

export const STATUS_KARYAWAN = {
  AKTIF: "AKTIF",
  NONAKTIF: "NONAKTIF",
} as const
export type StatusKaryawan = (typeof STATUS_KARYAWAN)[keyof typeof STATUS_KARYAWAN]

export const USER_ROLE = {
  ADMIN: "ADMIN",
  KARYAWAN: "KARYAWAN",
} as const
export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE]

export const STATUS_SESI = {
  TERJADWAL: "TERJADWAL",
  BERJALAN: "BERJALAN",
  SELESAI: "SELESAI",
  MENUNGGU_KONFIRMASI: "MENUNGGU_KONFIRMASI",
  DIBATALKAN: "DIBATALKAN",
} as const
export type StatusSesi = (typeof STATUS_SESI)[keyof typeof STATUS_SESI]

export const STATUS_ABSENSI = {
  HADIR: "HADIR",
  TERLAMBAT: "TERLAMBAT",
  TIDAK_HADIR: "TIDAK_HADIR",
  CUTI: "CUTI",
  LIBUR: "LIBUR",
} as const
export type StatusAbsensi = (typeof STATUS_ABSENSI)[keyof typeof STATUS_ABSENSI]

export const STATUS_CUTI = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const

export const TIPE_POTONGAN = {
  PER_KEJADIAN: "PER_KEJADIAN",
  PER_PERIODE: "PER_PERIODE",
} as const
export type TipePotongan = (typeof TIPE_POTONGAN)[keyof typeof TIPE_POTONGAN]

export const STATUS_PERIODE = {
  DRAFT: "DRAFT",
  TERKUNCI: "TERKUNCI",
} as const
export type StatusPeriode = (typeof STATUS_PERIODE)[keyof typeof STATUS_PERIODE]

export const TIPE_NOTIFIKASI = {
  JADWAL_BARU: "JADWAL_BARU",
  SESI_DIBATALKAN: "SESI_DIBATALKAN",
  SESI_RESCHEDULE: "SESI_RESCHEDULE",
  REMINDER_CEKIN: "REMINDER_CEKIN",
  PERIODE_DIKUNCI: "PERIODE_DIKUNCI",
} as const

export const STATUS_PROGRAM = {
  AKTIF: "AKTIF",
  NONAKTIF: "NONAKTIF",
} as const

// Indonesian month names
export const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

export const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]

export const NAMA_HARI_SINGKAT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

// Indonesian Rupiah formatter
export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0)
}

export function formatTanggal(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function formatTanggalSingkat(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function formatJam(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatTanggalJam(d: Date | string): string {
  return `${formatTanggalSingkat(d)} • ${formatJam(d)}`
}
