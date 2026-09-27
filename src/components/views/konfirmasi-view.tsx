"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api-client"
import {
  PageHeader,
  LoadingState,
  EmptyState,
  StatusSesiBadge,
  usePagination,
  PaginationBar,
} from "@/components/shared/ui"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Trash2,
  Clock,
  Camera,
  MapPin,
  Banknote,
  ShieldCheck,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import {
  formatJam,
  formatRupiah,
  formatTanggal,
  formatTanggalSingkat,
  TIPE_POTONGAN,
  type TipePotongan,
} from "@/lib/constants"
import { hitungHonorSesi } from "@/lib/schedule"

// ---------- Types ----------
type Karyawan = { id: string; nama: string; tipe: string }
type Program = { id: string; nama: string; warna: string | null }
type Siswa = { id: string; nama: string }
type PeriodeGaji = { id: string; bulan: number; tahun: number; status: string }

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
  tutor: Karyawan
  program: Program
  siswa: Siswa
}

type Absensi = {
  id: string
  tanggal: string
  status: string
  terlambatMenit: number | null
  karyawan: Karyawan
}

type Potongan = {
  id: string
  nominal: number
  alasan: string
  tipe: string
  createdAt: string
  absensiId: string | null
  sesiId: string | null
  periodeGajiId: string | null
  absensi: (Absensi & { karyawan: Karyawan }) | null
  sesi: (Sesi & { tutor: Karyawan }) | null
  periodeGaji: PeriodeGaji | null
}

// ---------- Inline helpers ----------
function diffMinutes(a: string | Date, b: string | Date): number {
  const da = typeof a === "string" ? new Date(a) : a
  const db = typeof b === "string" ? new Date(b) : b
  return Math.round((da.getTime() - db.getTime()) / 60000)
}

function formatPeriodeLabel(bulan: number, tahun: number): string {
  const nama = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ]
  return `${nama[bulan - 1]} ${tahun}`
}

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

// ---------- Main view ----------
export function KonfirmasiView() {
  const [tab, setTab] = useState("menunggu")

  return (
    <div className="space-y-5">
      <PageHeader
        title="Konfirmasi Sesi & Potongan"
        description="Tinjau sesi yang pulang lebih awal dan kelola potongan gaji karyawan"
        icon={ShieldCheck}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="menunggu" className="flex-1 sm:flex-none">
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
            Sesi Menunggu Konfirmasi
          </TabsTrigger>
          <TabsTrigger value="potongan" className="flex-1 sm:flex-none">
            <Banknote className="mr-1.5 h-3.5 w-3.5" />
            Input Potongan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="menunggu" className="mt-4">
          <SesiMenungguSection />
        </TabsContent>
        <TabsContent value="potongan" className="mt-4">
          <PotonganSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ================= SECTION 1: Sesi Menunggu =================
function SesiMenungguSection() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["sesi", "menunggu-konfirmasi"],
    queryFn: () =>
      apiFetch<Sesi[]>("/api/sesi?status=MENUNGGU_KONFIRMASI"),
  })

  const [rejectId, setRejectId] = useState<string | null>(null)
  const PAGE_SIZE = 8
  const { paged: pagedSesi, page, totalPages, setPage } = usePagination(data ?? [], PAGE_SIZE)

  const approveMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/sesi/${id}/confirm`, {
        method: "POST",
        body: JSON.stringify({ action: "approve" }),
      }),
    onSuccess: () => {
      toast.success("Sesi disetujui. Honor akan dihitung.")
      qc.invalidateQueries({ queryKey: ["sesi", "menunggu-konfirmasi"] })
      qc.invalidateQueries({ queryKey: ["sesi"] })
    },
    onError: (e: any) => toast.error(e.message),
  })

  const rejectMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/sesi/${id}/confirm`, {
        method: "POST",
        body: JSON.stringify({ action: "reject" }),
      }),
    onSuccess: () => {
      toast.success("Sesi ditolak. Honor tidak dihitung.")
      qc.invalidateQueries({ queryKey: ["sesi", "menunggu-konfirmasi"] })
      qc.invalidateQueries({ queryKey: ["sesi"] })
      setRejectId(null)
    },
    onError: (e: any) => toast.error(e.message),
  })

  if (isLoading) return <LoadingState rows={4} />

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Tidak ada sesi menunggu konfirmasi"
        description="Semua sesi yang pulang lebih awal sudah ditinjau."
      />
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {data.length} sesi menunggu konfirmasi admin
      </p>
      <div className="space-y-3">
        {pagedSesi.map((s) => (
          <SesiMenungguCard
            key={s.id}
            sesi={s}
            onApprove={() => approveMut.mutate(s.id)}
            onReject={() => setRejectId(s.id)}
            approving={approveMut.isPending}
          />
        ))}
      </div>
      <PaginationBar page={page} totalPages={totalPages} total={data.length} pageSize={PAGE_SIZE} onPageChange={setPage} />

      <AlertDialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tolak sesi tanpa honor?</AlertDialogTitle>
            <AlertDialogDescription>
              Sesi akan ditandai selesai namun honor tidak dihitung untuk tutor.
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => rejectId && rejectMut.mutate(rejectId)}
            >
              {rejectMut.isPending ? "Menolak..." : "Tolak Sesi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SesiMenungguCard({
  sesi,
  onApprove,
  onReject,
  approving,
}: {
  sesi: Sesi
  onApprove: () => void
  onReject: () => void
  approving: boolean
}) {
  const jamMulai = new Date(sesi.jamMulai)
  const jamSelesai = new Date(sesi.jamSelesai)
  const honor = hitungHonorSesi(jamMulai, jamSelesai, sesi.tarifSnapshot)
  const earlyMin =
    sesi.checkOutAt && jamSelesai
      ? Math.max(0, diffMinutes(jamSelesai, sesi.checkOutAt))
      : 0

  return (
    <Card>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: sesi.program.warna || "#94a3b8" }}
                aria-hidden
              />
              <span className="font-medium">{sesi.program.nama}</span>
              <span className="text-muted-foreground">·</span>
              <span>{formatTanggal(sesi.tanggal)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatJam(jamMulai)} – {formatJam(jamSelesai)}
              </span>
              <span>
                Tutor: <span className="font-medium text-foreground">{sesi.tutor.nama}</span>
              </span>
              <span>
                Siswa: <span className="font-medium text-foreground">{sesi.siswa.nama}</span>
              </span>
            </div>
          </div>
          <StatusSesiBadge status={sesi.status} />
        </div>

        {/* Check-in / Check-out grid */}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {/* Check-in */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Camera className="h-3.5 w-3.5" /> CHECK-IN
            </div>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1 text-sm">
                <p>
                  {sesi.checkInAt ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatJam(sesi.checkInAt)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </p>
                {sesi.terlambatMenit ? (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3" />
                    Terlambat {sesi.terlambatMenit} mnt
                  </p>
                ) : (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Tepat waktu
                  </p>
                )}
                {sesi.checkInLat != null && sesi.checkInLng != null && (
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3" /> GPS tercatat
                  </p>
                )}
              </div>
              {sesi.checkInFoto && (
                <img
                  src={sesi.checkInFoto}
                  alt="Foto check-in"
                  className="h-16 w-16 rounded-md border object-cover"
                  width={80}
                  height={80}
                />
              )}
            </div>
          </div>

          {/* Check-out */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Camera className="h-3.5 w-3.5" /> CHECK-OUT
            </div>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1 text-sm">
                <p>
                  {sesi.checkOutAt ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatJam(sesi.checkOutAt)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </p>
                {earlyMin > 0 && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3" />
                    Lebih awal {earlyMin} menit dari jadwal
                  </p>
                )}
                {sesi.checkOutLat != null && sesi.checkOutLng != null && (
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3" /> GPS tercatat
                  </p>
                )}
              </div>
              {sesi.checkOutFoto && (
                <img
                  src={sesi.checkOutFoto}
                  alt="Foto check-out"
                  className="h-16 w-16 rounded-md border object-cover"
                  width={80}
                  height={80}
                />
              )}
            </div>
          </div>
        </div>

        {/* Honor + actions */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
          <div className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-[11px] text-muted-foreground">Honor yang akan dibayar</p>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                {formatRupiah(honor)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-800 dark:hover:bg-rose-950"
              onClick={onReject}
            >
              <XCircle className="mr-1.5 h-4 w-4" />
              Tolak (tanpa honor)
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={onApprove}
              disabled={approving}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              {approving ? "Menyetujui..." : "Setujui"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ================= SECTION 2: Input Potongan =================
function PotonganSection() {
  const qc = useQueryClient()

  // recent absensi (last 30 days)
  const { data: absensiList } = useQuery({
    queryKey: ["absensi", "recent-30d"],
    queryFn: () =>
      apiFetch<Absensi[]>(
        `/api/absensi?dari=${isoDaysAgo(30)}&sampai=${new Date().toISOString()}`,
      ),
  })

  // recent sesi (all)
  const { data: sesiList } = useQuery({
    queryKey: ["sesi", "all"],
    queryFn: () => apiFetch<Sesi[]>("/api/sesi"),
  })

  // periode gaji
  const { data: periodeList } = useQuery({
    queryKey: ["payroll", "periode"],
    queryFn: () => apiFetch<PeriodeGaji[]>("/api/payroll/periode"),
  })

  // existing potongan
  const { data: potonganList, isLoading } = useQuery({
    queryKey: ["potongan"],
    queryFn: () => apiFetch<Potongan[]>("/api/potongan"),
  })

  const [form, setForm] = useState({
    tipe: TIPE_POTONGAN.PER_KEJADIAN as TipePotongan,
    absensiId: "",
    sesiId: "",
    periodeGajiId: "",
    nominal: 0,
    alasan: "",
  })

  const createMut = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        nominal: form.nominal,
        alasan: form.alasan,
        tipe: form.tipe,
      }
      if (form.tipe === TIPE_POTONGAN.PER_KEJADIAN) {
        if (form.absensiId) payload.absensiId = form.absensiId
        if (form.sesiId) payload.sesiId = form.sesiId
      } else {
        if (form.periodeGajiId) payload.periodeGajiId = form.periodeGajiId
      }
      return apiFetch("/api/potongan", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => {
      toast.success("Potongan ditambahkan")
      qc.invalidateQueries({ queryKey: ["potongan"] })
      setForm({
        tipe: form.tipe,
        absensiId: "",
        sesiId: "",
        periodeGajiId: "",
        nominal: 0,
        alasan: "",
      })
    },
    onError: (e: any) => toast.error(e.message),
  })

  const delMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/potongan/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Potongan dihapus")
      qc.invalidateQueries({ queryKey: ["potongan"] })
    },
    onError: (e: any) => toast.error(e.message),
  })

  const isPerKejadian = form.tipe === TIPE_POTONGAN.PER_KEJADIAN

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* Form */}
      <Card className="lg:col-span-2">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Tambah Potongan</h3>
              <p className="text-xs text-muted-foreground">Potongan akan mengurangi gaji karyawan</p>
            </div>
          </div>

          {/* Tipe potongan */}
          <div className="space-y-1.5">
            <Label>Tipe Potongan</Label>
            <Select
              value={form.tipe}
              onValueChange={(v) =>
                setForm({
                  ...form,
                  tipe: v as TipePotongan,
                  absensiId: "",
                  sesiId: "",
                  periodeGajiId: "",
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TIPE_POTONGAN.PER_KEJADIAN}>
                  Per Kejadian (absensi/sesi)
                </SelectItem>
                <SelectItem value={TIPE_POTONGAN.PER_PERIODE}>
                  Per Periode (gaji bulanan)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isPerKejadian ? (
            <>
              <div className="space-y-1.5">
                <Label>Pilih Absensi (Fixed-time)</Label>
                <Select
                  value={form.absensiId}
                  onValueChange={(v) =>
                    setForm({ ...form, absensiId: v, sesiId: "" })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Cari absensi karyawan" />
                  </SelectTrigger>
                  <SelectContent>
                    {!absensiList || absensiList.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        Tidak ada absensi
                      </SelectItem>
                    ) : (
                      absensiList
                        .slice()
                        .reverse()
                        .slice(0, 60)
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.karyawan.nama} · {formatTanggalSingkat(a.tanggal)} · {a.status}
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                ATAU
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-1.5">
                <Label>Pilih Sesi (Flexible-time tutor)</Label>
                <Select
                  value={form.sesiId}
                  onValueChange={(v) =>
                    setForm({ ...form, sesiId: v, absensiId: "" })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Cari sesi tutor" />
                  </SelectTrigger>
                  <SelectContent>
                    {!sesiList || sesiList.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        Tidak ada sesi
                      </SelectItem>
                    ) : (
                      sesiList
                        .slice()
                        .reverse()
                        .slice(0, 60)
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.tutor.nama} · {s.program.nama} · {formatTanggalSingkat(s.jamMulai)}
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Hanya satu yang dapat dipilih.
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <Label>Periode Gaji</Label>
              <Select
                value={form.periodeGajiId}
                onValueChange={(v) => setForm({ ...form, periodeGajiId: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent>
                  {!periodeList || periodeList.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      Belum ada periode gaji
                    </SelectItem>
                  ) : (
                    periodeList.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {formatPeriodeLabel(p.bulan, p.tahun)} · {p.status}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Nominal */}
          <div className="space-y-1.5">
            <Label htmlFor="nominal">Nominal (Rp)</Label>
            <Input
              id="nominal"
              type="number"
              value={form.nominal || ""}
              onChange={(e) => setForm({ ...form, nominal: Number(e.target.value) })}
              placeholder="50000"
            />
            <p className="text-xs text-muted-foreground">
              Preview: <span className="font-semibold">{formatRupiah(form.nominal)}</span>
            </p>
          </div>

          {/* Alasan */}
          <div className="space-y-1.5">
            <Label htmlFor="alasan">Alasan</Label>
            <Textarea
              id="alasan"
              value={form.alasan}
              onChange={(e) => setForm({ ...form, alasan: e.target.value })}
              placeholder="mis. Terlambat 30 menit, pulang cepat, dll."
              rows={3}
            />
          </div>

          <Button
            className="w-full"
            disabled={
              createMut.isPending ||
              form.nominal <= 0 ||
              !form.alasan.trim() ||
              (isPerKejadian ? !form.absensiId && !form.sesiId : !form.periodeGajiId)
            }
            onClick={() => createMut.mutate()}
          >
            {createMut.isPending ? "Menyimpan..." : "Simpan Potongan"}
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="lg:col-span-3">
        <CardContent className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Daftar Potongan</h3>
          {isLoading ? (
            <LoadingState rows={4} />
          ) : !potonganList || potonganList.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title="Belum ada potongan"
              description="Tambahkan potongan menggunakan form di samping."
            />
          ) : (
            <div className="max-h-96 overflow-y-auto pr-1 konfirmasi-scroll">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan / Tutor</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead className="min-w-[160px]">Alasan</TableHead>
                    <TableHead className="text-right">Nominal</TableHead>
                    <TableHead>Dibuat</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {potonganList.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.absensi?.karyawan?.nama ||
                          p.sesi?.tutor?.nama ||
                          (p.periodeGaji
                            ? `Periode ${formatPeriodeLabel(p.periodeGaji.bulan, p.periodeGaji.tahun)}`
                            : "—")}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium " +
                            (p.tipe === TIPE_POTONGAN.PER_KEJADIAN
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                              : "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300")
                          }
                        >
                          {p.tipe === TIPE_POTONGAN.PER_KEJADIAN ? "Per Kejadian" : "Per Periode"}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                        {p.alasan}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-rose-600 dark:text-rose-400">
                        -{formatRupiah(p.nominal)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatTanggalSingkat(p.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
                          onClick={() => delMut.mutate(p.id)}
                          disabled={delMut.isPending}
                          aria-label="Hapus potongan"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
