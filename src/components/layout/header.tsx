"use client"

import { useAppStore } from "@/store/app-store"
import { apiFetch } from "@/lib/api-client"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bell, ChevronDown, GraduationCap, Shield, User as UserIcon, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type Switchable = { id: string; nama: string; tipe: string; email: string }

export function Header() {
  const {
    portal,
    setPortal,
    actingKaryawanId,
    actingKaryawanNama,
    actingTipe,
    setActing,
    setAdminView,
    setTutorView,
  } = useAppStore()

  const { data: sessionData } = useQuery({
    queryKey: ["session"],
    queryFn: () => apiFetch<{ user: any; switchable: Switchable[] }>("/api/session"),
  })
  const switchable: Switchable[] = sessionData?.switchable ?? []

  // Notifications (only when acting as a karyawan)
  const { data: notifs } = useQuery({
    queryKey: ["notifikasi", actingKaryawanId],
    queryFn: () =>
      actingKaryawanId !== "admin"
        ? apiFetch<any[]>(`/api/notifikasi?karyawanId=${actingKaryawanId}`)
        : Promise.resolve([]),
    enabled: actingKaryawanId !== "admin",
  })
  const unread = notifs?.filter((n: any) => !n.dibaca).length || 0

  const switchTo = (s: Switchable) => {
    setActing(s.id, s.nama, s.tipe)
    // if it's a tutor, go to tutor portal
    if (s.tipe === "FLEXIBLE") {
      setPortal("TUTOR")
      setTutorView("jadwal-saya")
    }
  }

  const switchToAdmin = () => {
    setActing("admin", "Administrator", null)
    setPortal("ADMIN")
    setAdminView("dashboard")
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-4">
      <div className="flex items-center gap-2 font-semibold">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="h-5 w-5" />
        </div>
        <span className="hidden sm:inline">Bimbel Cerdas</span>
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {/* Portal switcher */}
        <div className="flex items-center rounded-lg border bg-muted/50 p-0.5">
          <Button
            size="sm"
            variant={portal === "ADMIN" ? "default" : "ghost"}
            className="h-7 gap-1.5"
            onClick={() => {
              setPortal("ADMIN")
              setAdminView("dashboard")
            }}
          >
            <Shield className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Admin</span>
          </Button>
          <Button
            size="sm"
            variant={portal === "TUTOR" ? "default" : "ghost"}
            className="h-7 gap-1.5"
            onClick={() => {
              // If acting as admin, switch to first tutor for demo
              if (actingKaryawanId === "admin" && switchable.length) {
                const firstTutor = switchable.find((s) => s.tipe === "FLEXIBLE") || switchable[0]
                if (firstTutor) setActing(firstTutor.id, firstTutor.nama, firstTutor.tipe)
              }
              setPortal("TUTOR")
              setTutorView("jadwal-saya")
            }}
          >
            <UserIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tutor</span>
          </Button>
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="relative h-9 w-9">
              <Bell className="h-4.5 w-4.5" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifikasi</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifs && notifs.length > 0 ? (
              notifs.slice(0, 8).map((n: any) => (
                <DropdownMenuItem
                  key={n.id}
                  className="flex flex-col items-start gap-0.5 py-2"
                  onClick={async () => {
                    if (!n.dibaca) {
                      await apiFetch(`/api/notifikasi/${n.id}/read`, { method: "POST" })
                    }
                  }}
                >
                  <span className="text-sm font-medium">{n.judul}</span>
                  <span className="text-xs text-muted-foreground">{n.pesan}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString("id-ID")}
                  </span>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                Tidak ada notifikasi
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Acting user switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-1.5 px-1.5 sm:pr-3">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/10 text-xs text-primary">
                  {actingKaryawanNama.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <div className="text-xs font-medium leading-tight">{actingKaryawanNama}</div>
                <div className="text-[10px] text-muted-foreground">
                  {actingKaryawanId === "admin" ? "Administrator" : actingTipe === "FIXED" ? "Staf" : "Tutor"}
                </div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Berlakuk sebagai</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={switchToAdmin} className="gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <div className="flex flex-col">
                <span className="text-sm">Administrator</span>
                <span className="text-[10px] text-muted-foreground">Akses penuh</span>
              </div>
              {actingKaryawanId === "admin" && <Badge className="ml-auto">aktif</Badge>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Tutor / Staf
            </DropdownMenuLabel>
            <div className="max-h-64 overflow-y-auto">
              {switchable.map((s) => (
                <DropdownMenuItem key={s.id} onClick={() => switchTo(s)} className="gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-sm">{s.nama}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {s.tipe === "FIXED" ? "Fixed Time" : "Flexible Time"} · {s.email}
                    </span>
                  </div>
                  {actingKaryawanId === s.id && <Badge className="ml-auto">aktif</Badge>}
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
