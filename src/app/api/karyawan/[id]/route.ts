import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { karyawanSchema } from "@/lib/validators"
import { ok, notFound, badRequest, serverError } from "@/lib/responses"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const k = await db.karyawan.findUnique({ where: { id }, include: { user: true } })
  if (!k) return notFound("Karyawan tidak ditemukan")
  return ok(k)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    const parsed = karyawanSchema.parse(body)
    const updated = await db.karyawan.update({
      where: { id },
      data: {
        nama: parsed.nama,
        email: parsed.email,
        telepon: parsed.telepon || null,
        tipe: parsed.tipe,
        gajiPokok: parsed.gajiPokok,
        status: parsed.status,
        alamat: parsed.alamat || null,
      },
    })
    // sync user email
    await db.user.updateMany({
      where: { karyawanId: id },
      data: { email: parsed.email, name: parsed.nama },
    })
    return ok(updated)
  } catch (e: any) {
    if (e?.name === "ZodError") return badRequest(e.errors?.[0]?.message || "Input tidak valid")
    if (e?.code === "P2002") return badRequest("Email sudah terdaftar")
    return serverError(e?.message)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await db.karyawan.delete({ where: { id } })
    return ok({ success: true })
  } catch {
    return notFound("Karyawan tidak ditemukan")
  }
}
