import { db } from "@/lib/db"
import {
  TIPE_KARYAWAN,
  STATUS_SESI,
  STATUS_ABSENSI,
  STATUS_PERIODE,
} from "@/lib/constants"
import { diffInMinutes, hitungHonorSesi } from "@/lib/schedule"

export type RekapResult = {
  karyawanId: string
  nama: string
  tipe: string
  gajiPokok: number
  totalHonor: number
  totalPotongan: number
  totalGaji: number
  jumlahHadir: number
  jumlahTerlambat: number
  jumlahTidakHadir: number
  jumlahSesi: number
  jumlahSesiDibatalkan: number
}

// Build recaps for a given period. Skips sessions still "MENUNGGU_KONFIRMASI"
// unless forceInclude is true (admin should confirm them first).
export async function buildRekapForPeriod(
  periodeGajiId: string,
  bulan: number,
  tahun: number,
): Promise<RekapResult[]> {
  const start = new Date(tahun, bulan - 1, 1)
  const end = new Date(tahun, bulan, 0, 23, 59, 59, 999)

  const karyawanList = await db.karyawan.findMany({
    where: { status: "AKTIF" },
    orderBy: { tipe: "asc" },
  })

  const results: RekapResult[] = []

  for (const k of karyawanList) {
    if (k.tipe === TIPE_KARYAWAN.FIXED) {
      const absensiList = await db.absensi.findMany({
        where: {
          karyawanId: k.id,
          tanggal: { gte: start, lte: end },
        },
      })
      const potonganList = await db.potongan.findMany({
        where: {
          OR: [
            { absensi: { karyawanId: k.id, tanggal: { gte: start, lte: end } } },
            { periodeGajiId, absensiId: null, sesiId: null },
          ],
        },
      })
      const totalPotongan = potonganList.reduce((s, p) => s + p.nominal, 0)
      const hadir = absensiList.filter((a) => a.status === STATUS_ABSENSI.HADIR).length
      const terlambat = absensiList.filter((a) => a.status === STATUS_ABSENSI.TERLAMBAT).length
      const tidakHadir = absensiList.filter((a) => a.status === STATUS_ABSENSI.TIDAK_HADIR).length
      const gajiPokok = k.gajiPokok
      results.push({
        karyawanId: k.id,
        nama: k.nama,
        tipe: TIPE_KARYAWAN.FIXED,
        gajiPokok,
        totalHonor: 0,
        totalPotongan,
        totalGaji: Math.max(0, gajiPokok - totalPotongan),
        jumlahHadir: hadir,
        jumlahTerlambat: terlambat,
        jumlahTidakHadir: tidakHadir,
        jumlahSesi: 0,
        jumlahSesiDibatalkan: 0,
      })
    } else {
      // FLEXIBLE - tutor
      const sesiList = await db.sesi.findMany({
        where: {
          tutorId: k.id,
          tanggal: { gte: start, lte: end },
          status: { not: STATUS_SESI.DIBATALKAN },
        },
      })
      const potonganList = await db.potongan.findMany({
        where: {
          OR: [
            { sesi: { tutorId: k.id, tanggal: { gte: start, lte: end } } },
            { periodeGajiId, absensiId: null, sesiId: null },
          ],
        },
      })
      const totalPotongan = potonganList.reduce((s, p) => s + p.nominal, 0)
      const countDibatalkan = await db.sesi.count({
        where: {
          tutorId: k.id,
          tanggal: { gte: start, lte: end },
          status: STATUS_SESI.DIBATALKAN,
        },
      })

      // Honor only for sessions that are SELESAI or MENUNGGU_KONFIRMASI (confirmed)
      // Honor uses scheduled duration x tarifSnapshot (not actual).
      let totalHonor = 0
      let countedSesi = 0
      for (const s of sesiList) {
        if (s.status === STATUS_SESI.SELESAI) {
          totalHonor += hitungHonorSesi(s.jamMulai, s.jamSelesai, s.tarifSnapshot)
          countedSesi++
        } else if (s.status === STATUS_SESI.MENUNGGU_KONFIRMASI) {
          // Include only if confirmed by admin
          if (s.confirmed) {
            totalHonor += hitungHonorSesi(s.jamMulai, s.jamSelesai, s.tarifSnapshot)
            countedSesi++
          }
        }
      }
      results.push({
        karyawanId: k.id,
        nama: k.nama,
        tipe: TIPE_KARYAWAN.FLEXIBLE,
        gajiPokok: 0,
        totalHonor,
        totalPotongan,
        totalGaji: Math.max(0, totalHonor - totalPotongan),
        jumlahHadir: 0,
        jumlahTerlambat: 0,
        jumlahTidakHadir: 0,
        jumlahSesi: countedSesi,
        jumlahSesiDibatalkan: countDibatalkan,
      })
    }
  }
  return results
}

// Persist recaps for a period (replaces existing)
export async function persistRekap(
  periodeGajiId: string,
  bulan: number,
  tahun: number,
): Promise<void> {
  const results = await buildRekapForPeriod(periodeGajiId, bulan, tahun)

  // Clean previous recaps + rekap items (children first due to FK)
  await db.rekapAbsensi.deleteMany({ where: { rekapGaji: { periodeGajiId } } })
  await db.rekapSesi.deleteMany({ where: { rekapGaji: { periodeGajiId } } })
  await db.rekapGaji.deleteMany({ where: { periodeGajiId } })

  const start = new Date(tahun, bulan - 1, 1)
  const end = new Date(tahun, bulan, 0, 23, 59, 59, 999)

  for (const r of results) {
    const rekap = await db.rekapGaji.create({
      data: {
        periodeGajiId,
        karyawanId: r.karyawanId,
        tipe: r.tipe,
        gajiPokok: r.gajiPokok,
        totalHonor: r.totalHonor,
        totalPotongan: r.totalPotongan,
        totalGaji: r.totalGaji,
        jumlahHadir: r.jumlahHadir,
        jumlahTerlambat: r.jumlahTerlambat,
        jumlahTidakHadir: r.jumlahTidakHadir,
        jumlahSesi: r.jumlahSesi,
        jumlahSesiDibatalkan: r.jumlahSesiDibatalkan,
      },
    })

    // Link detail items
    if (r.tipe === TIPE_KARYAWAN.FIXED) {
      const absensiList = await db.absensi.findMany({
        where: { karyawanId: r.karyawanId, tanggal: { gte: start, lte: end } },
      })
      for (const a of absensiList) {
        await db.rekapAbsensi.create({
          data: { rekapGajiId: rekap.id, absensiId: a.id },
        })
      }
    } else {
      const sesiList = await db.sesi.findMany({
        where: {
          tutorId: r.karyawanId,
          tanggal: { gte: start, lte: end },
          status: { in: [STATUS_SESI.SELESAI, STATUS_SESI.MENUNGGU_KONFIRMASI] },
        },
      })
      for (const s of sesiList) {
        if (s.status === STATUS_SESI.MENUNGGU_KONFIRMASI && !s.confirmed) continue
        await db.rekapSesi.create({
          data: { rekapGajiId: rekap.id, sesiId: s.id },
        })
      }
    }
  }
}

export function isPeriodeLocked(status: string): boolean {
  return status === STATUS_PERIODE.TERKUNCI
}
