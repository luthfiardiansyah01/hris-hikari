import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok } from "@/lib/responses"
import { STATUS_SESI, TIPE_KARYAWAN } from "@/lib/constants"
import { formatTanggalKey as formatDateKey } from "@/lib/schedule"

// GET /api/dashboard?tanggal=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tanggalParam = searchParams.get("tanggal")
  const today = tanggalParam ? new Date(tanggalParam) : new Date()
  const dayStart = new Date(today)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(today)
  dayEnd.setHours(23, 59, 59, 999)

  const totalKaryawan = await db.karyawan.count({ where: { status: "AKTIF" } })
  const totalTutor = await db.karyawan.count({ where: { status: "AKTIF", tipe: TIPE_KARYAWAN.FLEXIBLE } })
  const totalStaf = await db.karyawan.count({ where: { status: "AKTIF", tipe: TIPE_KARYAWAN.FIXED } })
  const totalProgram = await db.program.count({ where: { status: "AKTIF" } })
  const totalSiswa = await db.siswa.count()

  const sesiHariIni = await db.sesi.findMany({
    where: { tanggal: { gte: dayStart, lte: dayEnd } },
    include: { tutor: true, program: true, siswa: true },
    orderBy: { jamMulai: "asc" },
  })

  const sesiAktif = sesiHariIni.filter((s) => s.status !== STATUS_SESI.DIBATALKAN)
  const sesiSelesai = sesiHariIni.filter((s) => s.status === STATUS_SESI.SELESAI)
  const sesiMenunggu = sesiHariIni.filter((s) => s.status === STATUS_SESI.MENUNGGU_KONFIRMASI)

  const absensiHariIni = await db.absensi.findMany({
    where: { tanggal: { gte: dayStart, lte: dayEnd } },
    include: { karyawan: true },
  })
  const stafHadir = absensiHariIni.filter((a) => a.status === "HADIR" || a.status === "TERLAMBAT").length

  const totalMenungguKonfirmasi = await db.sesi.count({
    where: { status: STATUS_SESI.MENUNGGU_KONFIRMASI },
  })

  const next7End = new Date(today)
  next7End.setDate(next7End.getDate() + 7)
  const upcoming = await db.sesi.findMany({
    where: {
      jamMulai: { gte: today, lte: next7End },
      status: STATUS_SESI.TERJADWAL,
    },
    include: { tutor: true, program: true, siswa: true },
    orderBy: { jamMulai: "asc" },
    take: 10,
  })

  return ok({
    tanggal: formatDateKey(today),
    stats: {
      totalKaryawan,
      totalTutor,
      totalStaf,
      totalProgram,
      totalSiswa,
      stafHadir,
      sesiHariIni: sesiAktif.length,
      sesiSelesai: sesiSelesai.length,
      sesiMenungguKonfirmasi: sesiMenunggu.length,
      totalMenungguKonfirmasi,
    },
    sesiHariIni,
    absensiHariIni,
    upcoming,
  })
}
