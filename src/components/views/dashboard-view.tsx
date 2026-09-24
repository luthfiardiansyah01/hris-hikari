"use client"

import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api-client"
import { PageHeader, StatCard, StatusSesiBadge, LoadingState, EmptyState } from "@/components/shared/ui"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatJam, formatRupiah, NAMA_BULAN } from "@/lib/constants"
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
} from "lucide-react"
import { useAppStore } from "@/store/app-store"
import { hitungHonorSesi } from "@/lib/schedule"

type DashboardData = {
  tanggal: string
  stats: {
    totalKaryawan: number
    totalTutor: number
    totalStaf: number
    totalProgram: number
    totalSiswa: number
    stafHadir: number
    sesiHariIni: number
    sesiSelesai: number
    sesiMenungguKonfirmasi: number
    totalMenungguKonfirmasi: number
  }
  sesiHariIni: any[]
  absensiHariIni: any[]
  upcoming: any[]
}

export function DashboardView() {
  const { setAdminView } = useAppStore()
  const today = new Date().toISOString().slice(0, 10)
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", today],
    queryFn: () => apiFetch<DashboardData>(`/api/dashboard?tanggal=${today}`),
  })

  if (isLoading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Dashboard" description="Ringkasan aktivitas hari ini" icon={LayoutDashboard} />
        <LoadingState rows={6} />
      </div>
    )
  }

  const stats = data?.stats
  const todayLabel = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description={todayLabel}
        icon={LayoutDashboard}
        actions={
          <Button variant="outline" size="sm" onClick={() => setAdminView("jadwal")}>
            <CalendarDays className="mr-2 h-4 w-4" /> Lihat Jadwal
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Karyawan" value={stats?.totalKaryawan ?? 0} icon={Users} hint={`${stats?.totalStaf ?? 0} staf · ${stats?.totalTutor ?? 0} tutor`} accent="primary" />
        <StatCard label="Sesi Hari Ini" value={stats?.sesiHariIni ?? 0} icon={CalendarDays} hint={`${stats?.sesiSelesai ?? 0} selesai`} accent="sky" />
        <StatCard label="Staf Hadir" value={`${stats?.stafHadir ?? 0}`} icon={Clock} hint="absensi fixed-time hari ini" accent="emerald" />
        <StatCard label="Menunggu Konfirmasi" value={stats?.totalMenungguKonfirmasi ?? 0} icon={AlertTriangle} hint="sesi tutor tanpa/perlu review" accent="amber" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Program Aktif" value={stats?.totalProgram ?? 0} icon={BookOpen} accent="violet" />
        <StatCard label="Total Siswa" value={stats?.totalSiswa ?? 0} icon={GraduationCap} accent="rose" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Today's sessions */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Sesi Hari Ini</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setAdminView("jadwal")}>
                Lihat semua
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data?.sesiHariIni?.length ? (
              <div className="max-h-96 overflow-y-auto">
                {data.sesiHariIni.map((s: any) => {
                  const honor = hitungHonorSesi(new Date(s.jamMulai), new Date(s.jamSelesai), s.tarifSnapshot)
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 border-b px-4 py-3 last:border-0 hover:bg-muted/40"
                    >
                      <div
                        className="h-10 w-1.5 shrink-0 rounded-full"
                        style={{ background: s.program?.warna || "#94a3b8" }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            {formatJam(s.jamMulai)} - {formatJam(s.jamSelesai)}
                          </p>
                          <StatusSesiBadge status={s.status} />
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.program?.nama} · {s.tutor?.nama} · {s.siswa?.nama}
                        </p>
                      </div>
                      {s.status !== "DIBATALKAN" && (
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatRupiah(honor)}</p>
                          <p className="text-[10px] text-muted-foreground">honor</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-6">
                <EmptyState icon={CalendarDays} title="Tidak ada sesi hari ini" description="Jadwalkan sesi baru di menu Penjadwalan" action={<Button size="sm" onClick={() => setAdminView("jadwal")}>Buat Jadwal</Button>} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Staff attendance today */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Absensi Staf Hari Ini</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data?.absensiHariIni?.length ? (
              <div className="max-h-96 overflow-y-auto">
                {data.absensiHariIni.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between border-b px-4 py-3 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{a.karyawan?.nama}</p>
                      <p className="text-xs text-muted-foreground">
                        Masuk: {a.jamMasuk ? formatJam(a.jamMasuk) : "—"} · Pulang: {a.jamPulang ? formatJam(a.jamPulang) : "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusSesiBadge status={a.status === "HADIR" ? "SELESAI" : a.status === "TERLAMBAT" ? "BERJALAN" : "DIBATALKAN"} />
                      {a.terlambatMenit ? (
                        <p className="mt-0.5 text-[10px] text-amber-600">terlambat {a.terlambatMenit} mnt</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6">
                <EmptyState icon={Clock} title="Belum ada absensi" description="Staf fixed-time belum absen hari ini" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Jadwal Mendatang (7 hari)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data?.upcoming?.length ? (
            <div className="max-h-72 overflow-y-auto">
              {data.upcoming.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 border-b px-4 py-2.5 last:border-0">
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-muted text-center">
                    <div className="pt-1 text-[10px] leading-none text-muted-foreground">
                      {NAMA_BULAN[new Date(s.jamMulai).getMonth()].slice(0, 3)}
                    </div>
                    <div className="text-sm font-bold leading-none">
                      {new Date(s.jamMulai).getDate()}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {formatJam(s.jamMulai)} · {s.program?.nama}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.tutor?.nama} · {s.siswa?.nama}
                    </p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState icon={TrendingUp} title="Tidak ada jadwal mendatang" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
