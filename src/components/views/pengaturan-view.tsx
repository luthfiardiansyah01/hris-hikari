"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api-client"
import { PageHeader, LoadingState, EmptyState } from "@/components/shared/ui"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Settings,
  MapPin,
  Clock,
  CalendarDays,
  Palmtree,
  Plus,
  Trash2,
  Check,
  X,
  Save,
  Building2,
  CalendarPlus,
  Plane,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { formatTanggalSingkat } from "@/lib/constants"

// ---------------- Types ----------------
type Pengaturan = {
  id: string
  namaPerusahaan: string
  kantorLat: number
  kantorLng: number
  kantorRadiusMeter: number
  jamMasukFixed: string
  jamPulangFixed: string
  toleransiTerlambatMenit: number
  checkInWindowMin: number
  checkInWindowMax: number
}

type HariLibur = {
  id: string
  tanggal: string
  nama: string
  recurring: boolean
}

type CutiStatus = "PENDING" | "APPROVED" | "REJECTED"
type Cuti = {
  id: string
  karyawanId: string
  tanggalMulai: string
  tanggalSelesai: string
  alasan: string
  status: CutiStatus
  karyawan: { id: string; nama: string; tipe: string }
}

type Karyawan = {
  id: string
  nama: string
  tipe: string
  status: string
}

// ---------------- Helpers ----------------
function addMinutesToTime(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number)
  const total = h * 60 + m + mins
  const nh = Math.floor(total / 60) % 24
  const nm = total % 60
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`
}

function toDateInput(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function CutiStatusBadge({ status }: { status: CutiStatus }) {
  const map: Record<CutiStatus, { label: string; cls: string }> = {
    PENDING: { label: "Pending", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20" },
    APPROVED: { label: "Disetujui", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20" },
    REJECTED: { label: "Ditolak", cls: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20" },
  }
  const v = map[status]
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${v.cls}`}>{v.label}</span>
}

// ---------------- Main View ----------------
export function PengaturanView() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Pengaturan"
        description="Konfigurasi absensi, hari libur, dan cuti karyawan"
        icon={Settings}
      />

      <Tabs defaultValue="umum">
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="umum" className="gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            <span>Pengaturan Umum</span>
          </TabsTrigger>
          <TabsTrigger value="libur" className="gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Hari Libur</span>
          </TabsTrigger>
          <TabsTrigger value="cuti" className="gap-1.5">
            <Palmtree className="h-3.5 w-3.5" />
            <span>Cuti</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="umum" className="mt-4 outline-none">
          <PengaturanUmumTab />
        </TabsContent>
        <TabsContent value="libur" className="mt-4 outline-none">
          <HariLiburTab />
        </TabsContent>
        <TabsContent value="cuti" className="mt-4 outline-none">
          <CutiTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ---------------- Tab 1: Pengaturan Umum ----------------
function PengaturanUmumTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["pengaturan"],
    queryFn: () => apiFetch<Pengaturan>("/api/pengaturan"),
  })

  if (isLoading || !data) {
    return <LoadingState rows={6} />
  }
  return <PengaturanForm initial={data} />
}

function PengaturanForm({ initial }: { initial: Pengaturan }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Pengaturan>(initial)

  const saveMut = useMutation({
    mutationFn: (payload: Pengaturan) =>
      apiFetch("/api/pengaturan", { method: "PUT", body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast.success("Pengaturan tersimpan")
      qc.invalidateQueries({ queryKey: ["pengaturan"] })
    },
    onError: (e: any) => toast.error(e.message),
  })

  const set = (k: keyof Pengaturan, v: string | number) =>
    setForm({ ...form, [k]: v })

  const onTimeLimit = `${addMinutesToTime(form.jamMasukFixed, form.toleransiTerlambatMenit)}:59`

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" />
            Konfigurasi Umum
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="namaPerusahaan">Nama Perusahaan</Label>
            <Input
              id="namaPerusahaan"
              value={form.namaPerusahaan}
              onChange={(e) => set("namaPerusahaan", e.target.value)}
              placeholder="Bimbel Cerdas"
            />
          </div>

          <div className="rounded-lg border border-dashed p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-rose-500" />
              Koordinat Kantor
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Koordinat kantor untuk validasi GPS absensi fixed-time.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="lat">Latitude</Label>
                <Input
                  id="lat"
                  type="number"
                  step="any"
                  value={form.kantorLat}
                  onChange={(e) => set("kantorLat", Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lng">Longitude</Label>
                <Input
                  id="lng"
                  type="number"
                  step="any"
                  value={form.kantorLng}
                  onChange={(e) => set("kantorLng", Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="radius">Radius (meter)</Label>
                <Input
                  id="radius"
                  type="number"
                  min={10}
                  value={form.kantorRadiusMeter}
                  onChange={(e) => set("kantorRadiusMeter", Number(e.target.value))}
                />
                <p className="text-[10px] text-muted-foreground">Radius dalam meter</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="jamMasuk" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Jam Masuk (Fixed)
              </Label>
              <Input
                id="jamMasuk"
                type="time"
                value={form.jamMasukFixed}
                onChange={(e) => set("jamMasukFixed", e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Batas tepat waktu: sampai menit ke-0 + toleransi
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jamPulang" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Jam Pulang (Fixed)
              </Label>
              <Input
                id="jamPulang"
                type="time"
                value={form.jamPulangFixed}
                onChange={(e) => set("jamPulangFixed", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="toleransi">Toleransi Terlambat (menit)</Label>
              <Input
                id="toleransi"
                type="number"
                min={0}
                value={form.toleransiTerlambatMenit}
                onChange={(e) => set("toleransiTerlambatMenit", Number(e.target.value))}
              />
              <p className="text-[10px] text-muted-foreground">Berlaku fixed & flexible</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="windowMin">Check-in Window Min (menit)</Label>
              <Input
                id="windowMin"
                type="number"
                min={0}
                value={form.checkInWindowMin}
                onChange={(e) => set("checkInWindowMin", Number(e.target.value))}
              />
              <p className="text-[10px] text-muted-foreground">
                Toleransi setelah jam mulai sesi
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="windowMax">Check-in Window Max (menit)</Label>
              <Input
                id="windowMax"
                type="number"
                min={1}
                value={form.checkInWindowMax}
                onChange={(e) => set("checkInWindowMax", Number(e.target.value))}
              />
              <p className="text-[10px] text-muted-foreground">
                Check-in dibuka X menit sebelum sesi
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              disabled={saveMut.isPending || !form.namaPerusahaan}
              onClick={() => saveMut.mutate(form)}
            >
              <Save className="mr-2 h-4 w-4" />
              {saveMut.isPending ? "Menyimpan..." : "Simpan Pengaturan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ringkasan Aturan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs font-semibold text-sky-700 dark:text-sky-300">
              Staf (Fixed Time)
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Absen{" "}
              <span className="font-medium text-foreground">
                {form.jamMasukFixed}–{form.jamPulangFixed}
              </span>
              . Dianggap tepat waktu sampai{" "}
              <span className="font-medium text-foreground">{onTimeLimit}</span>{" "}
              (toleransi {form.toleransiTerlambatMenit} menit).
            </p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
              Tutor (Flexible Time)
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Check-in dibuka{" "}
              <span className="font-medium text-foreground">
                {form.checkInWindowMax} menit
              </span>{" "}
              sebelum sesi, tertutup{" "}
              <span className="font-medium text-foreground">
                {form.checkInWindowMin} menit
              </span>{" "}
              setelah jam mulai. Terlambat jika setelah menit ke-0 + toleransi{" "}
              {form.toleransiTerlambatMenit} menit.
            </p>
          </div>
          <Alert>
            <MapPin className="h-4 w-4" />
            <AlertTitle>Validasi GPS</AlertTitle>
            <AlertDescription className="text-xs">
              Radius kantor {form.kantorRadiusMeter} m dari koordinat (
              {form.kantorLat}, {form.kantorLng}) diberlakukan pada staf fixed-time.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------- Tab 2: Hari Libur ----------------
function HariLiburTab() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["hari-libur"],
    queryFn: () => apiFetch<HariLibur[]>("/api/hari-libur"),
  })

  const [form, setForm] = useState({ tanggal: "", nama: "", recurring: false })
  const [delId, setDelId] = useState<string | null>(null)

  const addMut = useMutation({
    mutationFn: (payload: typeof form) =>
      apiFetch("/api/hari-libur", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast.success("Hari libur ditambahkan")
      qc.invalidateQueries({ queryKey: ["hari-libur"] })
      setForm({ tanggal: "", nama: "", recurring: false })
    },
    onError: (e: any) => toast.error(e.message),
  })

  const delMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/hari-libur/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Hari libur dihapus")
      qc.invalidateQueries({ queryKey: ["hari-libur"] })
      setDelId(null)
    },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarPlus className="h-4 w-4 text-primary" />
            Tambah Hari Libur
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[180px_1fr_auto_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="libur-tanggal">Tanggal</Label>
              <Input
                id="libur-tanggal"
                type="date"
                value={form.tanggal}
                onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="libur-nama">Nama Hari Libur</Label>
              <Input
                id="libur-nama"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                placeholder="mis. Tahun Baru Imlek"
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <Switch
                  id="libur-recurring"
                  checked={form.recurring}
                  onCheckedChange={(c) => setForm({ ...form, recurring: c })}
                />
                <Label htmlFor="libur-recurring" className="cursor-pointer text-xs">
                  Tahunan
                </Label>
              </div>
            </div>
            <div className="flex items-end">
              <Button
                className="w-full lg:w-auto"
                disabled={addMut.isPending || !form.tanggal || !form.nama}
                onClick={() => addMut.mutate(form)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {addMut.isPending ? "Menyimpan..." : "Tambah"}
              </Button>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Centang &quot;Tahunan&quot; jika libur berulang setiap tahun pada tanggal yang sama
            (mis. hari libur nasional).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Hari Libur</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">
              <LoadingState rows={4} />
            </div>
          ) : data && data.length > 0 ? (
            <div className="max-h-[28rem] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead className="pl-4">Tanggal</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead className="w-[120px]">Tipe</TableHead>
                    <TableHead className="w-[60px] pr-4 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="pl-4 font-medium">
                        {formatTanggalSingkat(h.tanggal)}
                      </TableCell>
                      <TableCell>{h.nama}</TableCell>
                      <TableCell>
                        {h.recurring ? (
                          <Badge
                            variant="outline"
                            className="bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20"
                          >
                            Tahunan
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground">
                            Sekali
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950"
                          onClick={() => setDelId(h.id)}
                          aria-label="Hapus hari libur"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-4">
              <EmptyState
                icon={CalendarDays}
                title="Belum ada hari libur"
                description="Tambahkan tanggal libur nasional atau libur khusus."
              />
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus hari libur ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Hari libur akan dihapus permanen.
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

// ---------------- Tab 3: Cuti ----------------
function CutiTab() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["cuti"],
    queryFn: () => apiFetch<Cuti[]>("/api/cuti"),
  })
  const { data: karyawanList } = useQuery({
    queryKey: ["karyawan", "all"],
    queryFn: () => apiFetch<Karyawan[]>("/api/karyawan"),
  })

  const [openAdd, setOpenAdd] = useState(false)
  const [delId, setDelId] = useState<string | null>(null)
  const [form, setForm] = useState({
    karyawanId: "",
    tanggalMulai: "",
    tanggalSelesai: "",
    alasan: "",
  })

  const resetForm = () =>
    setForm({ karyawanId: "", tanggalMulai: "", tanggalSelesai: "", alasan: "" })

  const addMut = useMutation({
    mutationFn: (payload: {
      karyawanId: string
      tanggalMulai: string
      tanggalSelesai: string
      alasan: string
      status: CutiStatus
    }) =>
      apiFetch("/api/cuti", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast.success("Pengajuan cuti dibuat")
      qc.invalidateQueries({ queryKey: ["cuti"] })
      setOpenAdd(false)
      resetForm()
    },
    onError: (e: any) => toast.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CutiStatus }) =>
      apiFetch(`/api/cuti/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
    onSuccess: (_d, vars) => {
      toast.success(vars.status === "APPROVED" ? "Cuti disetujui" : "Cuti ditolak")
      qc.invalidateQueries({ queryKey: ["cuti"] })
    },
    onError: (e: any) => toast.error(e.message),
  })

  const delMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/cuti/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Cuti dihapus")
      qc.invalidateQueries({ queryKey: ["cuti"] })
      setDelId(null)
    },
    onError: (e: any) => toast.error(e.message),
  })

  const handleOpenChange = (o: boolean) => {
    setOpenAdd(o)
    if (!o) resetForm()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpenAdd(true)}>
          <Plus className="mr-2 h-4 w-4" /> Ajukan Cuti
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palmtree className="h-4 w-4 text-primary" />
            Daftar Pengajuan Cuti
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">
              <LoadingState rows={5} />
            </div>
          ) : data && data.length > 0 ? (
            <div className="max-h-[32rem] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead className="pl-4">Karyawan</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                    <TableHead className="w-[140px] pr-4 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((c) => {
                    const sameDay =
                      toDateInput(c.tanggalMulai) === toDateInput(c.tanggalSelesai)
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="pl-4">
                          <div className="font-medium">{c.karyawan?.nama || "—"}</div>
                          {c.karyawan?.tipe && (
                            <span className="text-[10px] text-muted-foreground">
                              {c.karyawan.tipe === "FIXED" ? "Staf" : "Tutor"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {sameDay ? (
                            formatTanggalSingkat(c.tanggalMulai)
                          ) : (
                            <span className="whitespace-nowrap">
                              {formatTanggalSingkat(c.tanggalMulai)} —{" "}
                              {formatTanggalSingkat(c.tanggalSelesai)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[16rem]">
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {c.alasan}
                          </p>
                        </TableCell>
                        <TableCell>
                          <CutiStatusBadge status={c.status} />
                        </TableCell>
                        <TableCell className="pr-4">
                          <div className="flex items-center justify-end gap-1">
                            {c.status === "PENDING" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950"
                                  disabled={updateMut.isPending}
                                  onClick={() =>
                                    updateMut.mutate({ id: c.id, status: "APPROVED" })
                                  }
                                  aria-label="Setujui cuti"
                                  title="Setujui"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950"
                                  disabled={updateMut.isPending}
                                  onClick={() =>
                                    updateMut.mutate({ id: c.id, status: "REJECTED" })
                                  }
                                  aria-label="Tolak cuti"
                                  title="Tolak"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted hover:text-rose-600"
                              onClick={() => setDelId(c.id)}
                              aria-label="Hapus cuti"
                              title="Hapus"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-4">
              <EmptyState
                icon={Plane}
                title="Belum ada pengajuan cuti"
                description="Buat pengajuan cuti baru untuk karyawan."
                action={
                  <Button size="sm" onClick={() => setOpenAdd(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Ajukan Cuti
                  </Button>
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      <CutiDialog
        open={openAdd}
        onOpenChange={handleOpenChange}
        form={form}
        setForm={setForm}
        karyawanList={karyawanList || []}
        onSubmit={(payload) => addMut.mutate(payload)}
        saving={addMut.isPending}
      />

      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pengajuan cuti ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data cuti akan dihapus permanen.
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

// ---------------- Cuti Dialog ----------------
function CutiDialog({
  open,
  onOpenChange,
  form,
  setForm,
  karyawanList,
  onSubmit,
  saving,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  form: {
    karyawanId: string
    tanggalMulai: string
    tanggalSelesai: string
    alasan: string
  }
  setForm: (f: {
    karyawanId: string
    tanggalMulai: string
    tanggalSelesai: string
    alasan: string
  }) => void
  karyawanList: Karyawan[]
  onSubmit: (payload: {
    karyawanId: string
    tanggalMulai: string
    tanggalSelesai: string
    alasan: string
    status: CutiStatus
  }) => void
  saving: boolean
}) {
  const valid =
    form.karyawanId &&
    form.tanggalMulai &&
    form.tanggalSelesai &&
    form.alasan.length >= 2 &&
    form.tanggalMulai <= form.tanggalSelesai

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajukan Cuti Karyawan</DialogTitle>
          <DialogDescription>
            Pengajuan cuti akan berstatus PENDING sampai disetujui/ditolak admin.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cuti-karyawan">Karyawan</Label>
            <Select
              value={form.karyawanId}
              onValueChange={(v) => setForm({ ...form, karyawanId: v })}
            >
              <SelectTrigger id="cuti-karyawan" className="w-full">
                <SelectValue placeholder="Pilih karyawan..." />
              </SelectTrigger>
              <SelectContent>
                {karyawanList.map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.nama}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({k.tipe === "FIXED" ? "Staf" : "Tutor"})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cuti-mulai">Tanggal Mulai</Label>
              <Input
                id="cuti-mulai"
                type="date"
                value={form.tanggalMulai}
                onChange={(e) =>
                  setForm({ ...form, tanggalMulai: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cuti-selesai">Tanggal Selesai</Label>
              <Input
                id="cuti-selesai"
                type="date"
                value={form.tanggalSelesai}
                min={form.tanggalMulai || undefined}
                onChange={(e) =>
                  setForm({ ...form, tanggalSelesai: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cuti-alasan">Alasan Cuti</Label>
            <Textarea
              id="cuti-alasan"
              value={form.alasan}
              onChange={(e) => setForm({ ...form, alasan: e.target.value })}
              placeholder="Mis. Sakit, urusan keluarga, dll."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            disabled={saving || !valid}
            onClick={() => onSubmit({ ...form, status: "PENDING" })}
          >
            {saving ? "Menyimpan..." : "Ajukan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
