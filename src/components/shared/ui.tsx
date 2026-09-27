"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LucideIcon } from "lucide-react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  STATUS_SESI,
  STATUS_ABSENSI,
  STATUS_PERIODE,
  STATUS_KARYAWAN,
  TIPE_KARYAWAN,
} from "@/lib/constants"

// ---------- Page header ----------
export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
}: {
  title: string
  description?: string
  icon?: LucideIcon
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

// ---------- Stat card ----------
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  accent = "primary",
}: {
  label: string
  value: React.ReactNode
  icon?: LucideIcon
  hint?: string
  accent?: "primary" | "emerald" | "amber" | "rose" | "sky" | "violet"
}) {
  const accents: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  }
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          {Icon && (
            <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", accents[accent])}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- Status badges ----------
const statusSesiVariant: Record<string, string> = {
  TERJADWAL: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
  BERJALAN: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  SELESAI: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  MENUNGGU_KONFIRMASI: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
  DIBATALKAN: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
}

export function StatusSesiBadge({ status }: { status: string }) {
  const label: Record<string, string> = {
    TERJADWAL: "Terjadwal",
    BERJALAN: "Berjalan",
    SELESAI: "Selesai",
    MENUNGGU_KONFIRMASI: "Menunggu Konfirmasi",
    DIBATALKAN: "Dibatalkan",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        statusSesiVariant[status] || "bg-muted text-muted-foreground border-border",
      )}
    >
      {label[status] || status}
    </span>
  )
}

export function StatusAbsensiBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    HADIR: { label: "Hadir", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20" },
    TERLAMBAT: { label: "Terlambat", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20" },
    TIDAK_HADIR: { label: "Tidak Hadir", cls: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20" },
    CUTI: { label: "Cuti", cls: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20" },
    LIBUR: { label: "Libur", cls: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20" },
  }
  const v = map[status] || { label: status, cls: "bg-muted text-muted-foreground border-border" }
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", v.cls)}>
      {v.label}
    </span>
  )
}

export function TipeKaryawanBadge({ tipe }: { tipe: string }) {
  const isFixed = tipe === TIPE_KARYAWAN.FIXED
  return (
    <Badge variant="outline" className={isFixed ? "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300" : "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"}>
      {isFixed ? "Fixed Time" : "Flexible Time"}
    </Badge>
  )
}

export function StatusPeriodeBadge({ status }: { status: string }) {
  const isLocked = status === STATUS_PERIODE.TERKUNCI
  return (
    <Badge variant="outline" className={isLocked ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"}>
      {isLocked ? "Terkunci" : "Draft"}
    </Badge>
  )
}

// ---------- Loading & empty ----------
export function LoadingState({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
      {Icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function StatusKaryawanBadge({ status }: { status: string }) {
  const isActive = status === STATUS_KARYAWAN.AKTIF
  return (
    <Badge variant="outline" className={isActive ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20" : "bg-muted text-muted-foreground"}>
      {isActive ? "Aktif" : "Nonaktif"}
    </Badge>
  )
}

// ---------- Pagination ----------
export function usePagination<T>(items: T[], pageSize = 20) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(page, totalPages)

  const paged = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  )

  // Reset to page 1 whenever the source list changes length
  const reset = () => setPage(1)

  return { paged, page: safePage, totalPages, setPage, reset, total: items.length }
}

export function PaginationBar({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  className,
}: {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (p: number) => void
  className?: string
}) {
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  // Build page number list with ellipsis
  const pages: (number | "…")[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push("…")
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push("…")
    pages.push(totalPages)
  }

  return (
    <div className={cn("flex flex-col items-center gap-2 sm:flex-row sm:justify-between", className)}>
      <p className="text-xs text-muted-foreground">
        {from}–{to} dari <span className="font-medium">{total}</span> data
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="icon"
              className="h-7 w-7 text-xs"
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
