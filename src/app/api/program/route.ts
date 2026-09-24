import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { programSchema } from "@/lib/validators"
import { ok, created, badRequest, serverError } from "@/lib/responses"

export async function GET(_req: NextRequest) {
  const list = await db.program.findMany({ orderBy: { nama: "asc" } })
  return ok(list)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = programSchema.parse(body)
    const created_ = await db.program.create({
      data: {
        nama: parsed.nama,
        tarifPerJam: parsed.tarifPerJam,
        deskripsi: parsed.deskripsi || null,
        warna: parsed.warna || null,
        status: parsed.status,
      },
    })
    return created(created_)
  } catch (e: any) {
    if (e?.name === "ZodError") return badRequest(e.errors?.[0]?.message || "Input tidak valid")
    return serverError(e?.message)
  }
}
