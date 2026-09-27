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
  usePagination,
  PaginationBar,
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
  Search,
  X,
  TrendingUp,
  ChevronRight,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Payroll"
          description="Manajemen periode penggajian bulanan"
          icon={Wallet}
        />
        <Button size="sm" onClick={() => setCreateOpen(true)} className="w-fit">
          <Plus className="mr-2 h-4 w-4" /> Buat Periode
        </Button>
      </div>

      {/* Alur tutup buku */}
      <div className="flex items-center gap-2 overflow-x-auto rounded-xl border bg-muted/30 px-4 py-3">
        <ListChecks className="h-4 w-4 shrink-0 text-primary" />
        <p className="whitespace-nowrap text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Alur:</span>
        </p>
        {[
          "Konfirmasi sesi",
          "Input potongan",
          "Hitung rekap",
          "Tinjau",
          "Kunci periode",
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-1.5 whitespace-nowrap">
            {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />}
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              {i + 1}
            </span>
            <span className="text-xs text-muted-foreground">{step}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* LEFT: periods list + summary */}
        <div className="flex flex-col gap-4 lg:col-span-1">
          <PeriodListPanel
            list={periodeList ?? []}
            loading={listLoading}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
          <PayrollSummaryCard list={periodeList ?? []} />
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
  const [filterTahun, setFilterTahun] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const tahunOptions = useMemo(() => {
    const years = [...new Set(list.map((p) => p.tahun))].sort((a, b) => b - a)
    return years
  }, [list])

  const filtered = useMemo(() => {
    return list.filter((p) => {
      if (filterTahun !== "all" && p.tahun !== Number(filterTahun)) return false
      if (filterStatus !== "all" && p.status !== filterStatus) return false
      return true
    })
  }, [list, filterTahun, filterStatus])

  const PAGE_SIZE = 8
  const { paged: pagedList, page, totalPages, setPage } = usePagination(filtered, PAGE_SIZE)

  useEffect(() => { setPage(1) }, [filterTahun, filterStatus])

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Daftar Periode</h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            {filtered.length}/{list.length} periode
          </Badge>
        </div>

        {/* Filter bar */}
        <div className="flex gap-2 border-b px-3 py-2">
          <Select value={filterTahun} onValueChange={setFilterTahun}>
            <SelectTrigger className="h-7 flex-1 text-xs">
              <SelectValue placeholder="Tahun" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tahun</SelectItem>
              {tahunOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-7 flex-1 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value={STATUS_PERIODE.DRAFT}>Draft</SelectItem>
              <SelectItem value={STATUS_PERIODE.TERKUNCI}>Terkunci</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="p-4">
            <LoadingState rows={4} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Calendar}
              title="Tidak ada periode"
              description="Coba ubah filter tahun atau status"
            />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1 p-2">
              {pagedList.map((p) => {
                const isSelected = p.id === selectedId
                const locked = isLocked(p.status)
                const totalGaji = (p.rekap ?? []).reduce((s, r) => s + (r.totalGaji || 0), 0)
                return (
                  <button
                    key={p.id}
                    onClick={() => onSelect(p.id)}
                    className={`group flex w-full flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        {locked
                          ? <Lock className="h-3 w-3 shrink-0 text-rose-500" />
                          : <FileText className="h-3 w-3 shrink-0 text-amber-500" />
                        }
                        <span className={`truncate text-sm font-semibold ${isSelected ? "text-primary" : ""}`}>
                          {labelBulan(p.bulan, p.tahun)}
                        </span>
                      </div>
                      <StatusPeriodeBadge status={p.status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {p.rekap?.length ?? 0} karyawan
                      </span>
                      {totalGaji > 0 && (
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          {formatRupiah(totalGaji)}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="border-t px-3 py-2">
              <PaginationBar
                page={page}
                totalPages={totalPages}
                total={filtered.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================
// LEFT: Summary card
// ============================================================
function PayrollSummaryCard({ list }: { list: PeriodeGaji[] }) {
  const totalDraft = list.filter((p) => p.status === STATUS_PERIODE.DRAFT).length
  const totalTerkunci = list.filter((p) => p.status === STATUS_PERIODE.TERKUNCI).length
  const totalGajiAll = list.reduce(
    (s, p) => s + (p.rekap ?? []).reduce((rs, r) => rs + (r.totalGaji || 0), 0),
    0,
  )
  const totalPotonganAll = list.reduce(
    (s, p) => s + (p.rekap ?? []).reduce((rs, r) => rs + (r.totalPotongan || 0), 0),
    0,
  )

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Ringkasan</h3>
        </div>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs text-muted-foreground">Periode Draft</span>
            </div>
            <span className="text-sm font-bold">{totalDraft}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-rose-500" />
              <span className="text-xs text-muted-foreground">Periode Terkunci</span>
            </div>
            <span className="text-sm font-bold">{totalTerkunci}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
            <div className="flex items-center gap-2">
              <Banknote className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Total Gaji Tersalurkan</span>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {formatRupiah(totalGajiAll)}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
            <div className="flex items-center gap-2">
              <Calculator className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs text-muted-foreground">Total Potongan</span>
            </div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              {formatRupiah(totalPotonganAll)}
            </span>
          </div>
        </div>
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

  const totalPayroll = rekap.reduce((s, r) => s + (r.totalGaji || 0), 0)
  const totalPotongan = rekap.reduce((s, r) => s + (r.totalPotongan || 0), 0)
  const totalHonor = rekap.filter(r => r.tipe === TIPE_KARYAWAN.FLEXIBLE).reduce((s, r) => s + (r.totalHonor || 0), 0)
  const totalKaryawan = rekap.length
  const jumlahFixed = rekap.filter(r => r.tipe === TIPE_KARYAWAN.FIXED).length
  const jumlahFlexible = rekap.filter(r => r.tipe === TIPE_KARYAWAN.FLEXIBLE).length

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card className={locked ? "border-rose-200 dark:border-rose-900" : ""}>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">
                  {labelBulan(periode.bulan, periode.tahun)}
                </h2>
                <StatusPeriodeBadge status={periode.status} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {totalKaryawan} karyawan
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatRupiah(totalPayroll)}</span>
                </span>
                {jumlahFixed > 0 && <span>{jumlahFixed} staf tetap</span>}
                {jumlahFlexible > 0 && <span>{jumlahFlexible} tutor</span>}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={locked || hitungMut.isPending}
                onClick={() => hitungMut.mutate()}
              >
                <Calculator className="mr-1.5 h-3.5 w-3.5" />
                {hitungMut.isPending ? "Menghitung..." : "Hitung Ulang"}
              </Button>

              {locked ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
                  disabled={bukaMut.isPending}
                  onClick={() => setConfirmBuka(true)}
                >
                  <Unlock className="mr-1.5 h-3.5 w-3.5" />
                  {bukaMut.isPending ? "Membuka..." : "Buka Kunci"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={kunciMut.isPending}
                  onClick={() => setConfirmKunci(true)}
                >
                  <Lock className="mr-1.5 h-3.5 w-3.5" />
                  {kunciMut.isPending ? "Mengunci..." : "Kunci Periode"}
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:hover:bg-rose-950"
                disabled={locked || hapusMut.isPending}
                onClick={() => setConfirmHapus(true)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                {hapusMut.isPending ? "Menghapus..." : "Hapus"}
              </Button>
            </div>
          </div>

          {locked && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-400">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              Periode terkunci — buka kunci untuk mengubah rekap atau menghitung ulang.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Payroll"
          value={formatRupiah(totalPayroll)}
          icon={Banknote}
          accent="emerald"
        />
        <StatCard
          label="Total Potongan"
          value={formatRupiah(totalPotongan)}
          icon={AlertTriangle}
          accent="amber"
        />
        <StatCard
          label="Honor Tutor"
          value={formatRupiah(totalHonor)}
          icon={TrendingUp}
          accent="primary"
        />
        <StatCard
          label="Karyawan"
          value={totalKaryawan}
          icon={Users}
          accent="primary"
          hint={jumlahFixed > 0 && jumlahFlexible > 0 ? `${jumlahFixed} tetap · ${jumlahFlexible} tutor` : undefined}
        />
      </div>

      {/* Rekap table */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Rekap Gaji Karyawan</h3>
              {rekap.length > 0 && (
                <Badge variant="secondary" className="text-xs">{rekap.length} baris</Badge>
              )}
            </div>
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
  const [search, setSearch] = useState("")
  const [filterTipe, setFilterTipe] = useState<string>("all")

  const filtered = useMemo(() => {
    return [...rekap]
      .filter((r) => {
        if (filterTipe !== "all" && r.tipe !== filterTipe) return false
        if (search) {
          const q = search.toLowerCase()
          if (!(r.karyawan?.nama || "").toLowerCase().includes(q)) return false
        }
        return true
      })
      .sort((a, b) => {
        const aFixed = a.tipe === TIPE_KARYAWAN.FIXED ? 0 : 1
        const bFixed = b.tipe === TIPE_KARYAWAN.FIXED ? 0 : 1
        if (aFixed !== bFixed) return aFixed - bFixed
        return (a.karyawan?.nama || "").localeCompare(b.karyawan?.nama || "")
      })
  }, [rekap, search, filterTipe])

  const PAGE_SIZE = 15
  const { paged: displayed, page, totalPages, setPage } = usePagination(filtered, PAGE_SIZE)
  // Reset ke halaman 1 saat filter berubah
  useEffect(() => { setPage(1) }, [search, filterTipe]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-3">
      {/* Search + filter row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama karyawan..."
            className="h-8 w-full rounded-md border bg-background pl-8 pr-8 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-1"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select value={filterTipe} onValueChange={setFilterTipe}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="Tipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tipe</SelectItem>
            <SelectItem value={TIPE_KARYAWAN.FIXED}>Staf Tetap</SelectItem>
            <SelectItem value={TIPE_KARYAWAN.FLEXIBLE}>Tutor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {displayed.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          Tidak ada karyawan yang cocok dengan filter
        </div>
      ) : (
        <div className="max-h-[55vh] overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur">
              <TableRow>
                <TableHead className="min-w-[180px]">Karyawan</TableHead>
                <TableHead className="text-right">Komponen</TableHead>
                <TableHead className="text-right">Potongan</TableHead>
                <TableHead className="text-right font-semibold">Total Gaji</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayed.map((r) => (
                <RekapRow key={r.id} r={r} locked={locked} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PaginationBar
        page={page}
        totalPages={totalPages}
        total={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
      {(search || filterTipe !== "all") && (
        <p className="text-right text-xs text-muted-foreground">
          {filtered.length} dari {rekap.length} karyawan ditampilkan
        </p>
      )}
    </div>
  )
}

function RekapRow({ r, locked }: { r: RekapGaji; locked: boolean }) {
  const nama = r.karyawan?.nama || "—"
  const isFixed = r.tipe === TIPE_KARYAWAN.FIXED

  return (
    <TableRow className="align-middle">
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <span className="font-medium leading-snug">{nama}</span>
          <TipeKaryawanBadge tipe={r.tipe} />
          {isFixed ? (
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {r.jumlahHadir} hadir
              </span>
              <span className="flex items-center gap-0.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                {r.jumlahTerlambat} terlambat
              </span>
              <span className="flex items-center gap-0.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
                {r.jumlahTidakHadir} absen
              </span>
            </div>
          ) : (
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {r.jumlahSesi} sesi
              </span>
              {r.jumlahSesiDibatalkan > 0 && (
                <span className="flex items-center gap-0.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400" />
                  {r.jumlahSesiDibatalkan} batal
                </span>
              )}
            </div>
          )}
        </div>
      </TableCell>

      <TableCell className="text-right">
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-medium tabular-nums">
            {formatRupiah(isFixed ? r.gajiPokok : r.totalHonor)}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {isFixed ? "gaji pokok" : `honor · ${r.jumlahSesi} sesi`}
          </span>
        </div>
      </TableCell>

      <TableCell className="text-right">
        {r.totalPotongan > 0 ? (
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-medium tabular-nums text-amber-600 dark:text-amber-400">
              −{formatRupiah(r.totalPotongan)}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <span className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatRupiah(r.totalGaji)}
          </span>
          {locked && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />}
        </div>
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
