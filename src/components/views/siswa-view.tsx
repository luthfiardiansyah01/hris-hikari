"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api-client"
import { PageHeader, LoadingState, EmptyState } from "@/components/shared/ui"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  Search,
  Phone,
  User2,
} from "lucide-react"
import { toast } from "sonner"

// ---------- Types ----------
type Program = {
  id: string
  nama: string
  tarifPerJam: number
  deskripsi: string | null
  warna: string | null
  status: string
}

type SiswaProgramItem = { program: Program }

type Siswa = {
  id: string
  nama: string
  namaWali: string | null
  telepon: string | null
  email: string | null
  alamat: string | null
  catatan: string | null
  siswaProgram: SiswaProgramItem[]
}

const DEFAULT_COLOR = "#94a3b8"

// Convert hex (#rrggbb / #rgb) to rgba string with given alpha.
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "")
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  if ([r, g, b].some((n) => Number.isNaN(n))) return `rgba(148, 163, 184, ${alpha})`
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// ---------- Main view ----------
export function SiswaView() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["siswa"],
    queryFn: () => apiFetch<Siswa[]>("/api/siswa"),
  })

  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Siswa | null>(null)
  const [delId, setDelId] = useState<string | null>(null)

  const saveMut = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (editing) {
        return apiFetch(`/api/siswa/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        })
      }
      return apiFetch("/api/siswa", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => {
      toast.success(editing ? "Siswa diperbarui" : "Siswa ditambahkan")
      qc.invalidateQueries({ queryKey: ["siswa"] })
      setOpen(false)
      setEditing(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const delMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/siswa/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Siswa dihapus")
      qc.invalidateQueries({ queryKey: ["siswa"] })
      setDelId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const filtered = (data || []).filter((s) =>
    s.nama.toLowerCase().includes(search.trim().toLowerCase()),
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Siswa"
        description="Daftar siswa bimbingan"
        icon={GraduationCap}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Tambah Siswa
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari nama siswa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Cari siswa"
        />
      </div>

      {isLoading ? (
        <LoadingState />
      ) : filtered.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <Card key={s.id} className="overflow-hidden">
              <CardContent className="p-4">
                <p className="truncate font-semibold">{s.nama}</p>
                {s.namaWali ? (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">Wali: {s.namaWali}</span>
                  </p>
                ) : null}
                {s.telepon ? (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3 shrink-0" />
                    <span className="truncate">{s.telepon}</span>
                  </p>
                ) : null}

                {s.siswaProgram && s.siswaProgram.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.siswaProgram.map((sp) => {
                      const color = sp.program.warna || DEFAULT_COLOR
                      return (
                        <span
                          key={sp.program.id}
                          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
                          style={{
                            backgroundColor: hexToRgba(color, 0.12),
                            borderColor: hexToRgba(color, 0.3),
                            color,
                          }}
                          title={sp.program.nama}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: color }}
                            aria-hidden
                          />
                          {sp.program.nama}
                        </span>
                      )
                    })}
                  </div>
                ) : (
                  <p className="mt-3 text-xs italic text-muted-foreground">
                    Belum ada program
                  </p>
                )}

                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 flex-1"
                    onClick={() => {
                      setEditing(s)
                      setOpen(true)
                    }}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-rose-600"
                    onClick={() => setDelId(s.id)}
                    aria-label="Hapus siswa"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={GraduationCap}
          title={search ? "Tidak ada siswa yang cocok" : "Belum ada siswa"}
          description={
            search
              ? "Coba kata kunci lain atau kosongkan kolom pencarian."
              : "Tambahkan data siswa bimbingan untuk mulai mencatat sesi."
          }
          action={
            !search ? (
              <Button onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Tambah Siswa
              </Button>
            ) : undefined
          }
        />
      )}

      <SiswaDialog
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
            <AlertDialogTitle>Hapus siswa ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data siswa beserta relasi
              program akan dihapus permanen.
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

// ---------- Dialog form ----------
function SiswaDialog({
  open,
  editing,
  onOpenChange,
  onSubmit,
  saving,
}: {
  open: boolean
  editing: Siswa | null
  onOpenChange: (o: boolean) => void
  onSubmit: (payload: Record<string, unknown>) => void
  saving: boolean
}) {
  // Lazy-load programs only when dialog opens.
  const { data: programs, isLoading: programsLoading } = useQuery({
    queryKey: ["programs"],
    queryFn: () => apiFetch<Program[]>("/api/program"),
    enabled: open,
  })

  const [form, setForm] = useState({
    nama: "",
    namaWali: "",
    telepon: "",
    email: "",
    alamat: "",
    catatan: "",
    programIds: [] as string[],
  })

  useEditEffect(editing, setForm, open)

  const toggleProgram = (pid: string) => {
    setForm((f) => ({
      ...f,
      programIds: f.programIds.includes(pid)
        ? f.programIds.filter((x) => x !== pid)
        : [...f.programIds, pid],
    }))
  }

  const submit = () => {
    onSubmit({
      nama: form.nama.trim(),
      namaWali: form.namaWali.trim() || null,
      telepon: form.telepon.trim() || null,
      email: form.email.trim(),
      alamat: form.alamat.trim() || null,
      catatan: form.catatan.trim() || null,
      programIds: form.programIds,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Siswa" : "Tambah Siswa"}</DialogTitle>
          <DialogDescription>
            Lengkapi data siswa dan pilih program bimbingan yang diikuti.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="nama">
              Nama Siswa <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="nama"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              placeholder="mis. Andi Pratama"
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="namaWali">Nama Wali</Label>
              <Input
                id="namaWali"
                value={form.namaWali}
                onChange={(e) =>
                  setForm({ ...form, namaWali: e.target.value })
                }
                placeholder="mis. Bapak Sutrisno"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telepon">Telepon</Label>
              <Input
                id="telepon"
                value={form.telepon}
                onChange={(e) => setForm({ ...form, telepon: e.target.value })}
                placeholder="08xxxxxxxxxx"
                inputMode="tel"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@contoh.com"
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

          <div className="space-y-1.5">
            <Label htmlFor="catatan">Catatan</Label>
            <Textarea
              id="catatan"
              value={form.catatan}
              onChange={(e) => setForm({ ...form, catatan: e.target.value })}
              placeholder="Catatan tambahan..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Program Bimbingan</Label>
            {programsLoading ? (
              <p className="text-xs text-muted-foreground">Memuat program...</p>
            ) : programs && programs.length > 0 ? (
              <div className="max-h-44 space-y-0.5 overflow-y-auto rounded-lg border p-2">
                {programs.map((p) => {
                  const color = p.warna || DEFAULT_COLOR
                  const checked = form.programIds.includes(p.id)
                  return (
                    <label
                      key={p.id}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors ${
                        checked ? "bg-muted" : "hover:bg-muted/60"
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleProgram(p.id)}
                        aria-label={`Pilih program ${p.nama}`}
                      />
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                        aria-hidden
                      />
                      <span className="text-sm">{p.nama}</span>
                      {p.status === "NONAKTIF" && (
                        <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
                          nonaktif
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed p-3 text-xs italic text-muted-foreground">
                Belum ada program tersedia. Tambahkan program terlebih dahulu.
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              {form.programIds.length} program dipilih
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            disabled={saving || form.nama.trim().length < 2}
            onClick={submit}
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Edit sync hook (mirrors program-view.tsx pattern) ----------
function useEditEffect(
  editing: Siswa | null,
  setForm: (f: {
    nama: string
    namaWali: string
    telepon: string
    email: string
    alamat: string
    catatan: string
    programIds: string[]
  }) => void,
  open: boolean,
) {
  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        nama: editing.nama,
        namaWali: editing.namaWali || "",
        telepon: editing.telepon || "",
        email: editing.email || "",
        alamat: editing.alamat || "",
        catatan: editing.catatan || "",
        programIds: (editing.siswaProgram || []).map((sp) => sp.program.id),
      })
    } else {
      setForm({
        nama: "",
        namaWali: "",
        telepon: "",
        email: "",
        alamat: "",
        catatan: "",
        programIds: [],
      })
    }
  }, [editing, open])
}
