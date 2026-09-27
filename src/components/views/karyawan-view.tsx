"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api-client"
import {
  PageHeader,
  LoadingState,
  EmptyState,
  TipeKaryawanBadge,
  StatusKaryawanBadge,
  usePagination,
  PaginationBar,
} from "@/components/shared/ui"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Wallet,
  Clock,
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { formatRupiah, formatTanggalSingkat, TIPE_KARYAWAN } from "@/lib/constants"

type Karyawan = {
  id: string
  nama: string
  email: string
  telepon: string | null
  tipe: string
  gajiPokok: number
  status: string
  alamat: string | null
  foto: string | null
  createdAt: string
}

const EMPTY_FORM = {
  nama: "",
  email: "",
  telepon: "",
  tipe: TIPE_KARYAWAN.FIXED,
  gajiPokok: 0,
  status: "AKTIF",
  alamat: "",
}

export function KaryawanView() {
  const qc = useQueryClient()
  const [filterTipe, setFilterTipe] = useState<string>("SEMUA")
  const [filterStatus, setFilterStatus] = useState<string>("SEMUA")
  const PAGE_SIZE = 12
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Karyawan | null>(null)
  const [delId, setDelId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["karyawan", filterTipe, filterStatus],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filterTipe !== "SEMUA") params.set("tipe", filterTipe)
      if (filterStatus !== "SEMUA") params.set("status", filterStatus)
      const qs = params.toString() ? `?${params.toString()}` : ""
      return apiFetch<Karyawan[]>(`/api/karyawan${qs}`)
    },
  })

  const saveMut = useMutation({
    mutationFn: async (payload: typeof EMPTY_FORM) => {
      const body = {
        nama: payload.nama,
        email: payload.email,
        telepon: payload.telepon || null,
        tipe: payload.tipe,
        gajiPokok: payload.tipe === TIPE_KARYAWAN.FIXED ? Number(payload.gajiPokok) || 0 : 0,
        status: payload.status,
        alamat: payload.alamat || null,
      }
      if (editing) {
        return apiFetch(`/api/karyawan/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        })
      }
      return apiFetch("/api/karyawan", {
        method: "POST",
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      toast.success(editing ? "Karyawan diperbarui" : "Karyawan ditambahkan")
      qc.invalidateQueries({ queryKey: ["karyawan"] })
      setOpen(false)
      setEditing(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const delMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/karyawan/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Karyawan dihapus")
      qc.invalidateQueries({ queryKey: ["karyawan"] })
      setDelId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const total = data?.length ?? 0
  const totalFixed = data?.filter((k) => k.tipe === TIPE_KARYAWAN.FIXED).length ?? 0
  const totalFlexible = data?.filter((k) => k.tipe === TIPE_KARYAWAN.FLEXIBLE).length ?? 0
  const { paged: pagedData, page, totalPages, setPage } = usePagination(data ?? [], PAGE_SIZE)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Karyawan"
        description="Daftar karyawan fixed time & flexible time"
        icon={Users}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Tambah Karyawan
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip
            label="Semua Tipe"
            active={filterTipe === "SEMUA"}
            onClick={() => setFilterTipe("SEMUA")}
            count={total}
          />
          <FilterChip
            label="Fixed Time"
            active={filterTipe === TIPE_KARYAWAN.FIXED}
            onClick={() => setFilterTipe(TIPE_KARYAWAN.FIXED)}
            count={filterTipe === "SEMUA" ? totalFixed : undefined}
          />
          <FilterChip
            label="Flexible Time"
            active={filterTipe === TIPE_KARYAWAN.FLEXIBLE}
            onClick={() => setFilterTipe(TIPE_KARYAWAN.FLEXIBLE)}
            count={filterTipe === "SEMUA" ? totalFlexible : undefined}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="filter-status" className="text-xs text-muted-foreground">
            Status:
          </Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger id="filter-status" size="sm" className="w-40">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SEMUA">Semua Status</SelectItem>
              <SelectItem value="AKTIF">Aktif</SelectItem>
              <SelectItem value="NONAKTIF">Nonaktif</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg border bg-muted/40" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pagedData.map((k) => (
              <KaryawanCard
                key={k.id}
                k={k}
                onEdit={() => {
                  setEditing(k)
                  setOpen(true)
                }}
                onDelete={() => setDelId(k.id)}
              />
            ))}
          </div>
          <PaginationBar
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="Belum ada karyawan"
          description="Tambahkan data karyawan fixed time (staf) atau flexible time (tutor)."
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Tambah Karyawan
            </Button>
          }
        />
      )}

      <KaryawanDialog
        open={open}
        editing={editing}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) setEditing(null)
        }}
        onSubmit={(payload) => saveMut.mutate(payload)}
        saving={saveMut.isPending}
      />

      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus karyawan ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data karyawan beserta akun login-nya akan
              dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => delId && delMut.mutate(delId)}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function FilterChip({
  label,
  active,
  onClick,
  count,
}: {
  label: string
  active: boolean
  onClick: () => void
  count?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted")
      }
    >
      {label}
      {typeof count === "number" && (
        <span
          className={
            "rounded-full px-1.5 text-[10px] " +
            (active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground")
          }
        >
          {count}
        </span>
      )}
    </button>
  )
}

function KaryawanCard({
  k,
  onEdit,
  onDelete,
}: {
  k: Karyawan
  onEdit: () => void
  onDelete: () => void
}) {
  const isFixed = k.tipe === TIPE_KARYAWAN.FIXED
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div
            className={
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold " +
              (isFixed
                ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                : "bg-violet-500/10 text-violet-700 dark:text-violet-300")
            }
          >
            {initials(k.nama)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold leading-tight">{k.nama}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Terdaftar {formatTanggalSingkat(k.createdAt)}
                </p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <TipeKaryawanBadge tipe={k.tipe} />
              <StatusKaryawanBadge status={k.status} />
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-1.5 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{k.email}</span>
          </div>
          {k.telepon && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{k.telepon}</span>
            </div>
          )}
          {k.alamat && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-2">{k.alamat}</span>
            </div>
          )}
        </div>

        <div
          className={
            "mt-4 flex items-center gap-2 rounded-lg p-2.5 " +
            (isFixed
              ? "bg-emerald-500/10"
              : "bg-violet-500/10")
          }
        >
          {isFixed ? (
            <>
              <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight">{formatRupiah(k.gajiPokok)}</p>
                <p className="text-[10px] text-muted-foreground">Gaji pokok bulanan</p>
              </div>
            </>
          ) : (
            <>
              <Clock className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">Honor per sesi</p>
                <p className="text-[10px] text-muted-foreground">Dihitung dari tarif program &times; durasi</p>
              </div>
            </>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 flex-1"
            onClick={onEdit}
          >
            <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function KaryawanDialog({
  open,
  editing,
  onOpenChange,
  onSubmit,
  saving,
}: {
  open: boolean
  editing: Karyawan | null
  onOpenChange: (o: boolean) => void
  onSubmit: (p: typeof EMPTY_FORM) => void
  saving: boolean
}) {
  const [form, setForm] = useState(EMPTY_FORM)

  // sync form when editing target changes (useEditEffect pattern)
  useEditEffect(editing, setForm)

  const isFixed = form.tipe === TIPE_KARYAWAN.FIXED
  const valid = form.nama.trim().length >= 2 && /.+@.+\..+/.test(form.email)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Karyawan" : "Tambah Karyawan"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Perbarui data karyawan. Akun login akan mengikuti email ini."
              : "Karyawan baru akan otomatis memiliki akun login (password default: demo123)."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nama">Nama Lengkap</Label>
              <Input
                id="nama"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                placeholder="mis. Budi Santoso"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="budi@bimbel.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="telepon">Telepon</Label>
              <Input
                id="telepon"
                value={form.telepon}
                onChange={(e) => setForm({ ...form, telepon: e.target.value })}
                placeholder="08xxxxxxxxxx"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tipe">Tipe Karyawan</Label>
              <Select
                value={form.tipe}
                onValueChange={(v) =>
                  setForm({ ...form, tipe: v as typeof form.tipe })
                }
              >
                <SelectTrigger id="tipe" className="w-full">
                  <SelectValue placeholder="Pilih tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TIPE_KARYAWAN.FIXED}>Fixed Time (Staf)</SelectItem>
                  <SelectItem value={TIPE_KARYAWAN.FLEXIBLE}>Flexible Time (Tutor)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gaji">Gaji Pokok (Rp)</Label>
            <Input
              id="gaji"
              type="number"
              min={0}
              disabled={!isFixed}
              value={form.gajiPokok || ""}
              onChange={(e) =>
                setForm({ ...form, gajiPokok: Number(e.target.value) })
              }
              placeholder={isFixed ? "3000000" : "0"}
              className={!isFixed ? "bg-muted text-muted-foreground" : ""}
            />
            <p className="text-xs text-muted-foreground">
              {isFixed
                ? "Gaji bulanan tetap untuk karyawan fixed time."
                : "Tidak berlaku untuk tutor. Honor tutor dihitung per sesi dari tarif program &times; durasi."}
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="status" className="text-sm">
                Status Aktif
              </Label>
              <p className="text-xs text-muted-foreground">
                Karyawan nonaktif tidak dapat login atau menerima penugasan baru.
              </p>
            </div>
            <Switch
              id="status"
              checked={form.status === "AKTIF"}
              onCheckedChange={(c) =>
                setForm({ ...form, status: c ? "AKTIF" : "NONAKTIF" })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="alamat">Alamat</Label>
            <Textarea
              id="alamat"
              value={form.alamat}
              onChange={(e) => setForm({ ...form, alamat: e.target.value })}
              placeholder="Alamat domisili..."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button disabled={saving || !valid} onClick={() => onSubmit(form)}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- helpers ----------

function initials(nama: string): string {
  const parts = nama.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// helper hook to sync form when editing target changes
function useEditEffect(
  editing: Karyawan | null,
  setForm: (f: typeof EMPTY_FORM) => void,
) {
  useEffect(() => {
    if (editing) {
      setForm({
        nama: editing.nama,
        email: editing.email,
        telepon: editing.telepon || "",
        tipe: editing.tipe as typeof EMPTY_FORM.tipe,
        gajiPokok: editing.gajiPokok || 0,
        status: editing.status,
        alamat: editing.alamat || "",
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [editing, setForm])
}
