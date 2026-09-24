import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { potonganSchema } from "@/lib/validators"
import { ok, created, badRequest, serverError } from "@/lib/responses"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const absensiId = searchParams.get("absensiId") || undefined
  const sesiId = searchParams.get("sesiId") || undefined
  const periodeGajiId = searchParams.get("periodeGajiId") || undefined

  const where: any = {}
  if (absensiId) where.absensiId = absensiId
  if (sesiId) where.sesiId = sesiId
  if (periodeGajiId) where.periodeGajiId = periodeGajiId

  const list = await db.potongan.findMany({
    where,
    include: { absensi: { include: { karyawan: true } }, sesi: { include: { tutor: true } }, periodeGaji: true },
    orderBy: { createdAt: "desc" },
  })
  return ok(list)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = potonganSchema.parse(body)
    const p = await db.potongan.create({
      data: {
        nominal: parsed.nominal,
        alasan: parsed.alasan,
        tipe: parsed.tipe,
        absensiId: parsed.absensiId || null,
        sesiId: parsed.sesiId || null,
        periodeGajiId: parsed.periodeGajiId || null,
      },
      include: { absensi: { include: { karyawan: true } }, sesi: { include: { tutor: true } } },
    })
    return created(p)
  } catch (e: any) {
    if (e?.name === "ZodError") return badRequest(e.errors?.[0]?.message || "Input tidak valid")
    return serverError(e?.message)
  }
}
