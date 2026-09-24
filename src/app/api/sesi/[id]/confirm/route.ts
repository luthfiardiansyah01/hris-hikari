import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, notFound, badRequest, serverError } from "@/lib/responses"
import { STATUS_SESI } from "@/lib/constants"

// Admin manually confirms a session that is in MENUNGGU_KONFIRMASI status.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const sesi = await db.sesi.findUnique({ where: { id } })
    if (!sesi) return notFound("Sesi tidak ditemukan")
    if (sesi.status !== STATUS_SESI.MENUNGGU_KONFIRMASI) {
      return badRequest("Sesi tidak dalam status menunggu konfirmasi")
    }
    const body = await req.json().catch(() => ({}))
    const action = body.action as "approve" | "reject" | undefined
    if (action === "reject") {
      // reject: keep session but no honor -> mark as needs no honor, set confirmed=false
      const updated = await db.sesi.update({
        where: { id },
        data: { confirmed: false, status: STATUS_SESI.SELESAI, catatan: (sesi.catatan || "") + " [ditolak admin: tanpa honor]" },
      })
      return ok({ sesi: updated, confirmed: false })
    }
    // approve: confirmed=true, status=SELESAI (honor counted)
    const updated = await db.sesi.update({
      where: { id },
      data: { confirmed: true, status: STATUS_SESI.SELESAI },
      include: { tutor: true, program: true, siswa: true },
    })
    return ok({ sesi: updated, confirmed: true })
  } catch (e: any) {
    return serverError(e?.message)
  }
}
