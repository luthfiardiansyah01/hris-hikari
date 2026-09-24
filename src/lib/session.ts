import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { USER_ROLE } from "@/lib/constants"

// Lightweight demo session: the acting user is passed via header
// x-acting-karyawan-id (value = "admin" or a karyawan id).
// In a production setup this would be replaced by NextAuth/JWT.

export type ActingUser = {
  role: "ADMIN" | "KARYAWAN"
  karyawanId?: string
  nama: string
  tipe?: "FIXED" | "FLEXIBLE"
}

const ADMIN_USER: ActingUser = {
  role: "ADMIN",
  nama: "Administrator",
}

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
