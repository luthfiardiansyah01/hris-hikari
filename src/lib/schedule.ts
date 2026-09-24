import { db } from "@/lib/db"
import {
  STATUS_SESI,
  TIPE_KARYAWAN,
  STATUS_ABSENSI,
} from "@/lib/constants"

// ---------- Date helpers ----------
export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function endOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

export function daysInMonth(year: number, month: number): number {
  // month is 1-12
  return new Date(year, month, 0).getDate()
}

export function isWeekend(d: Date): boolean {
  const day = d.getDay()
  return day === 0 || day === 6 // Sunday or Saturday
}

export function isWorkday(d: Date): boolean {
  const day = d.getDay()
  return day >= 1 && day <= 5 // Monday-Friday
}

// ---------- Geo helpers ----------
// Haversine distance in meters
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000 // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

export function isWithinRadius(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  radiusMeter: number,
): boolean {
  return haversineDistance(lat, lng, centerLat, centerLng) <= radiusMeter
}

// ---------- Time parsing ----------
export function parseTimeToDate(baseDate: Date, timeStr: string): Date {
  // timeStr format "HH:mm"
  const [h, m] = timeStr.split(":").map(Number)
  const d = new Date(baseDate)
  d.setHours(h, m, 0, 0)
  return d
}

export function diffInMinutes(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 60000)
}

// ---------- Fixed-time attendance rules ----------
// Check-in up to 07:30:59 is on-time; 07:31+ is late.
// Tolerance: 1 minute configurable (default 1).
export function evaluateFixedCheckIn(
  checkInAt: Date,
  tanggal: Date,
  jamMasukStr: string,
  toleransiMenit: number,
): { status: "HADIR" | "TERLAMBAT"; terlambatMenit: number } {
  const deadline = parseTimeToDate(tanggal, jamMasukStr)
  // deadline = 07:30:00. On time = check-in <= deadline + 59s + tolerance
  // 1-minute tolerance => on time if checkInAt <= 07:31:59 (i.e. before 07:32:00)
  const onTimeLimit = new Date(deadline)
  onTimeLimit.setSeconds(onTimeLimit.getSeconds() + 59)
  onTimeLimit.setMinutes(onTimeLimit.getMinutes() + toleransiMenit)

  if (checkInAt <= onTimeLimit) {
    return { status: "HADIR", terlambatMenit: 0 }
  }
  const lateMinutes = Math.max(1, Math.ceil(diffInMinutes(checkInAt, deadline)) - 1)
  return { status: "TERLAMBAT", terlambatMenit: lateMinutes }
}

export function evaluatePulangCepat(
  checkOutAt: Date,
  tanggal: Date,
  jamPulangStr: string,
): number {
  const pulang = parseTimeToDate(tanggal, jamPulangStr)
  const diff = diffInMinutes(pulang, checkOutAt)
  return diff > 0 ? diff : 0
}

// ---------- Flexible-time session attendance ----------
// Check-in opens [windowMin] to [windowMax] minutes before jamMulai.
export function canCheckInSesi(
  now: Date,
  jamMulai: Date,
  windowMin: number,
  windowMax: number,
): { ok: boolean; reason?: string } {
  const earliest = new Date(jamMulai)
  earliest.setMinutes(earliest.getMinutes() - windowMax)
  const latest = new Date(jamMulai)
  latest.setMinutes(latest.getMinutes() + windowMin)
  if (now < earliest) {
    return { ok: false, reason: `Check-in dibuka ${windowMax} menit sebelum sesi dimulai.` }
  }
  if (now > latest) {
    return { ok: false, reason: "Jendela check-in sudah ditutup." }
  }
  return { ok: true }
}

// Late if check-in after minute 0 of session start, with 1-min tolerance
export function evaluateSesiTerlambat(
  checkInAt: Date,
  jamMulai: Date,
  toleransiMenit: number,
): { isLate: boolean; terlambatMenit: number } {
  const toleranceLimit = new Date(jamMulai)
  toleranceLimit.setMinutes(toleranceLimit.getMinutes() + toleransiMenit)
  toleranceLimit.setSeconds(toleranceLimit.getSeconds() + 59) // full minute tolerance
  if (checkInAt <= toleranceLimit) {
    return { isLate: false, terlambatMenit: 0 }
  }
  const lateMinutes = Math.max(1, diffInMinutes(checkInAt, jamMulai) - toleransiMenit)
  return { isLate: true, terlambatMenit: lateMinutes }
}

// ---------- Session schedule conflict detection ----------
export type ConflictInfo = {
  conflicting: boolean
  conflictWith?: { id: string; jamMulai: Date; jamSelesai: Date }
}

export async function detectTutorConflict(
  tutorId: string,
  jamMulai: Date,
  jamSelesai: Date,
  excludeSesiId?: string,
): Promise<ConflictInfo> {
  const overlapping = await db.sesi.findFirst({
    where: {
      tutorId,
      id: excludeSesiId ? { not: excludeSesiId } : undefined,
      status: { not: STATUS_SESI.DIBATALKAN },
      AND: [
        { jamMulai: { lt: jamSelesai } },
        { jamSelesai: { gt: jamMulai } },
      ],
    },
    orderBy: { jamMulai: "asc" },
  })
  if (overlapping) {
    return {
      conflicting: true,
      conflictWith: {
        id: overlapping.id,
        jamMulai: overlapping.jamMulai,
        jamSelesai: overlapping.jamSelesai,
      },
    }
  }
  return { conflicting: false }
}

// Find available tutors (not booked) for a given time slot
export async function findAvailableTutors(
  jamMulai: Date,
  jamSelesai: Date,
  excludeSesiId?: string,
): Promise<{ id: string; nama: string }[]> {
  const tutors = await db.karyawan.findMany({
    where: { tipe: TIPE_KARYAWAN.FLEXIBLE, status: "AKTIF" },
    select: { id: true, nama: true },
  })
  const available: { id: string; nama: string }[] = []
  for (const t of tutors) {
    const info = await detectTutorConflict(t.id, jamMulai, jamSelesai, excludeSesiId)
    if (!info.conflicting) available.push(t)
  }
  return available
}

// ---------- Honor calculation ----------
// Honor = scheduled duration (hours) x tarifSnapshot
export function hitungHonorSesi(jamMulai: Date, jamSelesai: Date, tarifPerJam: number): number {
  const minutes = diffInMinutes(jamSelesai, jamMulai)
  const hours = minutes / 60
  return Math.round(hours * tarifPerJam)
}

// ---------- Workday generation for fixed-time staff ----------
export async function getHariLiburSet(year: number, month: number): Promise<Set<string>> {
  // month 1-12
  const libur = await db.hariLibur.findMany()
  const set = new Set<string>()
  for (const l of libur) {
    if (l.recurring) {
      const d = new Date(year, month - 1, l.tanggal.getDate())
      set.add(formatDateKey(d))
    } else {
      if (l.tanggal.getFullYear() === year && l.tanggal.getMonth() + 1 === month) {
        set.add(formatDateKey(l.tanggal))
      }
    }
  }
  return set
}

export function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

// alias used by some modules
export const formatTanggalKey = formatDateKey

export { STATUS_ABSENSI, STATUS_SESI, TIPE_KARYAWAN }
