"use client"

import { useAppStore } from "@/store/app-store"
import { apiFetch, clearSession } from "@/lib/api-client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
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
import { Badge } from "@/components/ui/badge"
import { BadgeCheck, Bell, GraduationCap, LogOut } from "lucide-react"

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
}

function getRoleLabel(role: string, tipe?: string | null) {
  if (role === "ADMIN") return "Administrator"
  if (tipe === "FIXED") return "Staf Tetap"
  if (tipe === "FLEXIBLE") return "Tutor"
  return "Karyawan"
}

function getRoleBadgeClass(role: string, tipe?: string | null) {
  if (role === "ADMIN") return "bg-violet-100 text-violet-700"
  if (tipe === "FLEXIBLE") return "bg-blue-100 text-blue-700"
  return "bg-emerald-100 text-emerald-700"
}

export function Header() {
  const { session, logout, actingKaryawanId } = useAppStore()
  const qc = useQueryClient()

  function handleLogout() {
    clearSession()
    logout()
    qc.clear()
  }

  // Unread notifications for the acting user
  const { data: notifs } = useQuery({
    queryKey: ["notifikasi", actingKaryawanId],
    queryFn: () =>
      actingKaryawanId !== "admin"
        ? apiFetch<any[]>(`/api/notifikasi?karyawanId=${actingKaryawanId}`)
        : Promise.resolve([]),
    enabled: actingKaryawanId !== "admin",
    refetchInterval: 60_000,
  })
  const unread = notifs?.filter((n: any) => !n.dibaca).length ?? 0

  const displayNama = session?.nama  ?? "Administrator"
  const displayRole = session?.role  ?? "ADMIN"
  const displayTipe = session?.tipe  ?? null

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-4">
      {/* Logo */}
      <div className="flex items-center gap-2 font-semibold">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="h-5 w-5" />
        </div>
        <span className="hidden text-sm sm:inline">Bimbel Cerdas</span>
      </div>

      <div className="ml-auto flex items-center gap-2">

        {/* Notifications bell */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="relative h-9 w-9">
              <Bell className="h-[18px] w-[18px]" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifikasi</span>
              {unread > 0 && (
                <Badge variant="secondary" className="text-xs">{unread} belum dibaca</Badge>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifs && notifs.length > 0 ? (
              <div className="max-h-72 overflow-y-auto">
                {notifs.slice(0, 10).map((n: any) => (
                  <DropdownMenuItem
                    key={n.id}
                    className={`flex flex-col items-start gap-0.5 py-2.5 ${!n.dibaca ? "bg-primary/5" : ""}`}
                    onClick={async () => {
                      if (!n.dibaca) {
                        await apiFetch(`/api/notifikasi/${n.id}/read`, { method: "POST" })
                        qc.invalidateQueries({ queryKey: ["notifikasi", actingKaryawanId] })
                      }
                    }}
                  >
                    <div className="flex w-full items-start gap-2">
                      {!n.dibaca && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                      <div className={!n.dibaca ? "" : "ml-4"}>
                        <span className="text-sm font-medium">{n.judul}</span>
                        <p className="text-xs text-muted-foreground">{n.pesan}</p>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(n.createdAt).toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            ) : (
              <div className="px-2 py-8 text-center text-sm text-muted-foreground">
                Tidak ada notifikasi
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile — display only, not clickable */}
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-2.5 py-1.5">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className={`text-xs font-bold ${getRoleBadgeClass(displayRole, displayTipe)}`}>
              {getInitials(displayNama)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden flex-col items-start sm:flex">
            <span className="text-xs font-semibold leading-tight">{displayNama}</span>
            <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium leading-tight ${getRoleBadgeClass(displayRole, displayTipe).split(" ")[1]}`}>
              <BadgeCheck className="h-2.5 w-2.5" />
              {getRoleLabel(displayRole, displayTipe)}
            </span>
          </div>
        </div>

        {/* Logout */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
          title="Keluar"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
