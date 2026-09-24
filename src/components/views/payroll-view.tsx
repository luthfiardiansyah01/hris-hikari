"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api-client"
import {
  PageHeader,
  StatCard,
  StatusPeriodeBadge,
  TipeKaryawanBadge,
  EmptyState,
  LoadingState,
} from "@/components/shared/ui"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Wallet,
  Plus,
  Lock,
  Unlock,
  Calculator,
  FileText,
  Calendar,
  Banknote,
  AlertTriangle,
  Users,
  Trash2,
  ListChecks,
} from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  formatRupiah,
  NAMA_BULAN,
  STATUS_PERIODE,
  TIPE_KARYAWAN,
} from "@/lib/constants"

// ---------- Types ----------
type Karyawan = {
  id: string
  nama: string
  tipe: string
}

type RekapGaji = {
  id: string
  periodeGajiId: string
  karyawanId: string
  tipe: string
  gajiPokok: number
  totalHonor: number
  totalPotongan: number
  totalGaji: number
  jumlahHadir: number
  jumlahTerlambat: number
  jumlahTidakHadir: number
  jumlahSesi: number
  jumlahSesiDibatalkan: number
  karyawan?: Karyawan
}

type PeriodeGaji = {
  id: string
  bulan: number
  tahun: number
  status: string
  rekap: RekapGaji[]
}

// ---------- Inline helpers ----------
function labelBulan(bulan: number, tahun: number) {
  return `${NAMA_BULAN[bulan - 1] ?? "Unknown"} ${tahun}`
}

function isLocked(status: string) {
  return status === STATUS_PERIODE.TERKUNCI
}

// ============================================================
// Main view
// ============================================================
export function PayrollView() {
  const qc = useQueryClient()
  const [explicitId, setExplicitId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  // List of all periods
  const { data: periodeList, isLoading: listLoading } = useQuery({
    queryKey: ["periode"],
    queryFn: () => apiFetch<PeriodeGaji[]>("/api/payroll/periode"),
  })

  // Derive effective selected id: prefer explicit user choice (if still present
  // in the list), otherwise fall back to the first period once loaded.
  const inList = explicitId
    ? (periodeList ?? []).some((p) => p.id === explicitId)
    : false
  const selectedId =
    (explicitId && inList ? explicitId : null) ??
    (periodeList && periodeList.length > 0 ? periodeList[0].id : null)

  const handleSelect = (id: string) => setExplicitId(id)


  // Create period mutation
  const createMut = useMutation({
    mutationFn: (payload: { bulan: number; tahun: number }) =>
      apiFetch<PeriodeGaji>("/api/payroll/periode", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (p) => {
      toast.success(`Periode ${labelBulan(p.bulan, p.tahun)} dibuat`)
      qc.invalidateQueries({ queryKey: ["periode"] })
      setCreateOpen(false)
      setExplicitId(p.id)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payroll"
        description="Periode penggajian bulanan"
        icon={Wallet}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Buat Periode
          </Button>
        }
      />

      {/* Alur tutup buku info card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ListChecks className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Alur Tutup Buku Bulanan</p>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                <span className="font-medium">1.</span> Konfirmasi semua sesi menunggu →{" "}
                <span className="font-medium">2.</span> Input potongan →{" "}
                <span className="font-medium">3.</span> Hitung rekap →{" "}
                <span className="font-medium">4.</span> Tinjau →{" "}
                <span className="font-medium">5.</span> Kunci periode
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* LEFT: periods list */}
        <div className="lg:col-span-1">
          <PeriodListPanel
            list={periodeList ?? []}
            loading={listLoading}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </div>

        {/* RIGHT: period detail */}
        <div className="lg:col-span-2">
          <PeriodDetailPanel periodeId={selectedId} />
        </div>
      </div>

      {/* Create dialog */}
      <CreatePeriodeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(payload) => createMut.mutate(payload)}
        saving={createMut.isPending}
      />
    </div>
  )
}

// ============================================================
// LEFT: Period list panel
// ============================================================
function PeriodListPanel({
  list,
  loading,
  selectedId,
  onSelect,
}: {
  list: PeriodeGaji[]
  loading: boolean
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <Card className="h-full">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Daftar Periode</h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            {list.length} periode
          </Badge>
        </div>

        {loading ? (
          <div className="p-4">
            <LoadingState rows={4} />
          </div>
        ) : list.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Calendar}
              title="Belum ada periode"
              description="Buat periode gaji pertama"
            />
          </div>
        ) : (
          <ScrollArea className="max-h-[70vh]">
            <div className="flex flex-col gap-1 p-2">
              {list.map((p) => {
                const isSelected = p.id === selectedId
                const locked = isLocked(p.status)
                return (
                  <button
                    key={p.id}
                    onClick={() => onSelect(p.id)}
                    className={`group flex w-full items-center justify-between gap-2 rounded-lg border p-3 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`truncate text-sm font-medium ${
                            isSelected ? "text-primary" : ""
                          }`}
                        >
                          {labelBulan(p.bulan, p.tahun)}
                        </span>
                        {locked && <Lock className="h-3 w-3 shrink-0 text-rose-500" />}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {p.rekap?.length ?? 0} karyawan direkap
                      </p>
                    </div>
                    <StatusPeriodeBadge status={p.status} />
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================
// RIGHT: Period detail panel
// ============================================================
function PeriodDetailPanel({ periodeId }: { periodeId: string | null }) {
  const qc = useQueryClient()

  const { data: periode, isLoading } = useQuery({
    queryKey: ["periode-detail", periodeId],
    queryFn: () => apiFetch<PeriodeGaji>(`/api/payroll/periode/${periodeId}`),
    enabled: !!periodeId,
  })

  // Mutation: hitung ulang rekap
  const hitungMut = useMutation({
    mutationFn: () =>
      apiFetch<PeriodeGaji>(`/api/payroll/periode/${periodeId}/hitung`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success("Rekap dihitung ulang")
      qc.invalidateQueries({ queryKey: ["periode-detail", periodeId] })
      qc.invalidateQueries({ queryKey: ["periode"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Mutation: kunci periode
  const kunciMut = useMutation({
    mutationFn: () =>
      apiFetch<PeriodeGaji>(`/api/payroll/periode/${periodeId}/kunci`, {
        method: "POST",
      }),
    onSuccess: (p) => {
      toast.success(`Periode ${labelBulan(p.bulan, p.tahun)} dikunci`)
      qc.invalidateQueries({ queryKey: ["periode-detail", periodeId] })
      qc.invalidateQueries({ queryKey: ["periode"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Mutation: buka kunci
  const bukaMut = useMutation({
    mutationFn: () =>
      apiFetch<PeriodeGaji>(`/api/payroll/periode/${periodeId}/buka`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success("Periode dibuka kuncinya")
      qc.invalidateQueries({ queryKey: ["periode-detail", periodeId] })
      qc.invalidateQueries({ queryKey: ["periode"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Mutation: hapus periode
  const hapusMut = useMutation({
    mutationFn: () => apiFetch(`/api/payroll/periode/${periodeId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Periode dihapus")
      qc.invalidateQueries({ queryKey: ["periode"] })
      qc.invalidateQueries({ queryKey: ["periode-detail", periodeId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Local state for AlertDialog targets
  const [confirmKunci, setConfirmKunci] = useState(false)
  const [confirmBuka, setConfirmBuka] = useState(false)
  const [confirmHapus, setConfirmHapus] = useState(false)

  // ---- Render: no selection ----
  if (!periodeId) {
    return (
      <Card className="h-full">
        <CardContent className="p-6">
          <EmptyState
            icon={Wallet}
            title="Pilih periode atau buat baru"
            description="Pilih periode gaji di panel kiri, atau buat periode baru menggunakan tombol Buat Periode."
          />
        </CardContent>
      </Card>
    )
  }

  if (isLoading || !periode) {
    return (
      <Card className="h-full">
        <CardContent className="p-6">
          <LoadingState rows={6} />
        </CardContent>
      </Card>
    )
  }

  const locked = isLocked(periode.status)
  const rekap = periode.rekap ?? []

  // Summary stats
  const totalPayroll = rekap.reduce((s, r) => s + (r.totalGaji || 0), 0)
  const totalPotongan = rekap.reduce((s, r) => s + (r.totalPotongan || 0), 0)
  const totalKaryawan = rekap.length

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">
                  {labelBulan(periode.bulan, periode.tahun)}
                </h2>
                <StatusPeriodeBadge status={periode.status} />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                {rekap.length} karyawan direkap ·{" "}
                {locked ? "Periode terkunci" : "Periode draft"}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={locked || hitungMut.isPending}
                onClick={() => hitungMut.mutate()}
              >
                <Calculator className="mr-2 h-4 w-4" />
                {hitungMut.isPending ? "Menghitung..." : "Hitung Ulang"}
              </Button>

              {locked ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={bukaMut.isPending}
                  onClick={() => setConfirmBuka(true)}
                >
                  <Unlock className="mr-2 h-4 w-4" />
                  {bukaMut.isPending ? "Membuka..." : "Buka Kunci"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={kunciMut.isPending}
                  onClick={() => setConfirmKunci(true)}
                >
                  <Lock className="mr-2 h-4 w-4" />
                  {kunciMut.isPending ? "Mengunci..." : "Kunci Periode"}
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                disabled={locked || hapusMut.isPending}
                onClick={() => setConfirmHapus(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {hapusMut.isPending ? "Menghapus..." : "Hapus"}
              </Button>
            </div>
          </div>

          {locked && (
            <Alert className="mt-3 border-amber-500/30 bg-amber-500/5">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-700 dark:text-amber-400">
                Periode terkunci
              </AlertTitle>
              <AlertDescription className="text-amber-700/90 dark:text-amber-400/90">
                Buka kunci untuk mengubah rekap atau menghitung ulang.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Summary stat cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total Payroll"
          value={formatRupiah(totalPayroll)}
          icon={Banknote}
          accent="emerald"
          hint={`Untuk ${totalKaryawan} karyawan`}
        />
        <StatCard
          label="Total Potongan"
          value={formatRupiah(totalPotongan)}
          icon={AlertTriangle}
          accent="amber"
        />
        <StatCard
          label="Karyawan Direkap"
          value={totalKaryawan}
          icon={Users}
          accent="primary"
        />
      </div>

      {/* Rekap table */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Rekap Gaji Karyawan</h3>
            </div>
            {rekap.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {rekap.length} baris
              </Badge>
            )}
          </div>

          {rekap.length === 0 ? (
            <EmptyState
              icon={Calculator}
              title="Rekap belum dihitung"
              description="Klik 'Hitung Ulang' untuk menghitung rekap gaji periode ini."
            />
          ) : (
            <RekapTable rekap={rekap} locked={locked} />
          )}
        </CardContent>
      </Card>

      {/* Confirm dialogs */}
      <AlertDialog open={confirmKunci} onOpenChange={setConfirmKunci}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kunci periode ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Periode akan dikunci dan tidak bisa diubah tanpa dibuka ulang. Rekap
              akan dihitung ulang terlebih dahulu sebelum dikunci.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                kunciMut.mutate()
                setConfirmKunci(false)
              }}
            >
              <Lock className="mr-2 h-4 w-4" /> Kunci Periode
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmBuka} onOpenChange={setConfirmBuka}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Buka kunci periode?</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin buka kunci? Periode bisa diedit dan dihitung ulang kembali.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="border bg-transparent hover:bg-accent"
              onClick={() => {
                bukaMut.mutate()
                setConfirmBuka(false)
              }}
            >
              <Unlock className="mr-2 h-4 w-4" /> Ya, Buka Kunci
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmHapus} onOpenChange={setConfirmHapus}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus periode ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Semua rekap gaji pada periode
              ini akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => {
                hapusMut.mutate()
                setConfirmHapus(false)
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================================
// Rekap table
// ============================================================
function RekapTable({ rekap, locked }: { rekap: RekapGaji[]; locked: boolean }) {
  // Sort: FIXED first, then FLEXIBLE
  const sorted = useMemo(() => {
    return [...rekap].sort((a, b) => {
      const aFixed = a.tipe === TIPE_KARYAWAN.FIXED ? 0 : 1
      const bFixed = b.tipe === TIPE_KARYAWAN.FIXED ? 0 : 1
      if (aFixed !== bFixed) return aFixed - bFixed
      return (a.karyawan?.nama || "").localeCompare(b.karyawan?.nama || "")
    })
  }, [rekap])

  return (
    <div className="max-h-[60vh] overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur">
          <TableRow>
            <TableHead className="min-w-[180px]">Karyawan</TableHead>
            <TableHead className="text-right">Komponen</TableHead>
            <TableHead className="text-right">Potongan</TableHead>
            <TableHead className="text-right">Total Gaji</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((r) => (
            <RekapRow key={r.id} r={r} locked={locked} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function RekapRow({ r, locked }: { r: RekapGaji; locked: boolean }) {
  const nama = r.karyawan?.nama || "—"
  const isFixed = r.tipe === TIPE_KARYAWAN.FIXED

  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col gap-1">
          <span className="font-medium">{nama}</span>
          <TipeKaryawanBadge tipe={r.tipe} />
          {isFixed ? (
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span>Hadir: <strong className="text-emerald-600">{r.jumlahHadir}</strong></span>
              <span>Terlambat: <strong className="text-amber-600">{r.jumlahTerlambat}</strong></span>
              <span>Tidak Hadir: <strong className="text-rose-600">{r.jumlahTidakHadir}</strong></span>
            </div>
          ) : (
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span>Sesi: <strong className="text-emerald-600">{r.jumlahSesi}</strong></span>
              <span>Dibatalkan: <strong className="text-rose-600">{r.jumlahSesiDibatalkan}</strong></span>
            </div>
          )}
        </div>
      </TableCell>

      <TableCell className="text-right align-top">
        {isFixed ? (
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-medium">{formatRupiah(r.gajiPokok)}</span>
            <span className="text-[10px] text-muted-foreground">gaji pokok</span>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-medium">{formatRupiah(r.totalHonor)}</span>
            <span className="text-[10px] text-muted-foreground">
              honor · {r.jumlahSesi} sesi
            </span>
          </div>
        )}
      </TableCell>

      <TableCell className="text-right align-top">
        <span className={r.totalPotongan > 0 ? "font-medium text-amber-600" : "text-muted-foreground"}>
          {formatRupiah(r.totalPotongan)}
        </span>
      </TableCell>

      <TableCell className="text-right align-top">
        <span className="text-base font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
          {formatRupiah(r.totalGaji)}
        </span>
        {locked && (
          <Lock className="ml-1 inline h-3 w-3 text-rose-500" />
        )}
      </TableCell>
    </TableRow>
  )
}

// ============================================================
// Create period dialog
// ============================================================
function CreatePeriodeDialog({
  open,
  onOpenChange,
  onSubmit,
  saving,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSubmit: (payload: { bulan: number; tahun: number }) => void
  saving: boolean
}) {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const [bulan, setBulan] = useState<string>(String(currentMonth))
  const [tahun, setTahun] = useState<string>(String(currentYear))

  const tahunNum = Number(tahun)
  const bulanNum = Number(bulan)
  const valid = bulanNum >= 1 && bulanNum <= 12 && tahunNum > 1900

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buat Periode Gaji</DialogTitle>
          <DialogDescription>
            Pilih bulan dan tahun periode penggajian yang ingin dibuat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="bulan">Bulan</Label>
            <Select value={bulan} onValueChange={setBulan}>
              <SelectTrigger id="bulan" className="w-full">
                <SelectValue placeholder="Pilih bulan" />
              </SelectTrigger>
              <SelectContent>
                {NAMA_BULAN.map((nama, idx) => (
                  <SelectItem key={idx} value={String(idx + 1)}>
                    {nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tahun">Tahun</Label>
            <Input
              id="tahun"
              type="number"
              value={tahun}
              onChange={(e) => setTahun(e.target.value)}
              min={2000}
              max={2100}
              placeholder={String(currentYear)}
            />
            <p className="text-xs text-muted-foreground">
              Akan dibuat sebagai periode {NAMA_BULAN[bulanNum - 1] || "—"} {tahunNum || "—"}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            disabled={saving || !valid}
            onClick={() => onSubmit({ bulan: bulanNum, tahun: tahunNum })}
          >
            {saving ? "Membuat..." : "Buat Periode"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
