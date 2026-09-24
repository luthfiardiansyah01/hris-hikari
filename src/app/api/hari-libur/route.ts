import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { hariLiburSchema } from "@/lib/validators"
import { ok, created, badRequest, serverError } from "@/lib/responses"

export async function GET(_req: NextRequest) {
  const list = await db.hariLibur.findMany({ orderBy: { tanggal: "asc" } })
  return ok(list)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = hariLiburSchema.parse(body)
    const h = await db.hariLibur.create({
      data: {
        tanggal: new Date(parsed.tanggal),
        nama: parsed.nama,
        recurring: parsed.recurring,
      },
    })
    return created(h)
  } catch (e: any) {
    if (e?.name === "ZodError") return badRequest(e.errors?.[0]?.message || "Input tidak valid")
    if (e?.code === "P2002") return badRequest("Tanggal libur sudah ada")
    return serverError(e?.message)
  }
}
