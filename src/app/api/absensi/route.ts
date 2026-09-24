import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok } from "@/lib/responses"

// GET /api/absensi?karyawanId=&dari=&sampai=
// Also GET /api/absensi?tanggal= (returns all fixed staff attendance for a day)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const karyawanId = searchParams.get("karyawanId") || undefined
  const dari = searchParams.get("dari")
  const sampai = searchParams.get("sampai")
  const tanggal = searchParams.get("tanggal")

  const where: any = {}
  if (karyawanId) where.karyawanId = karyawanId
  if (tanggal) {
    const d = new Date(tanggal)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    where.tanggal = { gte: d, lt: next }
  } else if (dari && sampai) {
    where.tanggal = { gte: new Date(dari), lte: new Date(sampai) }
  }

  const list = await db.absensi.findMany({
    where,
    include: { karyawan: true, potongan: true },
    orderBy: { tanggal: "asc" },
  })
  return ok(list)
}
