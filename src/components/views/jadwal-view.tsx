"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api-client"
import {
  PageHeader,
  LoadingState,
  EmptyState,
  StatusSesiBadge,
} from "@/components/shared/ui"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CalendarDays,
  Plus,
  Pencil,
  Ban,
  Clock,
  AlertTriangle,
  ArrowRightLeft,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  User,
  BookOpen,
  Coins,
} from "lucide-react"
import { toast } from "sonner"
import {
  formatJam,
  formatTanggal,
  formatTanggalSingkat,
  formatRupiah,
  NAMA_HARI,
  NAMA_HARI_SINGKAT,
} from "@/lib/constants"
import { hitungHonorSesi, formatDateKey } from "@/lib/schedule"
import { cn } from "@/lib/utils"

// ---------------- Types ----------------
type Tutor = {
  id: string
  nama: string
  email: string | null
  tipe: string
  status: string
}
type Program = {
  id: string
  nama: string
  tarifPerJam: number
  deskripsi: string | null
  warna: string | null
  status: string
}
type Siswa = {
  id: string
  nama: string
  telepon: string | null
}
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
  tutor: Tutor
  program: Program
  siswa: Siswa
}

// ---------------- Date helpers (inline) ----------------
function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function shiftDays(d: Date, days: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

function getWeekRange(d: Date): { monday: Date; sunday: Date } {
  const day = d.getDay() // 0 = Sunday
  const monday = startOfDay(shiftDays(d, -((day + 6) % 7)))
  const sunday = startOfDay(shiftDays(monday, 6))
  return { monday, sunday }
}

function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => shiftDays(monday, i))
}

// Build ISO datetime string combining a date-only key (YYYY-MM-DD) and time (HH:mm)
function toIsoDateTime(dateKey: string, time: string): string {
  return new Date(`${dateKey}T${time}:00`).toISOString()
}

function toDateKey(d: Date): string {
  return formatDateKey(d)
}

function timeFromDate(iso: string): string {
  const d = new Date(iso)
  const h = String(d.getHours()).padStart(2, "0")
  const m = String(d.getMinutes()).padStart(2, "0")
  return `${h}:${m}`
}

// =================================================================
// Main JadwalView
// =================================================================
export function JadwalView() {
  const qc = useQueryClient()

  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()))
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily")
  const [tutorFilter, setTutorFilter] = useState<string>("ALL")

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Sesi | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Sesi | null>(null)
  const [rescheduleTarget, setRescheduleTarget] = useState<Sesi | null>(null)

  // ---- Lookups ----
  const tutorsQ = useQuery({
    queryKey: ["karyawan", "FLEXIBLE"],
    queryFn: () => apiFetch<Tutor[]>("/api/karyawan?tipe=FLEXIBLE"),
  })
  const programsQ = useQuery({
    queryKey: ["programs"],
    queryFn: () => apiFetch<Program[]>("/api/program"),
  })
  const siswaQ = useQuery({
    queryKey: ["siswa"],
    queryFn: () => apiFetch<Siswa[]>("/api/siswa"),
  })

  // ---- Sessions for the selected date / week ----
  const dateKey = toDateKey(selectedDate)
  const { monday, sunday } = useMemo(() => getWeekRange(selectedDate), [selectedDate])
  const dariKey = toDateKey(monday)
  const sampaiKey = toDateKey(sunday)

  const dailyQ = useQuery({
    queryKey: ["sesi", "daily", dateKey, tutorFilter],
    enabled: viewMode === "daily",
    queryFn: () =>
      apiFetch<Sesi[]>(
        `/api/sesi?tanggal=${dateKey}${
          tutorFilter !== "ALL" ? `&tutorId=${tutorFilter}` : ""
        }`,
      ),
  })
  const weeklyQ = useQuery({
    queryKey: ["sesi", "weekly", dariKey, sampaiKey, tutorFilter],
    enabled: viewMode === "weekly",
    queryFn: () =>
      apiFetch<Sesi[]>(
        `/api/sesi?dari=${dariKey}&sampai=${sampaiKey}${
          tutorFilter !== "ALL" ? `&tutorId=${tutorFilter}` : ""
        }`,
      ),
  })

  const sessions = viewMode === "daily" ? dailyQ.data ?? [] : weeklyQ.data ?? []
  const isLoading = viewMode === "daily" ? dailyQ.isLoading : weeklyQ.isLoading

  // ---- Mutations ----
  const saveMut = useMutation({
    mutationFn: async (payload: {
      tanggal: string
      jamMulai: string
      jamSelesai: string
      tutorId: string
      programId: string
      siswaId: string
      catatan?: string | null
    }) => {
      if (editing) {
        return apiFetch<Sesi>(`/api/sesi/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        })
      }
      return apiFetch<Sesi>("/api/sesi", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => {
      toast.success(editing ? "Sesi diperbarui" : "Sesi ditambahkan")
      qc.invalidateQueries({ queryKey: ["sesi"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
      setFormOpen(false)
      setEditing(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const cancelMut = useMutation({
    mutationFn: async ({
      id,
      assignReplacementTo,
    }: {
      id: string
      assignReplacementTo?: string | null
    }) =>
      apiFetch<{ cancelled: boolean; replacement: any }>(
        `/api/sesi/${id}/cancel`,
        {
          method: "POST",
          body: JSON.stringify({ assignReplacementTo }),
        },
      ),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["sesi"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
      if (data.replacement?.assigned) {
        toast.success("Sesi dibatalkan & tutor pengganti ditugaskan")
      } else {
        toast.success("Sesi dibatalkan")
      }
      setCancelTarget(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const rescheduleMut = useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string
      body: Record<string, unknown>
    }) => apiFetch<any>(`/api/sesi/${id}/reschedule`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
    onSuccess: (data, vars) => {
      if (data?.rescheduled) {
        toast.success("Sesi dijadwalkan ulang")
        qc.invalidateQueries({ queryKey: ["sesi"] })
        qc.invalidateQueries({ queryKey: ["dashboard"] })
        setRescheduleTarget(null)
      } else if (vars.body.newJamMulai) {
        // Manual reschedule attempt that hit a conflict
        const alt = data?.alternativeTutors ?? []
        if (alt.length > 0) {
          toast.error(
            `Tutor bentrok. Tutor tersedia: ${alt
              .map((a: any) => a.nama)
              .join(", ")}`,
          )
        } else {
          toast.error(data?.message || "Tutor bentrok dengan sesi lain.")
        }
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // ---- Handlers ----
  function goPrev() {
    setSelectedDate((d) =>
      viewMode === "daily" ? shiftDays(d, -1) : shiftDays(d, -7),
    )
  }
  function goNext() {
    setSelectedDate((d) =>
      viewMode === "daily" ? shiftDays(d, 1) : shiftDays(d, 7),
    )
  }
  function goToday() {
    setSelectedDate(startOfDay(new Date()))
  }

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }
  function openEdit(s: Sesi) {
    setEditing(s)
    setFormOpen(true)
  }

  // Group weekly sessions by date key for quick lookup
  const weeklyByDay = useMemo(() => {
    const map: Record<string, Sesi[]> = {}
    for (const s of sessions) {
      const k = toDateKey(new Date(s.tanggal))
      ;(map[k] ||= []).push(s)
    }
    return map
  }, [sessions])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Penjadwalan Sesi"
        description="Jadwalkan sesi tutor flexible time"
        icon={CalendarDays}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Sesi
          </Button>
        }
      />

      {/* Toolbar */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Date navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goPrev}
              aria-label="Sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday}>
              Hari Ini
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={goNext}
              aria-label="Berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="ml-1 min-w-0">
              {viewMode === "daily" ? (
                <p className="truncate text-sm font-semibold">
                  {formatTanggal(selectedDate)}
                </p>
              ) : (
                <p className="truncate text-sm font-semibold">
                  {formatTanggalSingkat(monday)} — {formatTanggalSingkat(sunday)}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {NAMA_HARI[selectedDate.getDay()]},{" "}
                {viewMode === "weekly"
                  ? `${sessions.length} sesi minggu ini`
                  : `${sessions.length} sesi`}
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            {/* Tutor filter */}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Select value={tutorFilter} onValueChange={setTutorFilter}>
                <SelectTrigger className="w-[200px]" size="sm">
                  <SelectValue placeholder="Semua Tutor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Tutor</SelectItem>
                  {(tutorsQ.data ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* View toggle */}
            <Tabs
              value={viewMode}
              onValueChange={(v) => setViewMode(v as "daily" | "weekly")}
            >
              <TabsList>
                <TabsTrigger value="daily">Harian</TabsTrigger>
                <TabsTrigger value="weekly">Mingguan</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Main content */}
      {isLoading ? (
        <LoadingState rows={4} />
      ) : viewMode === "daily" ? (
        <DailyView
          sessions={sessions}
          onEdit={openEdit}
          onCancel={(s) => setCancelTarget(s)}
          onReschedule={(s) => setRescheduleTarget(s)}
          emptyAction={
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Tambah Sesi
            </Button>
          }
        />
      ) : (
        <WeeklyView
          days={weekDays(monday)}
          byDay={weeklyByDay}
          selectedKey={dateKey}
          onPickDay={(d) => {
            setSelectedDate(d)
            setViewMode("daily")
          }}
        />
      )}

      {/* Dialogs */}
      <SesiFormDialog
        key={`${editing?.id || "new"}-${formOpen}`}
        open={formOpen}
        editing={editing}
        defaultDate={selectedDate}
        tutors={tutorsQ.data ?? []}
        programs={programsQ.data ?? []}
        siswaList={siswaQ.data ?? []}
        onOpenChange={(o) => {
          setFormOpen(o)
          if (!o) setEditing(null)
        }}
        onSubmit={(payload) => saveMut.mutate(payload)}
        saving={saveMut.isPending}
      />

      <CancelDialog
        key={cancelTarget?.id || "cancel-none"}
        target={cancelTarget}
        tutors={tutorsQ.data ?? []}
        onCancel={(assignReplacementTo) =>
          cancelTarget &&
          cancelMut.mutate({ id: cancelTarget.id, assignReplacementTo })
        }
        onOpenChange={(o) => !o && setCancelTarget(null)}
        pending={cancelMut.isPending}
      />

      <RescheduleDialog
        key={rescheduleTarget?.id || "reschedule-none"}
        target={rescheduleTarget}
        onOpenChange={(o) => !o && setRescheduleTarget(null)}
        onSubmit={(body) =>
          rescheduleTarget && rescheduleMut.mutate({ id: rescheduleTarget.id, body })
        }
        pending={rescheduleMut.isPending}
      />
    </div>
  )
}

// =================================================================
// DailyView — vertical agenda
// =================================================================
function DailyView({
  sessions,
  onEdit,
  onCancel,
  onReschedule,
  emptyAction,
}: {
  sessions: Sesi[]
  onEdit: (s: Sesi) => void
  onCancel: (s: Sesi) => void
  onReschedule: (s: Sesi) => void
  emptyAction?: React.ReactNode
}) {
  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Tidak ada sesi"
        description="Belum ada sesi terjadwal pada tanggal ini."
        action={emptyAction}
      />
    )
  }

  return (
    <div className="space-y-2">
      {sessions.map((s) => (
        <SesiRow
          key={s.id}
          sesi={s}
          onEdit={() => onEdit(s)}
          onCancel={() => onCancel(s)}
          onReschedule={() => onReschedule(s)}
        />
      ))}
    </div>
  )
}

function SesiRow({
  sesi,
  onEdit,
  onCancel,
  onReschedule,
}: {
  sesi: Sesi
  onEdit: () => void
  onCancel: () => void
  onReschedule: () => void
}) {
  const mulai = new Date(sesi.jamMulai)
  const selesai = new Date(sesi.jamSelesai)
  const honor = hitungHonorSesi(mulai, selesai, sesi.tarifSnapshot)
  const isCancelled = sesi.status === "DIBATALKAN"

  return (
    <Card className={cn("overflow-hidden", isCancelled && "opacity-60")}>
      <div className="flex">
        {/* colored left bar */}
        <div
          className="w-1.5 shrink-0"
          style={{ background: sesi.program.warna || "#94a3b8" }}
        />
        <CardContent className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold tabular-nums">
                  {formatJam(mulai)} — {formatJam(selesai)}
                </p>
                <p className="text-base font-bold leading-tight">
                  {sesi.program.nama}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" /> {sesi.tutor.nama}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="h-3 w-3" /> {sesi.siswa.nama}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusSesiBadge status={sesi.status} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="sr-only">Aksi</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden
                    >
                      <circle cx="12" cy="5" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="12" cy="19" r="1.5" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onReschedule}
                    disabled={isCancelled || sesi.status === "SELESAI"}
                  >
                    <ArrowRightLeft className="mr-2 h-4 w-4" /> Reschedule
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onCancel}
                    disabled={isCancelled}
                    className="text-rose-600 focus:text-rose-600"
                  >
                    <Ban className="mr-2 h-4 w-4" /> Batalkan
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <Separator className="my-0.5" />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline" className="font-normal">
                {Math.max(
                  1,
                  Math.round(
                    (selesai.getTime() - mulai.getTime()) / 60000,
                  ),
                )}{" "}
                menit
              </Badge>
              {sesi.catatan && (
                <span className="text-muted-foreground">
                  “{sesi.catatan}”
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-700 dark:text-emerald-300">
              <Coins className="h-3.5 w-3.5" />
              <span className="text-sm font-semibold">{formatRupiah(honor)}</span>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  )
}

// =================================================================
// WeeklyView — 7 columns horizontal
// =================================================================
function WeeklyView({
  days,
  byDay,
  selectedKey,
  onPickDay,
}: {
  days: Date[]
  byDay: Record<string, Sesi[]>
  selectedKey: string
  onPickDay: (d: Date) => void
}) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-[760px] gap-2 lg:min-w-0 lg:grid lg:grid-cols-7">
        {days.map((d) => {
          const k = toDateKey(d)
          const items = byDay[k] ?? []
          const isToday = k === toDateKey(new Date())
          const isSelected = k === selectedKey
          return (
            <button
              key={k}
              onClick={() => onPickDay(d)}
              className={cn(
                "flex min-w-[120px] flex-col gap-1.5 rounded-lg border p-2 text-left transition-colors hover:bg-accent lg:min-w-0",
                isSelected && "border-primary ring-1 ring-primary",
                isToday && "border-primary/50",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {NAMA_HARI_SINGKAT[d.getDay()]}
                </span>
                <span
                  className={cn(
                    "text-sm font-bold",
                    isToday && "text-primary",
                  )}
                >
                  {d.getDate()}
                </span>
              </div>
              <Separator className="my-0.5" />
              {items.length === 0 ? (
                <p className="px-1 py-2 text-center text-[10px] text-muted-foreground">
                  —
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  {items.slice(0, 4).map((s) => (
                    <div
                      key={s.id}
                      className="rounded-md px-1.5 py-1 text-[10px] leading-tight"
                      style={{
                        background: `${s.program.warna || "#94a3b8"}22`,
                        borderLeft: `3px solid ${s.program.warna || "#94a3b8"}`,
                      }}
                    >
                      <p className="font-semibold tabular-nums">
                        {formatJam(new Date(s.jamMulai))}
                      </p>
                      <p className="truncate font-medium">
                        {s.program.nama}
                      </p>
                      <p className="truncate text-muted-foreground">
                        {s.tutor.nama}
                      </p>
                    </div>
                  ))}
                  {items.length > 4 && (
                    <p className="px-1 text-[10px] text-muted-foreground">
                      +{items.length - 4} lainnya
                    </p>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// =================================================================
// SesiFormDialog — create / edit
// =================================================================
function SesiFormDialog({
  open,
  editing,
  defaultDate,
  tutors,
  programs,
  siswaList,
  onOpenChange,
  onSubmit,
  saving,
}: {
  open: boolean
  editing: Sesi | null
  defaultDate: Date
  tutors: Tutor[]
  programs: Program[]
  siswaList: Siswa[]
  onOpenChange: (o: boolean) => void
  onSubmit: (payload: {
    tanggal: string
    jamMulai: string
    jamSelesai: string
    tutorId: string
    programId: string
    siswaId: string
    catatan?: string | null
  }) => void
  saving: boolean
}) {
  // Form state initialized lazily from editing/defaultDate (component remounts on key change)
  const [date, setDate] = useState<Date>(() =>
    editing ? startOfDay(new Date(editing.tanggal)) : startOfDay(defaultDate),
  )
  const [jamMulai, setJamMulai] = useState(() =>
    editing ? timeFromDate(editing.jamMulai) : "16:00",
  )
  const [jamSelesai, setJamSelesai] = useState(() =>
    editing ? timeFromDate(editing.jamSelesai) : "18:00",
  )
  const [tutorId, setTutorId] = useState(() => editing?.tutorId || "")
  const [programId, setProgramId] = useState(() => editing?.programId || "")
  const [siswaId, setSiswaId] = useState(() => editing?.siswaId || "")
  const [catatan, setCatatan] = useState(() => editing?.catatan || "")
  const [calOpen, setCalOpen] = useState(false)

  const selectedProgram = programs.find((p) => p.id === programId)
  const dateKey = toDateKey(date)

  const honorPreview = useMemo(() => {
    if (!selectedProgram || !jamMulai || !jamSelesai) return null
    try {
      const m = new Date(`${dateKey}T${jamMulai}:00`)
      const s = new Date(`${dateKey}T${jamSelesai}:00`)
      if (s <= m) return null
      return hitungHonorSesi(m, s, selectedProgram.tarifPerJam)
    } catch {
      return null
    }
  }, [selectedProgram, jamMulai, jamSelesai, dateKey])

  const valid =
    tutorId && programId && siswaId && jamMulai && jamSelesai && jamSelesai > jamMulai

  function handleSubmit() {
    if (!valid) {
      toast.error("Lengkapi semua field dan pastikan jam selesai setelah jam mulai")
      return
    }
    onSubmit({
      tanggal: `${dateKey}T00:00:00`,
      jamMulai: toIsoDateTime(dateKey, jamMulai),
      jamSelesai: toIsoDateTime(dateKey, jamSelesai),
      tutorId,
      programId,
      siswaId,
      catatan: catatan || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Sesi" : "Tambah Sesi"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Perbarui detail sesi. Perubahan jam dapat memicu bentrok."
              : "Isi detail sesi tutor. Sistem akan mendeteksi bentrok otomatis."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tanggal */}
          <div className="space-y-1.5">
            <Label>Tanggal</Label>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {formatTanggalSingkat(date)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    if (d) {
                      setDate(startOfDay(d))
                      setCalOpen(false)
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Jam */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="jamMulai">Jam Mulai</Label>
              <Input
                id="jamMulai"
                type="time"
                value={jamMulai}
                onChange={(e) => setJamMulai(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jamSelesai">Jam Selesai</Label>
              <Input
                id="jamSelesai"
                type="time"
                value={jamSelesai}
                onChange={(e) => setJamSelesai(e.target.value)}
              />
            </div>
          </div>

          {/* Tutor */}
          <div className="space-y-1.5">
            <Label>Tutor</Label>
            <Select value={tutorId} onValueChange={setTutorId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih tutor flexible" />
              </SelectTrigger>
              <SelectContent>
                {tutors
                  .filter((t) => t.status === "AKTIF")
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nama}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Program */}
          <div className="space-y-1.5">
            <Label>Program</Label>
            <Select value={programId} onValueChange={setProgramId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih program" />
              </SelectTrigger>
              <SelectContent>
                {programs
                  .filter((p) => p.status === "AKTIF")
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nama} — {formatRupiah(p.tarifPerJam)}/jam
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Honor preview */}
          {selectedProgram && (
            <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Coins className="h-4 w-4 text-emerald-600" />
                <span>
                  Tarif {formatRupiah(selectedProgram.tarifPerJam)}/jam × durasi
                </span>
              </div>
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                {honorPreview != null ? formatRupiah(honorPreview) : "—"}
              </span>
            </div>
          )}

          {/* Siswa */}
          <div className="space-y-1.5">
            <Label>Siswa</Label>
            <Select value={siswaId} onValueChange={setSiswaId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih siswa" />
              </SelectTrigger>
              <SelectContent>
                {siswaList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Catatan */}
          <div className="space-y-1.5">
            <Label htmlFor="catatan">Catatan (opsional)</Label>
            <Textarea
              id="catatan"
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Catatan tambahan..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button disabled={saving || !valid} onClick={handleSubmit}>
            {saving ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Tambah Sesi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =================================================================
// CancelDialog — AlertDialog with optional replacement tutor
// =================================================================
function CancelDialog({
  target,
  tutors,
  onCancel,
  onOpenChange,
  pending,
}: {
  target: Sesi | null
  tutors: Tutor[]
  onCancel: (assignReplacementTo: string | null) => void
  onOpenChange: (o: boolean) => void
  pending: boolean
}) {
  const [assign, setAssign] = useState(false)
  const [replacement, setReplacement] = useState<string>("")

  const eligibleTutors = tutors.filter(
    (t) => t.status === "AKTIF" && t.id !== target?.tutorId,
  )

  return (
    <AlertDialog
      open={!!target}
      onOpenChange={(o) => {
        onOpenChange(o)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Batalkan sesi ini?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {target && (
              <>
                Sesi <strong>{target.program.nama}</strong> (
                {formatJam(new Date(target.jamMulai))} —{" "}
                {formatJam(new Date(target.jamSelesai))}) bersama{" "}
                <strong>{target.tutor.nama}</strong> akan dibatalkan. Tindakan ini
                tidak dapat dibatalkan.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          <label className="flex items-start gap-3 rounded-md border p-3 hover:bg-accent">
            <input
              type="checkbox"
              checked={assign}
              onChange={(e) => setAssign(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <div className="flex-1">
              <p className="text-sm font-medium">Tugaskan tutor pengganti</p>
              <p className="text-xs text-muted-foreground">
                Buat sesi baru pada jam yang sama dengan tutor lain.
              </p>
            </div>
          </label>

          {assign && (
            <div className="space-y-1.5">
              <Label>Tutor Pengganti</Label>
              <Select value={replacement} onValueChange={setReplacement}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih tutor pengganti" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleTutors.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {eligibleTutors.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Tidak ada tutor aktif lain yang tersedia.
                </p>
              )}
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            disabled={
              pending || (assign && !replacement)
            }
            onClick={() => onCancel(assign && replacement ? replacement : null)}
            className="bg-rose-600 hover:bg-rose-700"
          >
            {pending ? "Memproses..." : "Ya, Batalkan"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// =================================================================
// RescheduleDialog — suggested slots + alt tutors + manual override
// =================================================================
type SuggestedSlot = {
  tanggal: string
  jamMulai: string
  jamSelesai: string
  tutorId: string
  tutorNama: string
}
type AltTutor = { id: string; nama: string }
type RescheduleResponse = {
  rescheduled?: boolean
  suggestedSlots?: SuggestedSlot[]
  alternativeTutors?: AltTutor[]
  conflict?: boolean
  message?: string
  sesi?: Sesi
}

function RescheduleDialog({
  target,
  onOpenChange,
  onSubmit,
  pending,
}: {
  target: Sesi | null
  onOpenChange: (o: boolean) => void
  onSubmit: (body: Record<string, unknown>) => void
  pending: boolean
}) {
  // Fetch suggestions via query (enabled when target is set)
  const sugQ = useQuery({
    queryKey: ["reschedule-suggestions", target?.id],
    queryFn: () =>
      apiFetch<RescheduleResponse>(`/api/sesi/${target!.id}/reschedule`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    enabled: !!target,
    staleTime: 0,
  })
  const loading = sugQ.isFetching
  const data = sugQ.data
  const suggestions = data && !data.rescheduled ? data.suggestedSlots ?? [] : []
  const altTutors = data && !data.rescheduled ? data.alternativeTutors ?? [] : []

  // Manual override form — initialized lazily from target (component remounts on target change via key)
  const [mDate, setMDate] = useState<Date>(() =>
    target ? startOfDay(new Date(target.tanggal)) : new Date(),
  )
  const [mMulai, setMMulai] = useState(() =>
    target ? timeFromDate(target.jamMulai) : "16:00",
  )
  const [mSelesai, setMSelesai] = useState(() =>
    target ? timeFromDate(target.jamSelesai) : "18:00",
  )
  const [mTutorId, setMTutorId] = useState<string>("")
  const [calOpen, setCalOpen] = useState(false)

  if (!target) return null

  const mDateKey = toDateKey(mDate)

  function applySlot(slot: SuggestedSlot) {
    onSubmit({
      newJamMulai: new Date(slot.jamMulai).toISOString(),
      newJamSelesai: new Date(slot.jamSelesai).toISOString(),
      newTutorId: slot.tutorId,
    })
  }

  function applyAltTutor(t: AltTutor) {
    onSubmit({
      newJamMulai: new Date(target!.jamMulai).toISOString(),
      newJamSelesai: new Date(target!.jamSelesai).toISOString(),
      newTutorId: t.id,
    })
  }

  function applyManual() {
    if (!mMulai || !mSelesai || mSelesai <= mMulai) {
      toast.error("Periksa kembali jam mulai & selesai")
      return
    }
    onSubmit({
      newJamMulai: toIsoDateTime(mDateKey, mMulai),
      newJamSelesai: toIsoDateTime(mDateKey, mSelesai),
      ...(mTutorId ? { newTutorId: mTutorId } : {}),
    })
  }

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Reschedule Sesi
          </DialogTitle>
          <DialogDescription>
            Pilih slot alternatif, tutor pengganti, atau atur jadwal baru manual.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-6">
            <LoadingState rows={3} />
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Current session summary */}
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-semibold">{target.program.nama}</p>
              <p className="text-xs text-muted-foreground">
                {formatTanggal(target.tanggal)} •{" "}
                {formatJam(new Date(target.jamMulai))} —{" "}
                {formatJam(new Date(target.jamSelesai))} • {target.tutor.nama}
              </p>
            </div>

            {/* Suggested slots */}
            <section className="space-y-2">
              <h4 className="text-sm font-medium">
                Slot Tersedia (7 hari ke depan)
              </h4>
              {suggestions.length === 0 ? (
                <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  Tidak ada slot kosong untuk tutor yang sama dalam 7 hari ke
                  depan.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {suggestions.map((slot, i) => (
                    <button
                      key={i}
                      onClick={() => applySlot(slot)}
                      disabled={pending}
                      className="flex items-center justify-between rounded-md border p-2 text-left text-xs transition-colors hover:bg-accent disabled:opacity-50"
                    >
                      <div>
                        <p className="font-semibold">
                          {NAMA_HARI[new Date(slot.tanggal).getDay()]},{" "}
                          {formatTanggalSingkat(new Date(slot.tanggal))}
                        </p>
                        <p className="tabular-nums text-muted-foreground">
                          {formatJam(new Date(slot.jamMulai))} —{" "}
                          {formatJam(new Date(slot.jamSelesai))}
                        </p>
                      </div>
                      <ArrowRightLeft className="h-4 w-4 text-primary" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Alternative tutors */}
            <section className="space-y-2">
              <h4 className="text-sm font-medium">
                Tutor Pengganti (jam yang sama)
              </h4>
              {altTutors.length === 0 ? (
                <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  Tidak ada tutor lain yang tersedia pada jam ini.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {altTutors.map((t) => (
                    <Button
                      key={t.id}
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => applyAltTutor(t)}
                    >
                      <User className="mr-1 h-3.5 w-3.5" /> {t.nama}
                    </Button>
                  ))}
                </div>
              )}
            </section>

            <Separator />

            {/* Manual override */}
            <section className="space-y-3">
              <h4 className="text-sm font-medium">Atur Manual</h4>
              <div className="space-y-1.5">
                <Label>Tanggal Baru</Label>
                <Popover open={calOpen} onOpenChange={setCalOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {formatTanggalSingkat(mDate)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={mDate}
                      onSelect={(d) => {
                        if (d) {
                          setMDate(startOfDay(d))
                          setCalOpen(false)
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="mMulai">Jam Mulai</Label>
                  <Input
                    id="mMulai"
                    type="time"
                    value={mMulai}
                    onChange={(e) => setMMulai(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mSelesai">Jam Selesai</Label>
                  <Input
                    id="mSelesai"
                    type="time"
                    value={mSelesai}
                    onChange={(e) => setMSelesai(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Tutor (opsional — kosongkan untuk tutor saat ini)</Label>
                <Select
                  value={mTutorId}
                  onValueChange={(v) => setMTutorId(v === "__current__" ? "" : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Tutor saat ini" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__current__">
                      Tetap: {target.tutor.nama}
                    </SelectItem>
                    <SelectItem value={target.tutorId} disabled>
                      {target.tutor.nama} (saat ini)
                    </SelectItem>
                    {altTutors.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={applyManual}
                disabled={pending}
                className="w-full"
              >
                {pending ? "Memproses..." : "Terapkan Jadwal Baru"}
              </Button>
            </section>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-1 h-4 w-4" /> Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
