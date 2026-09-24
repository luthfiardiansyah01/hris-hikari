import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, notFound, badRequest, serverError } from "@/lib/responses"
import { findAvailableTutors } from "@/lib/schedule"
import { STATUS_SESI } from "@/lib/constants"

// Cancel a session. Returns suggested replacement tutors if available.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const sesi = await db.sesi.findUnique({ where: { id }, include: { program: true, siswa: true } })
    if (!sesi) return notFound("Sesi tidak ditemukan")
    if (sesi.status === STATUS_SESI.DIBATALKAN) return badRequest("Sesi sudah dibatalkan")

    const body = await req.json().catch(() => ({}))
    const assignReplacementTo = body.assignReplacementTo as string | undefined // tutor id

    await db.sesi.update({
      where: { id },
      data: { status: STATUS_SESI.DIBATALKAN },
    })

    // Notify original tutor
    await db.notifikasi.create({
      data: {
        karyawanId: sesi.tutorId,
        tipe: "SESI_DIBATALKAN",
        judul: "Sesi dibatalkan",
        pesan: `Sesi ${sesi.program?.nama} pada ${sesi.jamMulai.toLocaleString("id-ID")} dibatalkan admin.`,
        dataId: sesi.id,
      },
    })

    // If a replacement tutor is requested, create a new session assigned to them
    if (assignReplacementTo && assignReplacementTo !== sesi.tutorId) {
      const newSesi = await db.sesi.create({
        data: {
          tanggal: sesi.tanggal,
          jamMulai: sesi.jamMulai,
          jamSelesai: sesi.jamSelesai,
          tutorId: assignReplacementTo,
          programId: sesi.programId,
          siswaId: sesi.siswaId,
          tarifSnapshot: sesi.tarifSnapshot,
          status: STATUS_SESI.TERJADWAL,
        },
      })
      await db.notifikasi.create({
        data: {
          karyawanId: assignReplacementTo,
          tipe: "JADWAL_BARU",
          judul: "Sesi pengganti ditugaskan",
          pesan: `Anda ditugaskan sebagai pengganti sesi pada ${sesi.jamMulai.toLocaleString("id-ID")}.`,
          dataId: newSesi.id,
        },
      })
      return ok({
        cancelled: true,
        replacement: { assigned: true, sesiId: newSesi.id, tutorId: assignReplacementTo },
      })
    }

    // Suggest available replacement tutors + reschedule slot suggestions
    const availableTutors = await findAvailableTutors(sesi.jamMulai, sesi.jamSelesai)
    return ok({
      cancelled: true,
      replacement: { assigned: false, availableTutors },
    })
  } catch (e: any) {
    return serverError(e?.message)
  }
}
