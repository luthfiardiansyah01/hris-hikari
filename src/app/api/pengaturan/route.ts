import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { pengaturanSchema } from "@/lib/validators"
import { ok, badRequest, serverError } from "@/lib/responses"
import { getActingUser, guardAdmin } from "@/lib/session"

const DEFAULTS = {
  id: "default",
  kantorLat: -6.2,
  kantorLng: 106.816,
  kantorRadiusMeter: 150,
  jamMasukFixed: "07:30",
  jamPulangFixed: "17:00",
  toleransiTerlambatMenit: 1,
  checkInWindowMin: 15,
  checkInWindowMax: 30,
  namaPerusahaan: "Bimbel Cerdas",
}

export async function GET(_req: NextRequest) {
  let p = await db.pengaturan.findUnique({ where: { id: "default" } })
  if (!p) {
    p = await db.pengaturan.create({ data: DEFAULTS })
  }
  return ok(p)
}

export async function PUT(req: NextRequest) {
  const guard = guardAdmin(await getActingUser(req))
  if (guard) return guard
  try {
    const body = await req.json()
    const parsed = pengaturanSchema.parse(body)
    const updated = await db.pengaturan.upsert({
      where: { id: "default" },
      update: {
        kantorLat: parsed.kantorLat,
        kantorLng: parsed.kantorLng,
        kantorRadiusMeter: parsed.kantorRadiusMeter,
        jamMasukFixed: parsed.jamMasukFixed,
        jamPulangFixed: parsed.jamPulangFixed,
        toleransiTerlambatMenit: parsed.toleransiTerlambatMenit,
        checkInWindowMin: parsed.checkInWindowMin,
        checkInWindowMax: parsed.checkInWindowMax,
        namaPerusahaan: parsed.namaPerusahaan,
      },
      create: {
        ...parsed,
        id: "default",
      },
    })
    return ok(updated)
  } catch (e: any) {
    if (e?.name === "ZodError") return badRequest(e.errors?.[0]?.message || "Input tidak valid")
    return serverError(e?.message)
  }
}
