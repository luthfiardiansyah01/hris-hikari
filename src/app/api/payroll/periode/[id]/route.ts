import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, notFound } from "@/lib/responses"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = await db.periodeGaji.findUnique({
    where: { id },
    include: {
      rekap: {
        include: {
          karyawan: true,
          rekapAbsensi: { include: { absensi: true } },
          rekapSesi: { include: { sesi: { include: { program: true, siswa: true } } } },
        },
        orderBy: { karyawan: { tipe: "asc" } },
      },
      potongan: {
        include: {
          absensi: { include: { karyawan: true } },
          sesi: { include: { tutor: true } },
        },
      },
    },
  })
  if (!p) return notFound("Periode tidak ditemukan")
  return ok(p)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    // delete rekap items first
    await db.rekapAbsensi.deleteMany({ where: { rekapGaji: { periodeGajiId: id } } })
    await db.rekapSesi.deleteMany({ where: { rekapGaji: { periodeGajiId: id } } })
    await db.rekapGaji.deleteMany({ where: { periodeGajiId: id } })
    await db.periodeGaji.delete({ where: { id } })
    return ok({ success: true })
  } catch {
    return notFound("Periode tidak ditemukan")
  }
}
