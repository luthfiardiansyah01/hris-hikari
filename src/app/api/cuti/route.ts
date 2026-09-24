import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { cutiSchema } from "@/lib/validators"
import { ok, created, badRequest, serverError } from "@/lib/responses"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const karyawanId = searchParams.get("karyawanId") || undefined
  const status = searchParams.get("status") || undefined
  const list = await db.cuti.findMany({
    where: { ...(karyawanId ? { karyawanId } : {}), ...(status ? { status } : {}) },
    include: { karyawan: true },
    orderBy: { tanggalMulai: "desc" },
  })
  return ok(list)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = cutiSchema.parse(body)
    const c = await db.cuti.create({
      data: {
        karyawanId: parsed.karyawanId,
        tanggalMulai: new Date(parsed.tanggalMulai),
        tanggalSelesai: new Date(parsed.tanggalSelesai),
        alasan: parsed.alasan,
        status: parsed.status,
      },
      include: { karyawan: true },
    })
    return created(c)
  } catch (e: any) {
    if (e?.name === "ZodError") return badRequest(e.errors?.[0]?.message || "Input tidak valid")
    return serverError(e?.message)
  }
}
