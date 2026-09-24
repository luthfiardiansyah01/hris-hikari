"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api-client"
import { useAppStore } from "@/store/app-store"
import { toast } from "sonner"
import {
  formatJam,
  formatTanggal,
  formatTanggalSingkat,
  formatRupiah,
} from "@/lib/constants"
import { hitungHonorSesi } from "@/lib/schedule"
import { EmptyState, LoadingState, StatusSesiBadge } from "@/components/shared/ui"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  CalendarDays,
  Camera,
  Bell,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  User,
  Image as ImageIcon,
  RefreshCw,
} from "lucide-react"

// ---------- Types ----------
type Sesi = {
  id: string
  tanggal: string
  jamMulai: string
  jamSelesai: string
  tutorId: string
  programId: string
  siswaId: string
  tarifSnapshot: number
  status: string
  catatan: string | null
  checkInAt: string | null
  checkOutAt: string | null
  checkInFoto: string | null
  checkOutFoto: string | null
  checkInLat: number | null
  checkInLng: number | null
  checkOutLat: number | null
  checkOutLng: number | null
  terlambatMenit: number | null
  confirmed: boolean
  tutor: { id: string; nama: string }
  program: { id: string; nama: string; warna: string | null }
  siswa: { id: string; nama: string }
}

type Notifikasi = {
  id: string
  karyawanId: string
  tipe: string
  judul: string
  pesan: string
  dataId: string | null
  dibaca: boolean
  createdAt: string
}

// ---------- FormData upload helper ----------
// NOTE: apiFetch forces Content-Type: application/json on body, so for multipart uploads
// we build a fetch that only attaches the acting-user header and lets the browser set
// the multipart boundary automatically.
async function uploadAbsen(
  url: string,
  fotoBlob: Blob,
  lat: number | null,
  lng: number | null,
) {
  const fd = new FormData()
  fd.append("foto", fotoBlob, "absen.jpg")
  if (lat != null) fd.append("lat", String(lat))
  if (lng != null) fd.append("lng", String(lng))
  const id =
    (typeof window !== "undefined" &&
      localStorage.getItem("acting-karyawan-id")) ||
    "admin"
  const res = await fetch(url, {
    method: "POST",
    headers: { "x-acting-karyawan-id": id },
    body: fd,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Gagal mengirim absen")
  return data as {
    sesi?: Sesi
    isLate?: boolean
    terlambatMenit?: number
    needsConfirmation?: boolean
    message?: string
  }
}

// ---------- Small helpers ----------
function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function dateKey(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d
  return toISODate(dt)
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.max(0, now - then)
  const min = Math.floor(diff / 60000)
  if (min < 1) return "Baru saja"
  if (min < 60) return `${min} menit lalu`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} jam lalu`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day} hari lalu`
  return formatTanggalSingkat(iso)
}

// ============================================================
// Main view
// ============================================================
export function TutorPortalView() {
  const { tutorView, setTutorView, actingKaryawanId, actingKaryawanNama } =
    useAppStore()
  const [selectedSesiId, setSelectedSesiId] = useState<string | null>(null)

  const isAdmin = !actingKaryawanId || actingKaryawanId === "admin"

  // When tutor identity changes, clear any pre-selected session (render-phase reset)
  const [prevTutor, setPrevTutor] = useState(actingKaryawanId)
  if (prevTutor !== actingKaryawanId) {
    setPrevTutor(actingKaryawanId)
    setSelectedSesiId(null)
  }

  const tabs: {
    key: typeof tutorView
    label: string
    icon: typeof CalendarDays
  }[] = [
    { key: "jadwal-saya", label: "Jadwal Saya", icon: CalendarDays },
    { key: "absen", label: "Absen", icon: Camera },
    { key: "notifikasi", label: "Notifikasi", icon: Bell },
  ]

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-3xl flex-col bg-background">
      {/* Top header band */}
      <header className="sticky top-14 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Portal Tutor
            </p>
            <h1 className="truncate text-base font-semibold sm:text-lg">
              Halo, {isAdmin ? "Admin" : actingKaryawanNama || "Tutor"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary sm:inline">
              Flexible Time
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 pb-28 pt-4">
        {isAdmin ? (
          <AdminNotice />
        ) : (
          <>
            {tutorView === "jadwal-saya" && (
              <JadwalSayaView
                tutorId={actingKaryawanId}
                onSelectSesi={(id) => {
                  setSelectedSesiId(id)
                  setTutorView("absen")
                }}
              />
            )}
            {tutorView === "absen" && (
              <AbsenView
                tutorId={actingKaryawanId}
                selectedSesiId={selectedSesiId}
                onClearSelection={() => setSelectedSesiId(null)}
                onGoToJadwal={() => setTutorView("jadwal-saya")}
              />
            )}
            {tutorView === "notifikasi" && (
              <NotifikasiView karyawanId={actingKaryawanId} />
            )}
          </>
        )}
      </main>

      {/* Bottom tab bar - fixed within container width */}
      <nav
        aria-label="Navigasi tutor"
        className="fixed bottom-0 left-1/2 z-30 w-full max-w-3xl -translate-x-1/2 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-3">
          {tabs.map((t) => {
            const Icon = t.icon
            const active = tutorView === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTutorView(t.key)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-[56px] flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {t.key === "notifikasi" && (
                    <UnreadBadge karyawanId={actingKaryawanId} />
                  )}
                </span>
                <span>{t.label}</span>
                {active && (
                  <span className="absolute inset-x-3 top-0 h-0.5 rounded-b-full bg-primary" />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

// ---------- Admin notice ----------
function AdminNotice() {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
      <p className="flex items-center gap-2 font-medium">
        <AlertTriangle className="h-4 w-4" />
        Silakan pilih tutor dari menu atas (ikon user)
      </p>
      <p className="mt-1 text-amber-700/90 dark:text-amber-300/90">
        Anda sedang login sebagai admin. Pilih profil tutor pada tombol user di
        pojok kanan atas untuk mengakses portal tutor.
      </p>
    </div>
  )
}

// ---------- Unread badge ----------
function UnreadBadge({ karyawanId }: { karyawanId: string }) {
  const { data } = useQuery({
    queryKey: ["notifikasi", karyawanId],
    queryFn: () =>
      apiFetch<Notifikasi[]>(`/api/notifikasi?karyawanId=${karyawanId}`),
    enabled: !!karyawanId && karyawanId !== "admin",
    refetchInterval: 30_000,
  })
  const count = data?.filter((n) => !n.dibaca).length ?? 0
  if (!count) return null
  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
      {count > 9 ? "9+" : count}
    </span>
  )
}

// ============================================================
// SUB-VIEW 1: Jadwal Saya
// ============================================================
function JadwalSayaView({
  tutorId,
  onSelectSesi,
}: {
  tutorId: string
  onSelectSesi: (id: string) => void
}) {
  const today = new Date()
  const sampai = new Date()
  sampai.setDate(sampai.getDate() + 14)

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["sesi-tutor", tutorId],
    queryFn: () =>
      apiFetch<Sesi[]>(
        `/api/sesi?tutorId=${tutorId}&dari=${toISODate(today)}&sampai=${toISODate(sampai)}`,
      ),
    enabled: !!tutorId,
  })

  // Group sessions by date key
  const grouped = useMemo(() => {
    const map = new Map<string, Sesi[]>()
    for (const s of data ?? []) {
      if (s.status === "DIBATALKAN") continue
      const k = dateKey(s.jamMulai)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(s)
    }
    // sort groups by date asc
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [data])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SectionTitle icon={CalendarDays} title="Jadwal 14 Hari Ke Depan" />
        <LoadingState rows={4} />
      </div>
    )
  }

  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Gagal memuat jadwal"
        description="Terjadi kesalahan saat mengambil data sesi."
        action={
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Coba lagi
          </Button>
        }
      />
    )
  }

  if (grouped.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Belum ada jadwal sesi"
        description="Anda belum memiliki sesi terjadwal dalam 14 hari ke depan."
      />
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionTitle icon={CalendarDays} title="Jadwal 14 Hari Ke Depan" />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Muat ulang"
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </Button>
      </div>

      {grouped.map(([date, sessions]) => {
        const isToday = dateKey(new Date()) === date
        return (
          <section key={date} className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {formatTanggal(date)}
              </h3>
              {isToday && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                  Hari ini
                </span>
              )}
            </div>
            <div className="space-y-2">
              {sessions.map((s) => (
                <SesiCard key={s.id} sesi={s} onSelectSesi={onSelectSesi} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: typeof CalendarDays
  title: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
    </div>
  )
}

function SesiCard({
  sesi,
  onSelectSesi,
}: {
  sesi: Sesi
  onSelectSesi: (id: string) => void
}) {
  const honor = hitungHonorSesi(
    new Date(sesi.jamMulai),
    new Date(sesi.jamSelesai),
    sesi.tarifSnapshot,
  )
  const warna = sesi.program.warna || "#64748b"

  const canCheckIn = sesi.status === "TERJADWAL"
  const canCheckOut = sesi.status === "BERJALAN"

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Program color dot */}
          <div
            className="mt-1 h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: warna }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            {/* Time */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex items-center gap-1 text-sm font-semibold">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {formatJam(sesi.jamMulai)} – {formatJam(sesi.jamSelesai)}
              </span>
              <StatusSesiBadge status={sesi.status} />
            </div>
            {/* Program + siswa */}
            <p className="mt-1 truncate text-sm font-medium">
              {sesi.program.nama}
            </p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              {sesi.siswa.nama}
            </p>

            {/* Honor */}
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                {formatRupiah(honor)}
              </span>
              <span className="text-[11px] text-muted-foreground">
                @ {formatRupiah(sesi.tarifSnapshot)}/jam
              </span>
            </div>

            {/* Attendance info */}
            {(sesi.checkInAt || sesi.checkOutAt) && (
              <div className="mt-2 space-y-1 rounded-md border bg-muted/30 p-2 text-xs">
                {sesi.checkInAt && (
                  <p className="flex items-center gap-1.5">
                    <LogIn className="h-3 w-3 text-emerald-600" />
                    <span className="text-muted-foreground">Masuk:</span>
                    <span className="font-medium">
                      {formatJam(sesi.checkInAt)}
                    </span>
                    {sesi.terlambatMenit ? (
                      <span className="ml-1 inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-3 w-3" />
                        telat {sesi.terlambatMenit} mnt
                      </span>
                    ) : (
                      <span className="ml-1 inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        tepat waktu
                      </span>
                    )}
                  </p>
                )}
                {sesi.checkOutAt && (
                  <p className="flex items-center gap-1.5">
                    <LogOut className="h-3 w-3 text-sky-600" />
                    <span className="text-muted-foreground">Pulang:</span>
                    <span className="font-medium">
                      {formatJam(sesi.checkOutAt)}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Action button */}
            {(canCheckIn || canCheckOut) && (
              <Button
                size="sm"
                className="mt-3 w-full"
                onClick={() => onSelectSesi(sesi.id)}
              >
                {canCheckIn ? (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Check-in
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 h-4 w-4" />
                    Check-out
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// SUB-VIEW 2: Absen (camera check-in/out)
// ============================================================
function AbsenView({
  tutorId,
  selectedSesiId,
  onClearSelection,
  onGoToJadwal,
}: {
  tutorId: string
  selectedSesiId: string | null
  onClearSelection: () => void
  onGoToJadwal: () => void
}) {
  const qc = useQueryClient()

  // Fetch the tutor's sessions and find the selected one. Sharing the same
  // query key with JadwalSayaView means invalidation refreshes both views.
  const today = new Date()
  const sampai = new Date()
  sampai.setDate(sampai.getDate() + 14)

  const { data, isLoading } = useQuery({
    queryKey: ["sesi-tutor", tutorId],
    queryFn: () =>
      apiFetch<Sesi[]>(
        `/api/sesi?tutorId=${tutorId}&dari=${toISODate(today)}&sampai=${toISODate(sampai)}`,
      ),
    enabled: !!tutorId,
  })

  const sesi = useMemo(
    () => (selectedSesiId ? data?.find((s) => s.id === selectedSesiId) : undefined),
    [data, selectedSesiId],
  )

  const [fotoBlob, setFotoBlob] = useState<Blob | null>(null)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsStatus, setGpsStatus] = useState<
    "idle" | "loading" | "ok" | "unavailable"
  >("idle")
  const [gpsSupported] = useState(
    () =>
      typeof navigator !== "undefined" && !!navigator.geolocation?.getCurrentPosition,
  )

  // Clean up preview URL when it changes / on unmount
  useEffect(() => {
    return () => {
      if (fotoUrl) URL.revokeObjectURL(fotoUrl)
    }
  }, [fotoUrl])

  // Reset dependent state when sesi changes (render-phase reset pattern)
  const [prevSesiId, setPrevSesiId] = useState<string | null>(selectedSesiId)
  if (prevSesiId !== selectedSesiId) {
    setPrevSesiId(selectedSesiId)
    setFotoBlob(null)
    setFotoUrl(null)
    setGps(null)
    setGpsStatus(
      selectedSesiId ? (gpsSupported ? "loading" : "unavailable") : "idle",
    )
  }

  // Subscribe to geolocation API — only setState inside async callbacks
  useEffect(() => {
    if (!selectedSesiId || !gpsSupported) return
    let cancelled = false
    const timer = setTimeout(() => {
      if (!cancelled) setGpsStatus((p) => (p === "loading" ? "unavailable" : p))
    }, 6000)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return
        clearTimeout(timer)
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsStatus("ok")
      },
      () => {
        if (cancelled) return
        clearTimeout(timer)
        setGpsStatus("unavailable")
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60_000 },
    )
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [selectedSesiId, gpsSupported])

  const onCapture = useCallback((blob: Blob) => {
    if (fotoUrl) URL.revokeObjectURL(fotoUrl)
    setFotoBlob(blob)
    setFotoUrl(URL.createObjectURL(blob))
  }, [fotoUrl])

  const clearPhoto = useCallback(() => {
    if (fotoUrl) URL.revokeObjectURL(fotoUrl)
    setFotoBlob(null)
    setFotoUrl(null)
  }, [fotoUrl])

  const checkInM = useMutation({
    mutationFn: () =>
      uploadAbsen(
        `/api/sesi/${selectedSesiId}/check-in`,
        fotoBlob!,
        gps?.lat ?? null,
        gps?.lng ?? null,
      ),
    onSuccess: (data) => {
      toast.success(
        data.isLate
          ? `Check-in terlambat ${data.terlambatMenit ?? 0} menit.`
          : "Berhasil check-in. Tepat waktu!",
      )
      qc.invalidateQueries({ queryKey: ["sesi-tutor", tutorId] })
      onClearSelection()
      onGoToJadwal()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const checkOutM = useMutation({
    mutationFn: () =>
      uploadAbsen(
        `/api/sesi/${selectedSesiId}/check-out`,
        fotoBlob!,
        gps?.lat ?? null,
        gps?.lng ?? null,
      ),
    onSuccess: (data) => {
      if (data.needsConfirmation) {
        toast.warning(data.message || "Sesi menunggu konfirmasi admin.")
      } else {
        toast.success(data.message || "Sesi selesai.")
      }
      qc.invalidateQueries({ queryKey: ["sesi-tutor", tutorId] })
      onClearSelection()
      onGoToJadwal()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // ---------- Render states ----------
  if (!selectedSesiId) {
    return (
      <div className="space-y-4">
        <SectionTitle icon={Camera} title="Absen Sesi" />
        <EmptyState
          icon={Camera}
          title="Pilih sesi dari Jadwal Saya untuk absen"
          description="Buka tab Jadwal Saya lalu tekan tombol Check-in / Check-out pada sesi yang akan diabsen."
          action={
            <Button size="sm" onClick={onGoToJadwal}>
              <CalendarDays className="mr-2 h-4 w-4" />
              Buka Jadwal Saya
            </Button>
          }
        />
      </div>
    )
  }

  if (isLoading || !sesi) {
    return (
      <div className="space-y-4">
        <SectionTitle icon={Camera} title="Absen Sesi" />
        <LoadingState rows={3} />
      </div>
    )
  }

  const honor = hitungHonorSesi(
    new Date(sesi.jamMulai),
    new Date(sesi.jamSelesai),
    sesi.tarifSnapshot,
  )
  const warna = sesi.program.warna || "#64748b"

  const isCheckIn = !sesi.checkInAt
  const isCheckOut = !!sesi.checkInAt && !sesi.checkOutAt
  const isDone = !!sesi.checkOutAt
  const submitting = checkInM.isPending || checkOutM.isPending

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle icon={Camera} title="Absen Sesi" />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            onClearSelection()
            onGoToJadwal()
          }}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Kembali
        </Button>
      </div>

      {/* Session detail card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div
              className="mt-1 h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: warna }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{sesi.program.nama}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                {sesi.siswa.nama}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 font-medium">
                  <Clock className="h-3 w-3" />
                  {formatJam(sesi.jamMulai)} – {formatJam(sesi.jamSelesai)}
                </span>
                <span className="text-muted-foreground">
                  {formatTanggal(sesi.jamMulai)}
                </span>
                <StatusSesiBadge status={sesi.status} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Honor sesi:{" "}
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                  {formatRupiah(honor)}
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Already done notice */}
      {isDone && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200">
          <p className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Sesi sudah selesai diabsen
          </p>
          <p className="mt-1 text-xs text-emerald-700/90 dark:text-emerald-300/90">
            Check-in {sesi.checkInAt ? formatJam(sesi.checkInAt) : "-"} ·
            Check-out {sesi.checkOutAt ? formatJam(sesi.checkOutAt) : "-"}
          </p>
        </div>
      )}

      {/* Camera capture (disabled when done) */}
      {!isDone && (
        <CameraCapture
          onCapture={onCapture}
          fotoUrl={fotoUrl}
          onClearPhoto={clearPhoto}
          disabled={submitting}
        />
      )}

      {/* GPS status */}
      {!isDone && (
        <div className="rounded-lg border p-3 text-xs">
          <p className="flex items-center gap-2">
            <MapPin
              className={cn(
                "h-4 w-4",
                gpsStatus === "ok"
                  ? "text-emerald-600"
                  : gpsStatus === "loading"
                    ? "text-amber-500 animate-pulse"
                    : "text-muted-foreground",
              )}
            />
            {gpsStatus === "ok" && gps ? (
              <span className="text-muted-foreground">
                GPS tercatat:{" "}
                <span className="font-medium text-foreground">
                  {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
                </span>
              </span>
            ) : gpsStatus === "loading" ? (
              <span className="text-muted-foreground">Mengambil lokasi GPS…</span>
            ) : (
              <span className="text-muted-foreground">
                GPS tidak tersedia — tetap lanjut, lokasi akan kosong.
              </span>
            )}
          </p>
        </div>
      )}

      {/* Action buttons */}
      {!isDone && (
        <div className="space-y-2">
          {isCheckIn && (
            <Button
              className="w-full"
              size="lg"
              disabled={!fotoBlob || submitting}
              onClick={() => checkInM.mutate()}
            >
              <LogIn className="mr-2 h-5 w-5" />
              {submitting ? "Mengirim…" : "Kirim Absen Masuk"}
            </Button>
          )}
          {isCheckOut && (
            <Button
              className="w-full"
              size="lg"
              disabled={!fotoBlob || submitting}
              onClick={() => checkOutM.mutate()}
            >
              <LogOut className="mr-2 h-5 w-5" />
              {submitting ? "Mengirim…" : "Kirim Absen Pulang"}
            </Button>
          )}
          {!fotoBlob && (
            <p className="text-center text-xs text-muted-foreground">
              Tangkap foto terlebih dahulu untuk mengirim absen.
            </p>
          )}
        </div>
      )}

      {/* Previous attendance record */}
      {(sesi.checkInAt || sesi.checkOutAt) && (
        <Card>
          <CardContent className="p-4 space-y-2 text-xs">
            <p className="font-semibold text-foreground">Riwayat Absen</p>
            {sesi.checkInAt && (
              <div className="flex items-center gap-2">
                <LogIn className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-muted-foreground">Masuk:</span>
                <span className="font-medium">
                  {formatTanggalSingkat(sesi.checkInAt)} ·{" "}
                  {formatJam(sesi.checkInAt)}
                </span>
                {sesi.terlambatMenit ? (
                  <span className="text-amber-600 dark:text-amber-400">
                    (telat {sesi.terlambatMenit} mnt)
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    (tepat waktu)
                  </span>
                )}
              </div>
            )}
            {sesi.checkOutAt && (
              <div className="flex items-center gap-2">
                <LogOut className="h-3.5 w-3.5 text-sky-600" />
                <span className="text-muted-foreground">Pulang:</span>
                <span className="font-medium">
                  {formatTanggalSingkat(sesi.checkOutAt)} ·{" "}
                  {formatJam(sesi.checkOutAt)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ---------- Camera capture component ----------
function CameraCapture({
  onCapture,
  fotoUrl,
  onClearPhoto,
  disabled,
}: {
  onCapture: (blob: Blob) => void
  fotoUrl: string | null
  onClearPhoto: () => void
  disabled?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [useFallback, setUseFallback] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Stop the camera stream
  const stopCamera = useCallback(() => {
    const stream = streamRef.current
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraOn(false)
  }, [])

  // Start the camera
  const startCamera = useCallback(async () => {
    setCameraError(null)
    setUseFallback(false)
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraError("Browser tidak mendukung kamera.")
      setUseFallback(true)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {
          /* autoplay can fail silently; srcObject is still set */
        })
      }
      setCameraOn(true)
    } catch (err: unknown) {
      const e = err as DOMException
      let msg = "Tidak dapat mengakses kamera."
      if (e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError") {
        msg = "Izin kamera ditolak. Gunakan unggah foto dari file."
      } else if (e?.name === "NotFoundError" || e?.name === "DevicesNotFoundError") {
        msg = "Kamera tidak ditemukan. Gunakan unggah foto dari file."
      } else if (e?.name === "NotReadableError") {
        msg = "Kamera sedang dipakai aplikasi lain."
      }
      setCameraError(msg)
      setUseFallback(true)
    }
  }, [])

  // Capture a frame to canvas -> blob
  const captureFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const w = video.videoWidth || 640
    const h = video.videoHeight || 480
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0, w, h)
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob)
      },
      "image/jpeg",
      0.85,
    )
  }, [onCapture])

  // Handle file input fallback
  const onFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (!file.type.startsWith("image/")) {
        toast.error("File harus berupa gambar.")
        return
      }
      onCapture(file)
      // reset so selecting same file again still triggers change
      e.target.value = ""
    },
    [onCapture],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const stream = streamRef.current
      if (stream) stream.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border bg-muted/30">
        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Live preview */}
        {cameraOn && !fotoUrl && (
          <div className="relative aspect-[4/3] w-full bg-black">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
            />
            <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-primary/40" />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-medium text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
              Live
            </span>
          </div>
        )}

        {/* Captured photo preview */}
        {fotoUrl && (
          <div className="relative aspect-[4/3] w-full bg-black">
            <img
              src={fotoUrl}
              alt="Foto absen"
              className="h-full w-full object-cover"
            />
            {!disabled && (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute right-2 top-2 h-8 w-8 rounded-full shadow"
                onClick={onClearPhoto}
                aria-label="Hapus foto"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <span className="absolute left-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-emerald-600/90 px-2 py-1 text-[10px] font-medium text-white">
              <CheckCircle2 className="h-3 w-3" />
              Foto siap dikirim
            </span>
          </div>
        )}

        {/* Placeholder when nothing is happening */}
        {!cameraOn && !fotoUrl && !useFallback && (
          <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <Camera className="h-10 w-10" />
            <p className="text-sm font-medium">Kamera belum dibuka</p>
            <p className="text-xs">
              Tekan tombol di bawah untuk mulai mengambil foto absen.
            </p>
          </div>
        )}

        {/* Fallback: file input prompt */}
        {!fotoUrl && useFallback && (
          <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 p-4 text-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">{cameraError || "Kamera tidak tersedia"}</p>
            <p className="text-xs text-muted-foreground">
              Anda bisa unggah foto dari galeri atau kamera perangkat.
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      {!fotoUrl && (
        <div className="flex flex-wrap gap-2">
          {!cameraOn && !useFallback && (
            <Button
              type="button"
              onClick={startCamera}
              disabled={disabled}
              className="flex-1"
            >
              <Camera className="mr-2 h-4 w-4" />
              Buka Kamera
            </Button>
          )}
          {cameraOn && (
            <>
              <Button
                type="button"
                onClick={captureFrame}
                disabled={disabled}
                className="flex-1"
              >
                <Camera className="mr-2 h-4 w-4" />
                Tangkap Foto
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={stopCamera}
                disabled={disabled}
              >
                Tutup Kamera
              </Button>
            </>
          )}
          {/* Always-available file input fallback */}
          {!cameraOn && (
            <Button
              type="button"
              variant={useFallback ? "default" : "outline"}
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="flex-1"
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              {useFallback ? "Pilih / Ambil Foto" : "Unggah dari File"}
            </Button>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={onFileSelected}
        disabled={disabled}
      />
    </div>
  )
}

// ============================================================
// SUB-VIEW 3: Notifikasi
// ============================================================
function NotifikasiView({ karyawanId }: { karyawanId: string }) {
  const qc = useQueryClient()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["notifikasi", karyawanId],
    queryFn: () =>
      apiFetch<Notifikasi[]>(`/api/notifikasi?karyawanId=${karyawanId}`),
    enabled: !!karyawanId,
  })

  const readM = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/notifikasi/${id}/read`, { method: "POST" }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["notifikasi", karyawanId] })
      const prev = qc.getQueryData<Notifikasi[]>([
        "notifikasi",
        karyawanId,
      ])
      if (prev) {
        qc.setQueryData<Notifikasi[]>(
          ["notifikasi", karyawanId],
          prev.map((n) => (n.id === id ? { ...n, dibaca: true } : n)),
        )
      }
      return { prev }
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(["notifikasi", karyawanId], ctx.prev)
      }
      toast.error("Gagal menandai notifikasi sebagai dibaca")
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["notifikasi", karyawanId] })
    },
  })

  const markAllRead = () => {
    const unread = (data ?? []).filter((n) => !n.dibaca)
    if (!unread.length) return
    unread.forEach((n) => readM.mutate(n.id))
    toast.success(`${unread.length} notifikasi ditandai dibaca`)
  }

  const unreadCount = (data ?? []).filter((n) => !n.dibaca).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionTitle icon={Bell} title="Notifikasi" />
        {unreadCount > 0 && (
          <Button size="sm" variant="ghost" onClick={markAllRead}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Tandai semua dibaca
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingState rows={5} />
      ) : isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Gagal memuat notifikasi"
          action={
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Coba lagi
            </Button>
          }
        />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Tidak ada notifikasi"
          description="Notifikasi jadwal baru, pembatalan, dan reminder akan muncul di sini."
        />
      ) : (
        <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
          {data.map((n) => (
            <NotifCard
              key={n.id}
              notif={n}
              onRead={() => !n.dibaca && readM.mutate(n.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function NotifCard({
  notif,
  onRead,
}: {
  notif: Notifikasi
  onRead: () => void
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onRead}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onRead()
        }
      }}
      className={cn(
        "cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        !notif.dibaca && "border-primary/30 bg-primary/[0.03]",
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {!notif.dibaca && (
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
              aria-label="Belum dibaca"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold leading-tight">
                {notif.judul}
              </p>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {relativeTime(notif.createdAt)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{notif.pesan}</p>
            <span className="mt-1.5 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {notif.tipe.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
