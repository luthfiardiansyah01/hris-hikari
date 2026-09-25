import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, badRequest, forbidden } from "@/lib/responses"
import { NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) return badRequest("Email dan password wajib diisi.")

    const user = await db.user.findUnique({
      where: { email },
      include: {
        karyawan: { select: { id: true, nama: true, tipe: true, status: true } },
      },
    })

    if (!user || user.password !== password) {
      return NextResponse.json({ error: "Email atau password salah." }, { status: 401 })
    }

    if (user.karyawan?.status === "NONAKTIF") {
      return forbidden("Akun Anda tidak aktif. Hubungi administrator.")
    }

    return ok({
      id: user.id,
      email: user.email,
      nama: user.name,
      role: user.role,
      karyawanId: user.karyawanId ?? null,
      tipe: user.karyawan?.tipe ?? null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Terjadi kesalahan." }, { status: 500 })
  }
}
