import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, notFound, badRequest } from "@/lib/responses"
import { STATUS_PERIODE } from "@/lib/constants"

// Explicitly unlock a locked period.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = await db.periodeGaji.findUnique({ where: { id } })
  if (!p) return notFound("Periode tidak ditemukan")
  if (p.status !== STATUS_PERIODE.TERKUNCI) return badRequest("Periode belum terkunci")
  const updated = await db.periodeGaji.update({
    where: { id },
    data: { status: STATUS_PERIODE.DRAFT },
  })
  return ok(updated)
}
