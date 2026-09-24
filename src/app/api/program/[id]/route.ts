import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { programSchema } from "@/lib/validators"
import { ok, notFound, badRequest, serverError } from "@/lib/responses"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = await db.program.findUnique({
    where: { id },
    include: { siswaProgram: { include: { siswa: true } } },
  })
  if (!p) return notFound("Program tidak ditemukan")
  return ok(p)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    const parsed = programSchema.parse(body)
    const updated = await db.program.update({
      where: { id },
      data: {
        nama: parsed.nama,
        tarifPerJam: parsed.tarifPerJam,
        deskripsi: parsed.deskripsi || null,
        warna: parsed.warna || null,
        status: parsed.status,
      },
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
    await db.program.delete({ where: { id } })
    return ok({ success: true })
  } catch {
    return notFound("Program tidak ditemukan")
  }
}
