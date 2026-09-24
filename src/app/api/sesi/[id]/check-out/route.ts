import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, notFound, badRequest, serverError, forbidden } from "@/lib/responses"
import { getActingUser } from "@/lib/session"
import { STATUS_SESI } from "@/lib/constants"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const user = await getActingUser(req)
    const sesi = await db.sesi.findUnique({ where: { id } })
    if (!sesi) return notFound("Sesi tidak ditemukan")
    if (sesi.status === STATUS_SESI.DIBATALKAN) return badRequest("Sesi dibatalkan")
    if (!sesi.checkInAt) return badRequest("Sesi belum di-check-in")
    if (sesi.checkOutAt) return badRequest("Sesi sudah di-check-out")

    if (user.role !== "ADMIN" && user.karyawanId !== sesi.tutorId) {
      return forbidden("Anda bukan tutor sesi ini")
    }

    const formData = await req.formData()
    const file = formData.get("foto") as File | null
    if (!file) return badRequest("Foto wajib diupload (dari kamera)")
    if (!file.type.startsWith("image/")) return badRequest("File harus berupa gambar")

    const lat = formData.get("lat") ? Number(formData.get("lat")) : null
    const lng = formData.get("lng") ? Number(formData.get("lng")) : null

    const ext = file.name.split(".").pop() || "jpg"
    const filename = `checkout-${id}-${Date.now()}.${ext}`
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "absensi")
    await mkdir(uploadsDir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(uploadsDir, filename), buffer)

    const now = new Date()
    // If check-out happens before session end -> mark as MENUNGGU_KONFIRMASI (admin review)
    // If after end -> SELESAI
    const beforeEnd = now < sesi.jamSelesai
    const updated = await db.sesi.update({
      where: { id },
      data: {
        checkOutAt: now,
        checkOutFoto: `/uploads/absensi/${filename}`,
        checkOutLat: lat,
        checkOutLng: lng,
        status: beforeEnd ? STATUS_SESI.MENUNGGU_KONFIRMASI : STATUS_SESI.SELESAI,
        confirmed: !beforeEnd,
      },
      include: { tutor: true, program: true, siswa: true },
    })
    return ok({
      sesi: updated,
      needsConfirmation: beforeEnd,
      message: beforeEnd
        ? "Check-out lebih awal. Sesi menunggu konfirmasi admin."
        : "Sesi selesai.",
    })
  } catch (e: any) {
    return serverError(e?.message)
  }
}
