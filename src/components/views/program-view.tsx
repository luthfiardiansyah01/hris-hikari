"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api-client"
import { PageHeader, LoadingState, EmptyState, StatusKaryawanBadge, usePagination, PaginationBar } from "@/components/shared/ui"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
import { BookOpen, Plus, Pencil, Trash2, Coins } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { formatRupiah } from "@/lib/constants"

type Program = {
  id: string
  nama: string
  tarifPerJam: number
  deskripsi: string | null
  warna: string | null
  status: string
}

export function ProgramView() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["programs"],
    queryFn: () => apiFetch<Program[]>("/api/program"),
  })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Program | null>(null)
  const [delId, setDelId] = useState<string | null>(null)
  const { paged: pagedProgram, page: progPage, totalPages: progTotalPages, setPage: setProgPage } = usePagination(data ?? [], 12)

  const saveMut = useMutation({
    mutationFn: async (payload: any) => {
      if (editing) {
        return apiFetch(`/api/program/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) })
      }
      return apiFetch("/api/program", { method: "POST", body: JSON.stringify(payload) })
    },
    onSuccess: () => {
      toast.success(editing ? "Program diperbarui" : "Program ditambahkan")
      qc.invalidateQueries({ queryKey: ["programs"] })
      setOpen(false)
      setEditing(null)
    },
    onError: (e: any) => toast.error(e.message),
  })

  const delMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/program/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Program dihapus")
      qc.invalidateQueries({ queryKey: ["programs"] })
      setDelId(null)
    },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Program"
        description="Daftar program bimbingan beserta tarif per jam"
        icon={BookOpen}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Tambah Program
          </Button>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : data && data.length > 0 ? (
        <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pagedProgram.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              <div className="h-1.5 w-full" style={{ background: p.warna || "#94a3b8" }} />
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{p.nama}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {p.deskripsi || "Tanpa deskripsi"}
                    </p>
                  </div>
                  <StatusKaryawanBadge status={p.status} />
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/50 p-2">
                  <Coins className="h-4 w-4 text-emerald-600" />
                  <div>
                    <p className="text-sm font-bold">{formatRupiah(p.tarifPerJam)}</p>
                    <p className="text-[10px] text-muted-foreground">per jam</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 flex-1"
                    onClick={() => {
                      setEditing(p)
                      setOpen(true)
                    }}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-rose-600" onClick={() => setDelId(p.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <PaginationBar page={progPage} totalPages={progTotalPages} total={data.length} pageSize={12} onPageChange={setProgPage} />
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="Belum ada program"
          description="Tambahkan program bimbingan beserta tarifnya"
          action={<Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Tambah</Button>}
        />
      )}

      <ProgramDialog
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
            <AlertDialogTitle>Hapus program ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Program akan dihapus permanen.
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

function ProgramDialog({
  open,
  editing,
  onOpenChange,
  onSubmit,
  saving,
}: {
  open: boolean
  editing: Program | null
  onOpenChange: (o: boolean) => void
  onSubmit: (p: any) => void
  saving: boolean
}) {
  const [form, setForm] = useState({
    nama: "",
    tarifPerJam: 0,
    deskripsi: "",
    warna: "#10b981",
    status: "AKTIF",
  })

  // sync form when editing target changes
  useEditEffect(editing, setForm)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Program" : "Tambah Program"}</DialogTitle>
          <DialogDescription>
            Tarif per jam sama untuk semua tutor pada program ini.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="nama">Nama Program</Label>
            <Input
              id="nama"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              placeholder="mis. Matematika SMP"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tarif">Tarif per Jam (Rp)</Label>
              <Input
                id="tarif"
                type="number"
                value={form.tarifPerJam || ""}
                onChange={(e) => setForm({ ...form, tarifPerJam: Number(e.target.value) })}
                placeholder="50000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="warna">Warna Penanda</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="warna"
                  type="color"
                  value={form.warna}
                  onChange={(e) => setForm({ ...form, warna: e.target.value })}
                  className="h-9 w-14 p-1"
                />
                <span className="text-xs text-muted-foreground">{form.warna}</span>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deskripsi">Deskripsi</Label>
            <Textarea
              id="deskripsi"
              value={form.deskripsi}
              onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
              placeholder="Deskripsi singkat program..."
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="status" className="text-sm">Status Aktif</Label>
              <p className="text-xs text-muted-foreground">Program nonaktif tidak bisa dipakai di sesi baru</p>
            </div>
            <Switch
              id="status"
              checked={form.status === "AKTIF"}
              onCheckedChange={(c) => setForm({ ...form, status: c ? "AKTIF" : "NONAKTIF" })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button
            disabled={saving || !form.nama || form.tarifPerJam <= 0}
            onClick={() => onSubmit(form)}
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// helper hook to sync form when editing target changes
import { useEffect } from "react"
function useEditEffect(editing: Program | null, setForm: (f: any) => void) {
  useEffect(() => {
    if (editing) {
      setForm({
        nama: editing.nama,
        tarifPerJam: editing.tarifPerJam,
        deskripsi: editing.deskripsi || "",
        warna: editing.warna || "#10b981",
        status: editing.status,
      })
    } else {
      setForm({ nama: "", tarifPerJam: 0, deskripsi: "", warna: "#10b981", status: "AKTIF" })
    }
  }, [editing])
}
