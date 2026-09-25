"use client"

import { useAppStore } from "@/store/app-store"
import { apiFetch, clearSession } from "@/lib/api-client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatRupiah, formatTanggal, formatTanggalSingkat, formatJam, NAMA_BULAN } from "@/lib/constants"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  CalendarDays, FileText, Wallet, Bell, LogOut,
  CheckCircle2, XCircle, Clock, Minus, AlertCircle,
  GraduationCap, ChevronRight,
} from "lucide-react"
import { useState } from "react"

// ─── types ────────────────────────────────────────────────────────────────────

type Absensi = {
  id: string; tanggal: string; status: string
  jamMasuk: string | null; jamPulang: string | null
  terlambatMenit: number | null; pulangCepatMenit: number | null
}

type Cuti = {
  id: string; tanggalMulai: string; tanggalSelesai: string
  alasan: string; status: string; createdAt: string
}

type RekapGaji = {
  id: string; tipe: string; gajiPokok: number; totalHonor: number
  totalPotongan: number; totalGaji: number
  jumlahHadir: number; jumlahTerlambat: number; jumlahTidakHadir: number
  periodeGaji: { bulan: number; tahun: number; status: string }
}

type Notifikasi = { id: string; tipe: string; judul: string; pesan: string; dibaca: boolean; createdAt: string }

// ─── helpers ──────────────────────────────────────────────────────────────────

function StatusAbsensiBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    HADIR:       { label: "Hadir",       className: "bg-green-100 text-green-700" },
    TERLAMBAT:   { label: "Terlambat",   className: "bg-yellow-100 text-yellow-700" },
    TIDAK_HADIR: { label: "Tidak Hadir", className: "bg-red-100 text-red-700" },
    CUTI:        { label: "Cuti",        className: "bg-blue-100 text-blue-700" },
    LIBUR:       { label: "Libur",       className: "bg-gray-100 text-gray-500" },
  }
  const s = map[status] ?? { label: status, className: "bg-gray-100 text-gray-500" }
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}>{s.label}</span>
}

function StatusCutiBadge({ status }: { status: string }) {
  if (status === "APPROVED") return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Disetujui</Badge>
  if (status === "REJECTED") return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Ditolak</Badge>
  return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Menunggu</Badge>
}

// ─── sub-views ────────────────────────────────────────────────────────────────

function KehadiranView({ karyawanId }: { karyawanId: string }) {
  const [bulan, setBulan] = useState(new Date().getMonth() + 1)
  const [tahun, setTahun] = useState(new Date().getFullYear())

  const { data, isLoading } = useQuery({
    queryKey: ["absensi-karyawan", karyawanId, bulan, tahun],
    queryFn: () => apiFetch<Absensi[]>(`/api/absensi?karyawanId=${karyawanId}&bulan=${bulan}&tahun=${tahun}`),
  })

  const hadir   = data?.filter((a) => a.status === "HADIR").length ?? 0
  const terlambat = data?.filter((a) => a.status === "TERLAMBAT").length ?? 0
  const absen   = data?.filter((a) => a.status === "TIDAK_HADIR").length ?? 0

  return (
    <div className="space-y-4">
      {/* filter */}
      <div className="flex gap-2">
        <select
          value={bulan}
          onChange={(e) => setBulan(Number(e.target.value))}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          {NAMA_BULAN.map((n, i) => <option key={i} value={i + 1}>{n}</option>)}
        </select>
        <select
          value={tahun}
          onChange={(e) => setTahun(Number(e.target.value))}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          {[2023,2024,2025,2026].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Hadir", value: hadir, color: "text-green-600" },
          { label: "Terlambat", value: terlambat, color: "text-yellow-600" },
          { label: "Tidak Hadir", value: absen, color: "text-red-600" },
        ].map((s) => (
          <Card key={s.label} className="text-center">
            <CardContent className="py-3">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* list */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-14 rounded-lg"/>)}</div>
      ) : !data?.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada data kehadiran.</p>
      ) : (
        <div className="space-y-2">
          {data.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border bg-background p-3">
              <div>
                <p className="text-sm font-medium">{formatTanggalSingkat(a.tanggal)}</p>
                {a.jamMasuk && (
                  <p className="text-xs text-muted-foreground">
                    {formatJam(a.jamMasuk)} – {a.jamPulang ? formatJam(a.jamPulang) : "–"}
                    {a.terlambatMenit ? ` · Terlambat ${a.terlambatMenit} mnt` : ""}
                  </p>
                )}
              </div>
              <StatusAbsensiBadge status={a.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CutiView({ karyawanId }: { karyawanId: string }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ tanggalMulai: "", tanggalSelesai: "", alasan: "" })
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["cuti-karyawan", karyawanId],
    queryFn: () => apiFetch<Cuti[]>(`/api/cuti?karyawanId=${karyawanId}`),
  })

  const submit = useMutation({
    mutationFn: () =>
      apiFetch("/api/cuti", {
        method: "POST",
        body: JSON.stringify({ ...form, karyawanId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cuti-karyawan", karyawanId] })
      setForm({ tanggalMulai: "", tanggalSelesai: "", alasan: "" })
      setShowForm(false)
    },
  })

  return (
    <div className="space-y-4">
      <Button size="sm" onClick={() => setShowForm((v) => !v)} className="w-full">
        {showForm ? "Batal" : "+ Ajukan Cuti"}
      </Button>

      {showForm && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tanggal Mulai</Label>
                <input type="date" value={form.tanggalMulai} onChange={(e)=>setForm(f=>({...f,tanggalMulai:e.target.value}))}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tanggal Selesai</Label>
                <input type="date" value={form.tanggalSelesai} onChange={(e)=>setForm(f=>({...f,tanggalSelesai:e.target.value}))}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Alasan</Label>
              <Textarea value={form.alasan} onChange={(e)=>setForm(f=>({...f,alasan:e.target.value}))} rows={2} placeholder="Alasan pengajuan cuti…" />
            </div>
            {submit.isError && <p className="text-xs text-destructive">{(submit.error as Error)?.message}</p>}
            <Button size="sm" onClick={() => submit.mutate()} disabled={submit.isPending || !form.tanggalMulai || !form.alasan} className="w-full">
              {submit.isPending ? "Mengajukan…" : "Kirim Pengajuan"}
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-2">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-16 rounded-lg"/>)}</div>
      ) : !data?.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Belum ada pengajuan cuti.</p>
      ) : (
        <div className="space-y-2">
          {data.map((c) => (
            <div key={c.id} className="rounded-lg border bg-background p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.alasan}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTanggalSingkat(c.tanggalMulai)} – {formatTanggalSingkat(c.tanggalSelesai)}
                  </p>
                </div>
                <StatusCutiBadge status={c.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SlipGajiView({ karyawanId }: { karyawanId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["rekap-gaji-karyawan", karyawanId],
    queryFn: () => apiFetch<RekapGaji[]>(`/api/payroll/rekap?karyawanId=${karyawanId}`),
  })

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="space-y-2">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-20 rounded-lg"/>)}</div>
      ) : !data?.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Belum ada data slip gaji.</p>
      ) : (
        data.map((r) => (
          <Card key={r.id}>
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="flex items-center justify-between text-sm">
                <span>{NAMA_BULAN[r.periodeGaji.bulan - 1]} {r.periodeGaji.tahun}</span>
                <Badge variant={r.periodeGaji.status === "TERKUNCI" ? "default" : "outline"} className="text-xs">
                  {r.periodeGaji.status === "TERKUNCI" ? "Terkunci" : "Draft"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pb-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {r.tipe === "FIXED" ? (
                  <div className="flex justify-between col-span-2">
                    <span className="text-muted-foreground">Gaji Pokok</span>
                    <span>{formatRupiah(r.gajiPokok)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between col-span-2">
                    <span className="text-muted-foreground">Total Honor Sesi</span>
                    <span>{formatRupiah(r.totalHonor)}</span>
                  </div>
                )}
                {r.totalPotongan > 0 && (
                  <div className="flex justify-between col-span-2 text-red-600">
                    <span>Potongan</span>
                    <span>- {formatRupiah(r.totalPotongan)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-xs font-medium">Total Gaji</span>
                <span className="font-bold text-primary">{formatRupiah(r.totalGaji)}</span>
              </div>
              {r.tipe === "FIXED" && (
                <p className="text-xs text-muted-foreground">
                  Hadir {r.jumlahHadir} hari · Terlambat {r.jumlahTerlambat} · Absen {r.jumlahTidakHadir}
                </p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

function NotifikasiKaryawanView({ karyawanId }: { karyawanId: string }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["notifikasi", karyawanId],
    queryFn: () => apiFetch<Notifikasi[]>(`/api/notifikasi?karyawanId=${karyawanId}`),
  })

  const markRead = async (id: string) => {
    await apiFetch(`/api/notifikasi/${id}/read`, { method: "POST" })
    qc.invalidateQueries({ queryKey: ["notifikasi", karyawanId] })
  }

  return (
    <div className="space-y-2">
      {isLoading ? (
        <div className="space-y-2">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-14 rounded-lg"/>)}</div>
      ) : !data?.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada notifikasi.</p>
      ) : (
        data.map((n) => (
          <button
            key={n.id}
            onClick={() => !n.dibaca && markRead(n.id)}
            className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 ${n.dibaca ? "opacity-60" : "border-primary/30 bg-primary/5"}`}
          >
            <div className="flex items-start gap-2">
              {!n.dibaca && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              <div className={!n.dibaca ? "" : "ml-4"}>
                <p className="text-sm font-medium">{n.judul}</p>
                <p className="text-xs text-muted-foreground">{n.pesan}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatTanggalSingkat(n.createdAt)}</p>
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  )
}

// ─── main portal ──────────────────────────────────────────────────────────────

export function KaryawanPortalView() {
  const { karyawanView, setKaryawanView, session, logout } = useAppStore()

  const karyawanId = session?.karyawanId ?? ""

  const { data: notifs } = useQuery({
    queryKey: ["notifikasi", karyawanId],
    queryFn: () => apiFetch<Notifikasi[]>(`/api/notifikasi?karyawanId=${karyawanId}`),
    enabled: !!karyawanId,
  })
  const unread = notifs?.filter((n) => !n.dibaca).length ?? 0

  const tabs = [
    { key: "kehadiran",  label: "Kehadiran",  icon: CalendarDays },
    { key: "cuti",       label: "Cuti",       icon: FileText },
    { key: "slip-gaji",  label: "Slip Gaji",  icon: Wallet },
    { key: "notifikasi", label: "Notif",      icon: Bell, badge: unread },
  ] as const

  function handleLogout() {
    clearSession()
    logout()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">{session?.nama}</p>
            <p className="text-xs text-muted-foreground">Staf · Fixed</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-muted-foreground">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Keluar</span>
        </Button>
      </header>

      {/* content */}
      <main className="mx-auto max-w-lg px-4 pb-24 pt-5">
        {karyawanView === "kehadiran"  && <KehadiranView  karyawanId={karyawanId} />}
        {karyawanView === "cuti"       && <CutiView       karyawanId={karyawanId} />}
        {karyawanView === "slip-gaji"  && <SlipGajiView   karyawanId={karyawanId} />}
        {karyawanView === "notifikasi" && <NotifikasiKaryawanView karyawanId={karyawanId} />}
      </main>

      {/* bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t bg-background">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = karyawanView === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setKaryawanView(tab.key as any)}
              className={`relative flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {"badge" in tab && tab.badge > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                    {tab.badge > 9 ? "9+" : tab.badge}
                  </span>
                )}
              </div>
              <span>{tab.label}</span>
              {active && <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
