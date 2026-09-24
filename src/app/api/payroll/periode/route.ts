import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, created, badRequest, serverError } from "@/lib/responses"
import { persistRekap } from "@/lib/payroll"
import { STATUS_PERIODE } from "@/lib/constants"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const bulan = searchParams.get("bulan")
  const tahun = searchParams.get("tahun")
  if (bulan && tahun) {
    const p = await db.periodeGaji.findUnique({
      where: { bulan_tahun: { bulan: Number(bulan), tahun: Number(tahun) } },
      include: { rekap: { include: { karyawan: true, rekapAbsensi: true, rekapSesi: true } } },
    })
    return ok(p)
  }
  const list = await db.periodeGaji.findMany({
    orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
    include: { rekap: true },
  })
  return ok(list)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const bulan = Number(body.bulan)
    const tahun = Number(body.tahun)
    if (!bulan || !tahun) return badRequest("bulan & tahun wajib diisi")
    if (bulan < 1 || bulan > 12) return badRequest("bulan tidak valid")

    const existing = await db.periodeGaji.findUnique({
      where: { bulan_tahun: { bulan, tahun } },
    })
    if (existing) return badRequest("Periode gaji sudah ada")

    const p = await db.periodeGaji.create({
      data: { bulan, tahun, status: STATUS_PERIODE.DRAFT },
    })
    return created(p)
  } catch (e: any) {
    return serverError(e?.message)
  }
}
