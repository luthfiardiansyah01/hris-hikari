import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { sesiSchema } from "@/lib/validators"
import { ok, created, badRequest, serverError } from "@/lib/responses"
import { detectTutorConflict, findAvailableTutors } from "@/lib/schedule"
import { STATUS_SESI } from "@/lib/constants"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tutorId = searchParams.get("tutorId") || undefined
  const tanggal = searchParams.get("tanggal")
  const dari = searchParams.get("dari")
  const sampai = searchParams.get("sampai")
  const status = searchParams.get("status") || undefined

  const where: any = {}
  if (tutorId) where.tutorId = tutorId
  if (status) where.status = status
  if (tanggal) {
    const d = new Date(tanggal)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    where.tanggal = { gte: d, lt: next }
  } else if (dari && sampai) {
    where.tanggal = { gte: new Date(dari), lte: new Date(sampai) }
  }

  const list = await db.sesi.findMany({
    where,
    include: {
      tutor: true,
      program: true,
      siswa: true,
    },
    orderBy: { jamMulai: "asc" },
  })
  return ok(list)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = sesiSchema.parse(body)

    const jamMulai = new Date(parsed.jamMulai)
    const jamSelesai = new Date(parsed.jamSelesai)
    if (jamSelesai <= jamMulai) {
      return badRequest("Jam selesai harus setelah jam mulai")
    }

    // Conflict detection for the chosen tutor
    const conflict = await detectTutorConflict(parsed.tutorId, jamMulai, jamSelesai)
    if (conflict.conflicting) {
      const avail = await findAvailableTutors(jamMulai, jamSelesai)
      return badRequest(
        `Bentrok jadwal tutor dengan sesi lain pada jam yang sama. Tutor tersedia: ${
          avail.length ? avail.map((a) => a.nama).join(", ") : "tidak ada"
        }`,
      )
    }

    // Copy tarif from program (snapshot)
    const program = await db.program.findUnique({ where: { id: parsed.programId } })
    if (!program) return badRequest("Program tidak ditemukan")

    const tanggal = new Date(parsed.tanggal)
    tanggal.setHours(0, 0, 0, 0)

    const sesi = await db.sesi.create({
      data: {
        tanggal,
        jamMulai,
        jamSelesai,
        tutorId: parsed.tutorId,
        programId: parsed.programId,
        siswaId: parsed.siswaId,
        tarifSnapshot: program.tarifPerJam,
        status: STATUS_SESI.TERJADWAL,
        catatan: parsed.catatan || null,
      },
      include: { tutor: true, program: true, siswa: true },
    })

    // Notify tutor
    await db.notifikasi.create({
      data: {
        karyawanId: parsed.tutorId,
        tipe: "JADWAL_BARU",
        judul: "Jadwal sesi baru",
        pesan: `Sesi ${program.nama} pada ${jamMulai.toLocaleString("id-ID")}`,
        dataId: sesi.id,
      },
    })

    return created(sesi)
  } catch (e: any) {
    if (e?.name === "ZodError") return badRequest(e.errors?.[0]?.message || "Input tidak valid")
    return serverError(e?.message)
  }
}
