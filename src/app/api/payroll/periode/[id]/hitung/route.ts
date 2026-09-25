import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, notFound, badRequest } from "@/lib/responses"
import { persistRekap } from "@/lib/payroll"
import { STATUS_PERIODE } from "@/lib/constants"
import { getActingUser, guardAdmin } from "@/lib/session"

// Recalculate recaps for the period.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = guardAdmin(await getActingUser(_req))
  if (guard) return guard
  const { id } = await params
  const p = await db.periodeGaji.findUnique({ where: { id } })
  if (!p) return notFound("Periode tidak ditemukan")
  if (p.status === STATUS_PERIODE.TERKUNCI) {
    return badRequest("Periode sudah terkunci. Buka kunci dulu untuk menghitung ulang.")
  }
  await persistRekap(id, p.bulan, p.tahun)
  const updated = await db.periodeGaji.findUnique({
    where: { id },
    include: { rekap: { include: { karyawan: true } } },
  })
  return ok(updated)
}
