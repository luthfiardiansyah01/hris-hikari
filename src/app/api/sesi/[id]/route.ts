import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { sesiSchema } from "@/lib/validators"
import { ok, notFound, badRequest, serverError } from "@/lib/responses"
import { detectTutorConflict } from "@/lib/schedule"
import { STATUS_SESI } from "@/lib/constants"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = await db.sesi.findUnique({
    where: { id },
    include: { tutor: true, program: true, siswa: true, potongan: true },
  })
  if (!s) return notFound("Sesi tidak ditemukan")
  return ok(s)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const existing = await db.sesi.findUnique({ where: { id } })
    if (!existing) return notFound("Sesi tidak ditemukan")
    if (existing.status === STATUS_SESI.DIBATALKAN) {
      return badRequest("Sesi yang dibatalkan tidak dapat diubah")
    }

    const body = await req.json()
    const parsed = sesiSchema.parse(body)
    const jamMulai = new Date(parsed.jamMulai)
    const jamSelesai = new Date(parsed.jamSelesai)
    if (jamSelesai <= jamMulai) return badRequest("Jam selesai harus setelah jam mulai")

    const conflict = await detectTutorConflict(parsed.tutorId, jamMulai, jamSelesai, id)
    if (conflict.conflicting) {
      return badRequest("Bentrok jadwal tutor dengan sesi lain pada jam yang sama.")
    }

    // If program changes, re-snapshot tarif; if only time changes, keep old tarif
    let tarifSnapshot = existing.tarifSnapshot
    if (parsed.programId !== existing.programId) {
      const program = await db.program.findUnique({ where: { id: parsed.programId } })
      if (!program) return badRequest("Program tidak ditemukan")
      tarifSnapshot = program.tarifPerJam
    }

    const tanggal = new Date(parsed.tanggal)
    tanggal.setHours(0, 0, 0, 0)

    const updated = await db.sesi.update({
      where: { id },
      data: {
        tanggal,
        jamMulai,
        jamSelesai,
        tutorId: parsed.tutorId,
        programId: parsed.programId,
        siswaId: parsed.siswaId,
        tarifSnapshot,
        catatan: parsed.catatan || null,
      },
      include: { tutor: true, program: true, siswa: true },
    })
    return ok(updated)
  } catch (e: any) {
    if (e?.name === "ZodError") return badRequest(e.errors?.[0]?.message || "Input tidak valid")
    return serverError(e?.message)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await db.sesi.delete({ where: { id } })
    return ok({ success: true })
  } catch {
    return notFound("Sesi tidak ditemukan")
  }
}
