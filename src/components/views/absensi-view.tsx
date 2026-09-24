"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api-client"
import {
  PageHeader,
  StatCard,
  StatusAbsensiBadge,
  LoadingState,
  EmptyState,
} from "@/components/shared/ui"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { formatJam, formatTanggal, formatTanggalSingkat } from "@/lib/constants"
import { haversineDistance, formatDateKey } from "@/lib/schedule"
import { toast } from "sonner"
import {
  Clock,
  MapPin,
  LogIn,
  LogOut,
  Calendar as CalendarIcon,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  User,
} from "lucide-react"

// ---------- Types ----------
type Pengaturan = {
  id: string
  kantorLat: number
  kantorLng: number
  kantorRadiusMeter: number
  jamMasukFixed: string
  jamPulangFixed: string
  toleransiTerlambatMenit: number
  checkInWindowMin: number
  checkInWindowMax: number
  namaPerusahaan: string
}

type Karyawan = {
  id: string
  nama: string
  email: string
  telepon: string | null
  tipe: string
  gajiPokok: number
  status: string
  alamat: string | null
}

type Absensi = {
  id: string
  karyawanId: string
  tanggal: string
  jamMasuk: string | null
  jamPulang: string | null
  status: string
  terlambatMenit: number | null
  pulangCepatMenit: number | null
  gpsMasukLat: number | null
  gpsMasukLng: number | null
  gpsPulangLat: number | null
  gpsPulangLng: number | null
  karyawan?: Karyawan
}

// ---------- Helpers ----------
function todayKey(): string {
  return formatDateKey(new Date())
}

function toDateKey(d: Date): string {
  return formatDateKey(d)
}

// ---------- Main View ----------
export function AbsensiView() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Absensi"
        description="Absen masuk/pulang staf fixed-time berbasis GPS & rekap harian"
        icon={Clock}
      />
      <Tabs defaultValue="absen" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="absen" className="flex-1 sm:flex-none">
            <LogIn className="h-4 w-4" />
            Absen Sekarang
          </TabsTrigger>
          <TabsTrigger value="rekap" className="flex-1 sm:flex-none">
            <CalendarIcon className="h-4 w-4" />
            Rekap Harian
          </TabsTrigger>
        </TabsList>
        <TabsContent value="absen" className="mt-4">
          <AbsenSekarangTab />
        </TabsContent>
        <TabsContent value="rekap" className="mt-4">
          <RekapHarianTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// =========================
// TAB 1: Absen Sekarang
// =========================
function AbsenSekarangTab() {
  const qc = useQueryClient()
  const today = todayKey()

  // --- Fetch settings ---
  const { data: pengaturan, isLoading: loadingSet } = useQuery({
    queryKey: ["pengaturan"],
    queryFn: () => apiFetch<Pengaturan>("/api/pengaturan"),
  })

  // --- Fetch FIXED karyawan ---
  const { data: karyawanList, isLoading: loadingKaryawan } = useQuery({
    queryKey: ["karyawan", "FIXED"],
    queryFn: () =>
      apiFetch<Karyawan[]>("/api/karyawan?tipe=FIXED&status=AKTIF"),
  })

  const [selectedKaryawanId, setSelectedKaryawanId] = useState<string>("")
  // Derive the effective selection: user choice, otherwise default to first karyawan
  const effectiveKaryawanId =
    selectedKaryawanId || karyawanList?.[0]?.id || ""

  // --- Geolocation state ---
  const [geoState, setGeoState] = useState<{
    status: "idle" | "loading" | "success" | "error"
    lat: number | null
    lng: number | null
    error: string | null
    source: "gps" | "manual" | "fallback" | null
  }>({ status: "idle", lat: null, lng: null, error: null, source: null })

  // Manual fallback inputs
  const [manualLat, setManualLat] = useState<string>("")
  const [manualLng, setManualLng] = useState<string>("")

  const detectLocation = () => {
    if (!navigator.geolocation) {
      if (pengaturan) {
        setGeoState({
          status: "success",
          lat: pengaturan.kantorLat,
          lng: pengaturan.kantorLng,
          error: "Geolokasi tidak didukung browser. Memakai koordinat kantor.",
          source: "fallback",
        })
        setManualLat(String(pengaturan.kantorLat))
        setManualLng(String(pengaturan.kantorLng))
        toast.info("Geolokasi tidak didukung — memakai koordinat kantor")
      } else {
        setGeoState({
          status: "error",
          lat: null,
          lng: null,
          error: "Geolokasi tidak didukung browser ini.",
          source: null,
        })
        toast.error("Geolokasi tidak didukung browser")
      }
      return
    }
    setGeoState((s) => ({ ...s, status: "loading", error: null }))
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setGeoState({ status: "success", lat, lng, error: null, source: "gps" })
        setManualLat(String(lat))
        setManualLng(String(lng))
        toast.success("Lokasi berhasil dideteksi")
      },
      (err) => {
        // On permission denied or timeout, fall back to office coords
        if (pengaturan) {
          setGeoState({
            status: "success",
            lat: pengaturan.kantorLat,
            lng: pengaturan.kantorLng,
            error: `${err.message}. Memakai koordinat kantor sebagai fallback.`,
            source: "fallback",
          })
          setManualLat(String(pengaturan.kantorLat))
          setManualLng(String(pengaturan.kantorLng))
          toast.warning(`Gagal deteksi GPS — memakai koordinat kantor`)
        } else {
          setGeoState({
            status: "error",
            lat: null,
            lng: null,
            error: err.message,
            source: null,
          })
          toast.error(err.message)
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    )
  }

  // --- Distance & radius check (client-side preview) ---
  const distanceMeter = useMemo(() => {
    if (
      geoState.lat == null ||
      geoState.lng == null ||
      !pengaturan
    )
      return null
    return haversineDistance(
      geoState.lat,
      geoState.lng,
      pengaturan.kantorLat,
      pengaturan.kantorLng,
    )
  }, [geoState.lat, geoState.lng, pengaturan])

  const withinRadius =
    distanceMeter != null && pengaturan
      ? distanceMeter <= pengaturan.kantorRadiusMeter
      : false

  const applyManualCoords = () => {
    const lat = parseFloat(manualLat)
    const lng = parseFloat(manualLng)
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      toast.error("Koordinat tidak valid")
      return
    }
    setGeoState({
      status: "success",
      lat,
      lng,
      error: null,
      source: "manual",
    })
    toast.success("Koordinat manual diterapkan")
  }

  // --- Today's existing attendance for selected karyawan ---
  const { data: todayAbsensi, isLoading: loadingToday } = useQuery({
    queryKey: ["absensi", "today", effectiveKaryawanId, today],
    queryFn: () =>
      apiFetch<Absensi[]>(
        `/api/absensi?karyawanId=${encodeURIComponent(
          effectiveKaryawanId,
        )}&tanggal=${today}`,
      ),
    enabled: !!effectiveKaryawanId,
  })
  const todayRecord = todayAbsensi?.[0] ?? null

  // --- Mutations ---
  const checkInMut = useMutation({
    mutationFn: (payload: { karyawanId: string; lat: number; lng: number }) =>
      apiFetch<{ absensi: Absensi; isLate: boolean; terlambatMenit: number | null }>(
        "/api/absensi/check-in",
        { method: "POST", body: JSON.stringify(payload) },
      ),
    onSuccess: (res) => {
      if (res.isLate) {
        toast.warning(
          `Berhasil absen masuk — terlambat ${res.terlambatMenit ?? 0} menit`,
        )
      } else {
        toast.success("Berhasil absen masuk — tepat waktu")
      }
      qc.invalidateQueries({ queryKey: ["absensi"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const checkOutMut = useMutation({
    mutationFn: (payload: { karyawanId: string; lat: number; lng: number }) =>
      apiFetch<{ absensi: Absensi; pulangCepat: number }>(
        "/api/absensi/check-out",
        { method: "POST", body: JSON.stringify(payload) },
      ),
    onSuccess: (res) => {
      if (res.pulangCepat > 0) {
        toast.warning(
          `Berhasil absen pulang — pulang cepat ${res.pulangCepat} menit`,
        )
      } else {
        toast.success("Berhasil absen pulang")
      }
      qc.invalidateQueries({ queryKey: ["absensi"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const canCheckIn =
    !!effectiveKaryawanId &&
    geoState.lat != null &&
    geoState.lng != null &&
    withinRadius &&
    !todayRecord?.jamMasuk &&
    !checkInMut.isPending

  const canCheckOut =
    !!effectiveKaryawanId &&
    geoState.lat != null &&
    geoState.lng != null &&
    withinRadius &&
    !!todayRecord?.jamMasuk &&
    !todayRecord?.jamPulang &&
    !checkOutMut.isPending

  const handleCheckIn = () => {
    if (!effectiveKaryawanId || geoState.lat == null || geoState.lng == null) return
    checkInMut.mutate({
      karyawanId: effectiveKaryawanId,
      lat: geoState.lat,
      lng: geoState.lng,
    })
  }
  const handleCheckOut = () => {
    if (!effectiveKaryawanId || geoState.lat == null || geoState.lng == null) return
    checkOutMut.mutate({
      karyawanId: effectiveKaryawanId,
      lat: geoState.lat,
      lng: geoState.lng,
    })
  }

  if (loadingSet || loadingKaryawan) {
    return (
      <div className="space-y-4">
        <LoadingState rows={3} />
      </div>
    )
  }

  if (!karyawanList || karyawanList.length === 0) {
    return (
      <EmptyState
        icon={User}
        title="Belum ada karyawan fixed-time"
        description="Tambahkan karyawan tipe FIXED sebelum menggunakan absensi GPS."
      />
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Left: Action Panel */}
      <div className="space-y-4 lg:col-span-2">
        {/* Today info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarIcon className="h-4 w-4 text-primary" />
              {formatTanggal(new Date())}
            </CardTitle>
            <CardDescription>
              {pengaturan?.namaPerusahaan} — Jam Kerja{" "}
              <span className="font-medium text-foreground">
                {pengaturan?.jamMasukFixed} - {pengaturan?.jamPulangFixed}
              </span>{" "}
              WIB · Radius{" "}
              <span className="font-medium text-foreground">
                {pengaturan?.kantorRadiusMeter} m
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Karyawan selector */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Pilih Karyawan (simulasi absen admin)
              </Label>
              <Select
                value={effectiveKaryawanId}
                onValueChange={setSelectedKaryawanId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih karyawan fixed-time" />
                </SelectTrigger>
                <SelectContent>
                  {karyawanList.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Geolocation */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Lokasi GPS Saat Ini
              </Label>
              <Button
                type="button"
                variant="outline"
                onClick={detectLocation}
                disabled={geoState.status === "loading"}
                className="w-full justify-start"
              >
                <Navigation
                  className={cn(
                    "h-4 w-4",
                    geoState.status === "loading" && "animate-spin",
                  )}
                />
                {geoState.status === "loading"
                  ? "Mendeteksi lokasi..."
                  : "Deteksi Lokasi Saya"}
              </Button>

              {geoState.status === "success" &&
                geoState.lat != null &&
                geoState.lng != null &&
                pengaturan && (
                  <div
                    className={cn(
                      "rounded-lg border p-3 text-sm",
                      withinRadius
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-rose-500/30 bg-rose-500/5",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {withinRadius ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-4 w-4 text-rose-600" />
                      )}
                      <div className="min-w-0 flex-1 space-y-1">
                        <p
                          className={cn(
                            "font-medium",
                            withinRadius
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-rose-700 dark:text-rose-300",
                          )}
                        >
                          {withinRadius
                            ? `Di dalam radius kantor`
                            : `Di luar radius kantor`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Lat {geoState.lat.toFixed(6)}, Lng{" "}
                          {geoState.lng.toFixed(6)} · Jarak ke kantor{" "}
                          <span className="font-medium">
                            {distanceMeter} m
                          </span>{" "}
                          (maks {pengaturan.kantorRadiusMeter} m)
                        </p>
                        {geoState.source === "fallback" && geoState.error && (
                          <p className="text-xs text-amber-600">
                            {geoState.error}
                          </p>
                        )}
                        {geoState.source === "manual" && (
                          <p className="text-xs text-sky-600">
                            Memakai koordinat manual.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              {geoState.status === "error" && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Gagal mendeteksi lokasi</AlertTitle>
                  <AlertDescription>
                    {geoState.error ||
                      "Izinkan akses lokasi atau gunakan input manual di bawah."}
                  </AlertDescription>
                </Alert>
              )}

              {/* Manual fallback */}
              <div className="rounded-lg border border-dashed p-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  Fallback: input koordinat manual (untuk demo / jika GPS diblokir)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="manual-lat" className="text-[11px]">
                      Latitude
                    </Label>
                    <Input
                      id="manual-lat"
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={manualLat}
                      onChange={(e) => setManualLat(e.target.value)}
                      placeholder={String(pengaturan?.kantorLat ?? "")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="manual-lng" className="text-[11px]">
                      Longitude
                    </Label>
                    <Input
                      id="manual-lng"
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={manualLng}
                      onChange={(e) => setManualLng(e.target.value)}
                      placeholder={String(pengaturan?.kantorLng ?? "")}
                    />
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={applyManualCoords}
                  >
                    <MapPin className="h-3.5 w-3.5" /> Terapkan Koordinat
                  </Button>
                  {pengaturan && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setManualLat(String(pengaturan.kantorLat))
                        setManualLng(String(pengaturan.kantorLng))
                        setGeoState({
                          status: "success",
                          lat: pengaturan.kantorLat,
                          lng: pengaturan.kantorLng,
                          error: "Memakai koordinat kantor (fallback demo).",
                          source: "fallback",
                        })
                        toast.info("Memakai koordinat kantor")
                      }}
                    >
                      Pakai Koordinat Kantor
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                size="lg"
                className="h-12 bg-emerald-600 text-white hover:bg-emerald-700"
                disabled={!canCheckIn}
                onClick={handleCheckIn}
              >
                <LogIn className="h-5 w-5" />
                Absen Masuk
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-rose-500/40 text-rose-600 hover:bg-rose-500/10"
                disabled={!canCheckOut}
                onClick={handleCheckOut}
              >
                <LogOut className="h-5 w-5" />
                Absen Pulang
              </Button>
            </div>

            {/* Reasons when disabled */}
            {effectiveKaryawanId && !withinRadius && geoState.lat != null && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Lokasi belum valid</AlertTitle>
                <AlertDescription>
                  Pindahkan ke dalam radius kantor atau pakai koordinat kantor
                  untuk demo.
                </AlertDescription>
              </Alert>
            )}
            {effectiveKaryawanId &&
              todayRecord?.jamMasuk &&
              todayRecord?.jamPulang && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertTitle>Absensi hari ini sudah lengkap</AlertTitle>
                  <AlertDescription>
                    Karyawan ini sudah absen masuk dan pulang hari ini.
                  </AlertDescription>
                </Alert>
              )}
          </CardContent>
        </Card>
      </div>

      {/* Right: Today's record */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Status Absen Hari Ini</CardTitle>
            <CardDescription>
              {effectiveKaryawanId
                ? "Catatan absensi untuk karyawan terpilih"
                : "Pilih karyawan terlebih dahulu"}
          </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingToday ? (
              <LoadingState rows={2} />
            ) : todayRecord ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <StatusAbsensiBadge status={todayRecord.status} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <LogIn className="h-3.5 w-3.5" /> Masuk
                    </div>
                    <p className="mt-1 text-sm font-semibold">
                      {todayRecord.jamMasuk
                        ? formatJam(todayRecord.jamMasuk)
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <LogOut className="h-3.5 w-3.5" /> Pulang
                    </div>
                    <p className="mt-1 text-sm font-semibold">
                      {todayRecord.jamPulang
                        ? formatJam(todayRecord.jamPulang)
                        : "—"}
                    </p>
                  </div>
                </div>
                {todayRecord.terlambatMenit ? (
                  <div className="flex items-center gap-2 text-xs text-amber-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Terlambat {todayRecord.terlambatMenit} menit
                  </div>
                ) : null}
                {todayRecord.pulangCepatMenit ? (
                  <div className="flex items-center gap-2 text-xs text-amber-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Pulang cepat {todayRecord.pulangCepatMenit} menit
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState
                icon={Clock}
                title="Belum absen"
                description="Karyawan ini belum melakukan absen masuk hari ini."
              />
            )}
          </CardContent>
        </Card>

        {/* Office info */}
        {pengaturan && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Lokasi Kantor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Latitude</span>
                <span className="font-medium">
                  {pengaturan.kantorLat.toFixed(6)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Longitude</span>
                <span className="font-medium">
                  {pengaturan.kantorLng.toFixed(6)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Radius</span>
                <span className="font-medium">
                  {pengaturan.kantorRadiusMeter} m
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Toleransi Terlambat</span>
                <span className="font-medium">
                  {pengaturan.toleransiTerlambatMenit} menit
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// =========================
// TAB 2: Rekap Harian
// =========================
function RekapHarianTab() {
  const [date, setDate] = useState<Date>(new Date())
  const [open, setOpen] = useState(false)
  const dateKey = toDateKey(date)

  const { data: karyawanList, isLoading: loadingKaryawan } = useQuery({
    queryKey: ["karyawan", "FIXED", "all"],
    queryFn: () => apiFetch<Karyawan[]>("/api/karyawan?tipe=FIXED"),
  })

  const { data: absensiList, isLoading: loadingAbsensi } = useQuery({
    queryKey: ["absensi", "tanggal", dateKey],
    queryFn: () =>
      apiFetch<Absensi[]>(`/api/absensi?tanggal=${dateKey}`),
  })

  // Build a map karyawanId -> absensi record for selected date
  const absensiByKaryawan = useMemo(() => {
    const map = new Map<string, Absensi>()
    if (absensiList) {
      for (const a of absensiList) {
        if (a.karyawanId) map.set(a.karyawanId, a)
      }
    }
    return map
  }, [absensiList])

  // Merge karyawan with their attendance for the date
  const rows = useMemo(() => {
    if (!karyawanList) return []
    return karyawanList.map((k) => {
      const a = absensiByKaryawan.get(k.id)
      return { karyawan: k, absensi: a ?? null }
    })
  }, [karyawanList, absensiByKaryawan])

  // Summary counts
  const summary = useMemo(() => {
    let hadir = 0
    let terlambat = 0
    let tidakHadir = 0
    let cuti = 0
    for (const r of rows) {
      if (!r.absensi || !r.absensi.jamMasuk) {
        // No record at all → treat as Tidak Hadir (for fixed staff on workdays)
        tidakHadir++
      } else if (r.absensi.status === "HADIR") {
        hadir++
      } else if (r.absensi.status === "TERLAMBAT") {
        terlambat++
      } else if (r.absensi.status === "CUTI") {
        cuti++
      } else if (r.absensi.status === "LIBUR") {
        // skip
      } else {
        tidakHadir++
      }
    }
    return { hadir, terlambat, tidakHadir, cuti }
  }, [rows])

  const isLoading = loadingKaryawan || loadingAbsensi

  return (
    <div className="space-y-4">
      {/* Date picker */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start">
                <CalendarIcon className="h-4 w-4" />
                {formatTanggal(date)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d: Date | undefined) => {
                  if (d) {
                    setDate(d)
                    setOpen(false)
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <p className="text-xs text-muted-foreground">
          {karyawanList?.length ?? 0} karyawan fixed-time
        </p>
      </div>

      {/* Summary StatCards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Hadir"
          value={summary.hadir}
          icon={CheckCircle2}
          accent="emerald"
          hint="tepat waktu"
        />
        <StatCard
          label="Terlambat"
          value={summary.terlambat}
          icon={AlertTriangle}
          accent="amber"
          hint="masuk setelah jam + toleransi"
        />
        <StatCard
          label="Tidak Hadir"
          value={summary.tidakHadir}
          icon={LogOut}
          accent="rose"
          hint="tanpa record absen"
        />
        <StatCard
          label="Cuti"
          value={summary.cuti}
          icon={CalendarIcon}
          accent="sky"
          hint="cuti disetujui"
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Rekap Absensi · {formatTanggalSingkat(date)}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">
              <LoadingState rows={6} />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={User}
                title="Belum ada karyawan fixed-time"
                description="Tambahkan karyawan tipe FIXED terlebih dahulu."
              />
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Karyawan</TableHead>
                    <TableHead>Masuk</TableHead>
                    <TableHead>Pulang</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-4 text-right">Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const a = r.absensi
                    return (
                      <TableRow key={r.karyawan.id}>
                        <TableCell className="pl-4">
                          <div className="font-medium">{r.karyawan.nama}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {r.karyawan.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          {a?.jamMasuk ? (
                            <span className="font-mono text-sm">
                              {formatJam(a.jamMasuk)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {a?.jamPulang ? (
                            <span className="font-mono text-sm">
                              {formatJam(a.jamPulang)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {a?.status ? (
                            <StatusAbsensiBadge status={a.status} />
                          ) : (
                            <StatusAbsensiBadge status="TIDAK_HADIR" />
                          )}
                        </TableCell>
                        <TableCell className="pr-4 text-right text-xs">
                          {a?.terlambatMenit ? (
                            <span className="text-amber-600">
                              terlambat {a.terlambatMenit} mnt
                            </span>
                          ) : a?.pulangCepatMenit ? (
                            <span className="text-amber-600">
                              pulang cepat {a.pulangCepatMenit} mnt
                            </span>
                          ) : a?.jamMasuk ? (
                            <span className="text-emerald-600">tepat waktu</span>
                          ) : (
                            <span className="text-muted-foreground">
                              tanpa record
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
