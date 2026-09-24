import { z } from "zod"

export const karyawanSchema = z.object({
  nama: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Email tidak valid"),
  telepon: z.string().optional().nullable(),
  tipe: z.enum(["FIXED", "FLEXIBLE"]),
  gajiPokok: z.number().int().min(0).default(0),
  status: z.enum(["AKTIF", "NONAKTIF"]).default("AKTIF"),
  alamat: z.string().optional().nullable(),
})

export const programSchema = z.object({
  nama: z.string().min(2, "Nama program minimal 2 karakter"),
  tarifPerJam: z.number().int().min(0, "Tarif harus >= 0"),
  deskripsi: z.string().optional().nullable(),
  warna: z.string().optional().nullable(),
  status: z.enum(["AKTIF", "NONAKTIF"]).default("AKTIF"),
})

export const siswaSchema = z.object({
  nama: z.string().min(2, "Nama siswa minimal 2 karakter"),
  namaWali: z.string().optional().nullable(),
  telepon: z.string().optional().nullable(),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  alamat: z.string().optional().nullable(),
  catatan: z.string().optional().nullable(),
  programIds: z.array(z.string()).optional(),
})

export const sesiSchema = z.object({
  tanggal: z.string(), // ISO date
  jamMulai: z.string(), // ISO datetime
  jamSelesai: z.string(), // ISO datetime
  tutorId: z.string().min(1, "Tutor wajib dipilih"),
  programId: z.string().min(1, "Program wajib dipilih"),
  siswaId: z.string().min(1, "Siswa wajib dipilih"),
  catatan: z.string().optional().nullable(),
})

export const potonganSchema = z.object({
  nominal: z.number().int().min(0),
  alasan: z.string().min(2, "Alasan wajib diisi"),
  tipe: z.enum(["PER_KEJADIAN", "PER_PERIODE"]),
  absensiId: z.string().optional().nullable(),
  sesiId: z.string().optional().nullable(),
  periodeGajiId: z.string().optional().nullable(),
})

export const cutiSchema = z.object({
  karyawanId: z.string().min(1, "Karyawan wajib dipilih"),
  tanggalMulai: z.string(),
  tanggalSelesai: z.string(),
  alasan: z.string().min(2, "Alasan wajib diisi"),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("PENDING"),
})

export const hariLiburSchema = z.object({
  tanggal: z.string(),
  nama: z.string().min(2, "Nama wajib diisi"),
  recurring: z.boolean().default(false),
})

export const pengaturanSchema = z.object({
  kantorLat: z.number(),
  kantorLng: z.number(),
  kantorRadiusMeter: z.number().int().min(10),
  jamMasukFixed: z.string().min(4),
  jamPulangFixed: z.string().min(4),
  toleransiTerlambatMenit: z.number().int().min(0),
  checkInWindowMin: z.number().int().min(0),
  checkInWindowMax: z.number().int().min(1),
  namaPerusahaan: z.string().min(2),
})

export type KaryawanInput = z.infer<typeof karyawanSchema>
export type ProgramInput = z.infer<typeof programSchema>
export type SiswaInput = z.infer<typeof siswaSchema>
export type SesiInput = z.infer<typeof sesiSchema>
export type PotonganInput = z.infer<typeof potonganSchema>
export type CutiInput = z.infer<typeof cutiSchema>
export type HariLiburInput = z.infer<typeof hariLiburSchema>
export type PengaturanInput = z.infer<typeof pengaturanSchema>
