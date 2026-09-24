import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, notFound, badRequest } from "@/lib/responses"
import { STATUS_PERIODE } from "@/lib/constants"
import { persistRekap } from "@/lib/payroll"

// Lock the period. First ensures recaps are freshly computed.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = await db.periodeGaji.findUnique({ where: { id } })
  if (!p) return notFound("Periode tidak ditemukan")
  if (p.status === STATUS_PERIODE.TERKUNCI) return badRequest("Periode sudah terkunci")

  // Recompute before locking
  await persistRekap(id, p.bulan, p.tahun)

  const updated = await db.periodeGaji.update({
    where: { id },
    data: { status: STATUS_PERIODE.TERKUNCI },
  })
  // notify all active employees
  const karyawanList = await db.karyawan.findMany({ where: { status: "AKTIF" } })
  await db.notifikasi.createMany({
    data: karyawanList.map((k) => ({
      karyawanId: k.id,
      tipe: "PERIODE_DIKUNCI",
      judul: "Periode gaji dikunci",
      pesan: `Periode gaji ${p.bulan}/${p.tahun} telah dikunci admin.`,
    })),
  })
  return ok(updated)
}
