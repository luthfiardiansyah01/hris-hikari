import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { siswaSchema } from "@/lib/validators"
import { ok, created, badRequest, serverError } from "@/lib/responses"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const programId = searchParams.get("programId") || undefined
  const list = await db.siswa.findMany({
    where: programId ? { siswaProgram: { some: { programId } } } : {},
    include: { siswaProgram: { include: { program: true } } },
    orderBy: { nama: "asc" },
  })
  return ok(list)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = siswaSchema.parse(body)
    const { programIds, ...data } = parsed
    const created_ = await db.siswa.create({
      data: {
        nama: data.nama,
        namaWali: data.namaWali || null,
        telepon: data.telepon || null,
        email: data.email || null,
        alamat: data.alamat || null,
        catatan: data.catatan || null,
        siswaProgram: programIds?.length
          ? { create: programIds.map((pid) => ({ programId: pid })) }
          : undefined,
      },
      include: { siswaProgram: { include: { program: true } } },
    })
    return created(created_)
  } catch (e: any) {
    if (e?.name === "ZodError") return badRequest(e.errors?.[0]?.message || "Input tidak valid")
    return serverError(e?.message)
  }
}
