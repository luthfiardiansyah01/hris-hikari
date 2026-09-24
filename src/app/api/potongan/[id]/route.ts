import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, notFound } from "@/lib/responses"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await db.potongan.delete({ where: { id } })
    return ok({ success: true })
  } catch {
    return notFound("Potongan tidak ditemukan")
  }
}
