import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, notFound, badRequest, serverError } from "@/lib/responses"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    const status = body.status as "PENDING" | "APPROVED" | "REJECTED"
    if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      return badRequest("Status tidak valid")
    }
    const updated = await db.cuti.update({
      where: { id },
      data: { status },
      include: { karyawan: true },
    })
    return ok(updated)
  } catch {
    return notFound("Cuti tidak ditemukan")
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await db.cuti.delete({ where: { id } })
    return ok({ success: true })
  } catch {
    return notFound("Cuti tidak ditemukan")
  }
}
