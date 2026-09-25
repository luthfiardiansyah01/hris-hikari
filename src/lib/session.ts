import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { USER_ROLE } from "@/lib/constants"

export type ActingUser = {
  role: "ADMIN" | "KARYAWAN"
  karyawanId?: string
  nama: string
  tipe?: "FIXED" | "FLEXIBLE"
}

const ADMIN_USER: ActingUser = { role: "ADMIN", nama: "Administrator" }

export async function getActingUser(req: NextRequest): Promise<ActingUser> {
  const id = req.headers.get("x-acting-karyawan-id") || "admin"
  if (id === "admin") return ADMIN_USER
  const k = await db.karyawan.findUnique({ where: { id } })
  if (!k) return ADMIN_USER
  return {
    role: USER_ROLE.KARYAWAN,
    karyawanId: k.id,
    nama: k.nama,
    tipe: k.tipe as "FIXED" | "FLEXIBLE",
  }
}

export function requireAdmin(user: ActingUser): boolean {
  return user.role === "ADMIN"
}

/** Returns 403 response if user is not ADMIN, null if allowed. */
export function guardAdmin(user: ActingUser): NextResponse | null {
  if (user.role === "ADMIN") return null
  return NextResponse.json({ error: "Akses ditolak. Hanya admin yang diizinkan." }, { status: 403 })
}

/** Returns 403 if user is neither ADMIN nor the matching karyawan. */
export function guardSelf(user: ActingUser, karyawanId: string): NextResponse | null {
  if (user.role === "ADMIN") return null
  if (user.karyawanId === karyawanId) return null
  return NextResponse.json({ error: "Akses ditolak." }, { status: 403 })
}
