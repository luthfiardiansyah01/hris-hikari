import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { karyawanSchema } from "@/lib/validators"
import { ok, created, badRequest, serverError } from "@/lib/responses"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tipe = searchParams.get("tipe") || undefined
  const status = searchParams.get("status") || undefined
  const list = await db.karyawan.findMany({
    where: {
      ...(tipe ? { tipe } : {}),
      ...(status ? { status } : {}),
    },
    include: { user: true },
    orderBy: [{ tipe: "asc" }, { nama: "asc" }],
  })
  return ok(list)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = karyawanSchema.parse(body)
    const created_ = await db.karyawan.create({
      data: {
        nama: parsed.nama,
        email: parsed.email,
        telepon: parsed.telepon || null,
        tipe: parsed.tipe,
        gajiPokok: parsed.gajiPokok,
        status: parsed.status,
        alamat: parsed.alamat || null,
      },
    })
    // auto-create a login user for the employee
    await db.user.create({
      data: {
        email: parsed.email,
        password: "demo123",
        name: parsed.nama,
        role: "KARYAWAN",
        karyawanId: created_.id,
      },
    })
    return created(created_)
  } catch (e: any) {
    if (e?.name === "ZodError") return badRequest(e.errors?.[0]?.message || "Input tidak valid")
    if (e?.code === "P2002") return badRequest("Email sudah terdaftar")
    return serverError(e?.message)
  }
}
