import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, notFound } from "@/lib/responses"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const karyawanId = searchParams.get("karyawanId") || undefined
  const list = await db.notifikasi.findMany({
    where: karyawanId ? { karyawanId } : {},
    orderBy: { createdAt: "desc" },
    take: 50,
  })
  return ok(list)
}

export async function POST(req: NextRequest) {
  // manual notification creation (admin reminder)
  const body = await req.json()
  const n = await db.notifikasi.create({
    data: {
      karyawanId: body.karyawanId,
      tipe: body.tipe || "REMINDER_CEKIN",
      judul: body.judul,
      pesan: body.pesan,
      dataId: body.dataId || null,
    },
  })
  return ok(n)
}
