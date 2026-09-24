import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { siswaSchema } from "@/lib/validators"
import { ok, notFound, badRequest, serverError } from "@/lib/responses"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = await db.siswa.findUnique({
    where: { id },
    include: { siswaProgram: { include: { program: true } } },
  })
  if (!s) return notFound("Siswa tidak ditemukan")
  return ok(s)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    const parsed = siswaSchema.parse(body)
    const { programIds, ...data } = parsed
    // replace program relations
    await db.siswaProgram.deleteMany({ where: { siswaId: id } })
    const updated = await db.siswa.update({
      where: { id },
      data: {
        nama: data.nama,
        namaWali: data.namaWali || null,
        telepon: data.telepon || null,
        email: data.email || null,
        alamat: data.alamat || null,
        catatan: data.catatan || null,
        siswaProgram: programIds?.length
          ? { create: programIds.map((pid) => ({ programId: pid })) }
          : undefined,
      },
      include: { siswaProgram: { include: { program: true } } },
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
    await db.siswa.delete({ where: { id } })
    return ok({ success: true })
  } catch {
    return notFound("Siswa tidak ditemukan")
  }
}
