import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, badRequest, serverError } from "@/lib/responses"
import { isWithinRadius, parseTimeToDate } from "@/lib/schedule"
import { getActingUser } from "@/lib/session"
import { STATUS_ABSENSI, TIPE_KARYAWAN } from "@/lib/constants"

// POST /api/absensi/check-in
// Body: { karyawanId, lat, lng }
export async function POST(req: NextRequest) {
  try {
    const user = await getActingUser(req)
    const body = await req.json()
    const { karyawanId, lat, lng } = body as {
      karyawanId: string
      lat: number
      lng: number
    }
    if (!karyawanId || lat == null || lng == null) {
      return badRequest("karyawanId, lat, lng wajib diisi")
    }

    const karyawan = await db.karyawan.findUnique({ where: { id: karyawanId } })
    if (!karyawan) return badRequest("Karyawan tidak ditemukan")
    if (karyawan.tipe !== TIPE_KARYAWAN.FIXED) {
      return badRequest("Absensi GPS hanya untuk karyawan fixed time")
    }

    const pengaturan = await db.pengaturan.findUnique({ where: { id: "default" } })
    if (!pengaturan) return badRequest("Pengaturan belum dikonfigurasi")

    const within = isWithinRadius(
      lat,
      lng,
      pengaturan.kantorLat,
      pengaturan.kantorLng,
      pengaturan.kantorRadiusMeter,
    )
    if (!within) {
      return badRequest(
        `Lokasi Anda di luar radius kantor (${pengaturan.kantorRadiusMeter} m).`,
      )
    }

    const now = new Date()
    const tanggal = new Date(now)
    tanggal.setHours(0, 0, 0, 0)

    // Check holiday
    const libur = await db.hariLibur.findFirst({ where: { tanggal } })
    if (libur) return badRequest(`Hari libur: ${libur.nama}`)

    // Check approved cuti
    const cuti = await db.cuti.findFirst({
      where: {
        karyawanId,
        status: "APPROVED",
        tanggalMulai: { lte: tanggal },
        tanggalSelesai: { gte: tanggal },
      },
    })
    if (cuti) return badRequest("Anda sedang cuti pada tanggal ini")

    const existing = await db.absensi.findUnique({
      where: { karyawanId_tanggal: { karyawanId, tanggal } },
    })
    if (existing?.jamMasuk) return badRequest("Sudah absen masuk hari ini")

    // Evaluate late
    const deadline = parseTimeToDate(tanggal, pengaturan.jamMasukFixed)
    const onTimeLimit = new Date(deadline)
    onTimeLimit.setSeconds(onTimeLimit.getSeconds() + 59)
    onTimeLimit.setMinutes(onTimeLimit.getMinutes() + pengaturan.toleransiTerlambatMenit)

    const isLate = now > onTimeLimit
    const terlambatMenit = isLate
      ? Math.max(1, Math.ceil((now.getTime() - deadline.getTime()) / 60000) - 1)
      : null

    const record = await db.absensi.upsert({
      where: { karyawanId_tanggal: { karyawanId, tanggal } },
      create: {
        karyawanId,
        tanggal,
        jamMasuk: now,
        gpsMasukLat: lat,
        gpsMasukLng: lng,
        status: isLate ? STATUS_ABSENSI.TERLAMBAT : STATUS_ABSENSI.HADIR,
        terlambatMenit,
      },
      update: {
        jamMasuk: now,
        gpsMasukLat: lat,
        gpsMasukLng: lng,
        status: isLate ? STATUS_ABSENSI.TERLAMBAT : STATUS_ABSENSI.HADIR,
        terlambatMenit,
      },
    })
    return ok({ absensi: record, isLate, terlambatMenit })
  } catch (e: any) {
    return serverError(e?.message)
  }
}
