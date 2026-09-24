import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, badRequest, serverError } from "@/lib/responses"
import { isWithinRadius, parseTimeToDate, evaluatePulangCepat } from "@/lib/schedule"
import { TIPE_KARYAWAN } from "@/lib/constants"

// POST /api/absensi/check-out
// Body: { karyawanId, lat, lng }
export async function POST(req: NextRequest) {
  try {
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
    if (!within) return badRequest("Lokasi Anda di luar radius kantor.")

    const now = new Date()
    const tanggal = new Date(now)
    tanggal.setHours(0, 0, 0, 0)

    const existing = await db.absensi.findUnique({
      where: { karyawanId_tanggal: { karyawanId, tanggal } },
    })
    if (!existing?.jamMasuk) return badRequest("Belum absen masuk hari ini")
    if (existing.jamPulang) return badRequest("Sudah absen pulang hari ini")

    const pulangCepat = evaluatePulangCepat(now, tanggal, pengaturan.jamPulangFixed)

    const record = await db.absensi.update({
      where: { id: existing.id },
      data: {
        jamPulang: now,
        gpsPulangLat: lat,
        gpsPulangLng: lng,
        pulangCepatMenit: pulangCepat,
      },
    })
    return ok({ absensi: record, pulangCepat })
  } catch (e: any) {
    return serverError(e?.message)
  }
}
