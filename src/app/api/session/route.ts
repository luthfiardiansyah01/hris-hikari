import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { getActingUser } from "@/lib/session"
import { ok } from "@/lib/responses"

export async function GET(req: NextRequest) {
  const user = await getActingUser(req)
  // also return list of switchable identities for demo
  const karyawanList = await db.karyawan.findMany({
    where: { status: "AKTIF" },
    select: { id: true, nama: true, tipe: true, email: true },
    orderBy: { tipe: "asc" },
  })
  return ok({ user, switchable: karyawanList })
}
