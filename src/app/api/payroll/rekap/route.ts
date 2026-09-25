import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { getActingUser, guardSelf } from "@/lib/session"
import { ok, badRequest } from "@/lib/responses"
import { NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const karyawanId = searchParams.get("karyawanId")
    if (!karyawanId) return badRequest("karyawanId wajib diisi.")

    const user = await getActingUser(req)
    const guard = guardSelf(user, karyawanId)
    if (guard) return guard

    const rekap = await db.rekapGaji.findMany({
      where: { karyawanId },
      include: { periodeGaji: { select: { bulan: true, tahun: true, status: true } } },
      orderBy: [{ periodeGaji: { tahun: "desc" } }, { periodeGaji: { bulan: "desc" } }],
      take: 24,
    })

    return ok(rekap)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
