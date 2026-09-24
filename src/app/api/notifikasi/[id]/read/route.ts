import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, notFound } from "@/lib/responses"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await db.notifikasi.update({ where: { id }, data: { dibaca: true } })
    return ok({ success: true })
  } catch {
    return notFound("Notifikasi tidak ditemukan")
  }
}
