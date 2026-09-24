import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, notFound, badRequest, serverError, forbidden } from "@/lib/responses"
import { canCheckInSesi, evaluateSesiTerlambat } from "@/lib/schedule"
import { getActingUser } from "@/lib/session"
import { STATUS_SESI } from "@/lib/constants"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const user = await getActingUser(req)
    const sesi = await db.sesi.findUnique({ where: { id }, include: { pengaturan: false, program: true } })
    if (!sesi) return notFound("Sesi tidak ditemukan")
    if (sesi.status === STATUS_SESI.DIBATALKAN) return badRequest("Sesi dibatalkan")
    if (sesi.checkInAt) return badRequest("Sesi sudah di-check-in")

    // Only the assigned tutor (or admin) can check in
    if (user.role !== "ADMIN" && user.karyawanId !== sesi.tutorId) {
      return forbidden("Anda bukan tutor sesi ini")
    }

    const pengaturan = await db.pengaturan.findUnique({ where: { id: "default" } })
    const now = new Date()

    const window = canCheckInSesi(
      now,
      sesi.jamMulai,
      pengaturan?.toleransiTerlambatMenit ?? 1,
      pengaturan?.checkInWindowMax ?? 30,
    )
    if (!window.ok) return badRequest(window.reason || "Check-in belum dibuka")

    // Process photo (FormData)
    const formData = await req.formData()
    const file = formData.get("foto") as File | null
    if (!file) return badRequest("Foto wajib diupload (dari kamera)")
    if (!file.type.startsWith("image/")) return badRequest("File harus berupa gambar")

    const lat = formData.get("lat") ? Number(formData.get("lat")) : null
    const lng = formData.get("lng") ? Number(formData.get("lng")) : null

    // Save photo
    const ext = file.name.split(".").pop() || "jpg"
    const filename = `checkin-${id}-${Date.now()}.${ext}`
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "absensi")
    await mkdir(uploadsDir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(uploadsDir, filename), buffer)

    const { isLate, terlambatMenit } = evaluateSesiTerlambat(
      now,
      sesi.jamMulai,
      pengaturan?.toleransiTerlambatMenit ?? 1,
    )

    const updated = await db.sesi.update({
      where: { id },
      data: {
        checkInAt: now,
        checkInFoto: `/uploads/absensi/${filename}`,
        checkInLat: lat,
        checkInLng: lng,
        terlambatMenit: isLate ? terlambatMenit : null,
        status: STATUS_SESI.BERJALAN,
      },
      include: { tutor: true, program: true, siswa: true },
    })
    return ok({ sesi: updated, isLate, terlambatMenit })
  } catch (e: any) {
    return serverError(e?.message)
  }
}
