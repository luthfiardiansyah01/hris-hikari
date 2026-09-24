import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, notFound, badRequest, serverError } from "@/lib/responses"
import { detectTutorConflict, findAvailableTutors } from "@/lib/schedule"
import { STATUS_SESI } from "@/lib/constants"

// Reschedule: find a new free slot for the same tutor (or suggest available tutors).
// Body: { newJamMulai?, newJamSelesai?, newTutorId? }
//  - If newJamMulai/newJamSelesai given and newTutorId empty: try same tutor at new time.
//  - If newTutorId given: reassign to that tutor (checks conflict).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const sesi = await db.sesi.findUnique({ where: { id } })
    if (!sesi) return notFound("Sesi tidak ditemukan")
    if (sesi.status === STATUS_SESI.DIBATALKAN) return badRequest("Sesi dibatalkan")
    if (sesi.status === STATUS_SESI.SELESAI) return badRequest("Sesi sudah selesai")

    const body = await req.json()
    const newJamMulai = body.newJamMulai ? new Date(body.newJamMulai) : null
    const newJamSelesai = body.newJamSelesai ? new Date(body.newJamSelesai) : null
    const newTutorId = (body.newTutorId as string) || null
    const confirm = body.confirm === true

    if (!newJamMulai || !newJamSelesai) {
      // Suggest next available slot(s): scan next 7 days for the same tutor at the same hour range
      const durasiMenit = Math.round(
        (sesi.jamSelesai.getTime() - sesi.jamMulai.getTime()) / 60000,
      )
      const slots: { tanggal: string; jamMulai: string; jamSelesai: string; tutorId: string; tutorNama: string }[] = []
      const tutor = await db.karyawan.findUnique({ where: { id: sesi.tutorId } })
      for (let i = 1; i <= 7 && slots.length < 5; i++) {
        const d = new Date(sesi.tanggal)
        d.setDate(d.getDate() + i)
        const mulai = new Date(d)
        mulai.setHours(sesi.jamMulai.getHours(), sesi.jamMulai.getMinutes(), 0, 0)
        const selesai = new Date(mulai)
        selesai.setMinutes(selesai.getMinutes() + durasiMenit)
        const conflict = await detectTutorConflict(sesi.tutorId, mulai, selesai, id)
        if (!conflict.conflicting) {
          slots.push({
            tanggal: d.toISOString(),
            jamMulai: mulai.toISOString(),
            jamSelesai: selesai.toISOString(),
            tutorId: sesi.tutorId,
            tutorNama: tutor?.nama || "—",
          })
        }
      }
      // Also suggest alternative tutors for the SAME original time
      const altTutors = await findAvailableTutors(sesi.jamMulai, sesi.jamSelesai, id)
      return ok({
        rescheduled: false,
        suggestedSlots: slots,
        alternativeTutors: altTutors,
      })
    }

    if (newJamSelesai <= newJamMulai) return badRequest("Jam selesai harus setelah jam mulai")

    const targetTutorId = newTutorId || sesi.tutorId
    const conflict = await detectTutorConflict(targetTutorId, newJamMulai, newJamSelesai, id)
    if (conflict.conflicting && !confirm) {
      const altTutors = await findAvailableTutors(newJamMulai, newJamSelesai, id)
      return ok({
        rescheduled: false,
        conflict: true,
        message: "Tutor bentrok dengan sesi lain.",
        alternativeTutors: altTutors,
      })
    }

    const tanggal = new Date(newJamMulai)
    tanggal.setHours(0, 0, 0, 0)

    const updated = await db.sesi.update({
      where: { id },
      data: {
        tanggal,
        jamMulai: newJamMulai,
        jamSelesai: newJamSelesai,
        tutorId: targetTutorId,
      },
      include: { tutor: true, program: true, siswa: true },
    })

    await db.notifikasi.create({
      data: {
        karyawanId: targetTutorId,
        tipe: "SESI_RESCHEDULE",
        judul: "Sesi dijadwalkan ulang",
        pesan: `Sesi dijadwalkan ulang ke ${newJamMulai.toLocaleString("id-ID")}.`,
        dataId: id,
      },
    })

    return ok({ rescheduled: true, sesi: updated })
  } catch (e: any) {
    return serverError(e?.message)
  }
}
