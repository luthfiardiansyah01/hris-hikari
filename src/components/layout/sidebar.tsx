"use client"

import { useAppStore, AdminView } from "@/store/app-store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  CalendarDays,
  Clock,
  CheckCircle2,
  Wallet,
  Settings,
} from "lucide-react"
import { LucideIcon } from "lucide-react"

type NavItem = { key: AdminView; label: string; icon: LucideIcon; description?: string }

const NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "karyawan", label: "Karyawan", icon: Users },
  { key: "program", label: "Program", icon: BookOpen },
  { key: "siswa", label: "Siswa", icon: GraduationCap },
  { key: "jadwal", label: "Penjadwalan", icon: CalendarDays },
  { key: "absensi", label: "Absensi", icon: Clock },
  { key: "konfirmasi", label: "Konfirmasi Sesi", icon: CheckCircle2 },
  { key: "payroll", label: "Payroll", icon: Wallet },
  { key: "pengaturan", label: "Pengaturan", icon: Settings },
]

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { adminView, setAdminView } = useAppStore()
  return (
    <nav className="flex flex-col gap-1 p-2">
      {NAV.map((item) => {
        const active = adminView === item.key
        const Icon = item.icon
        return (
          <Button
            key={item.key}
            variant={active ? "secondary" : "ghost"}
            className={cn(
              "h-10 justify-start gap-3 px-3 font-normal",
              active && "bg-secondary font-medium",
            )}
            onClick={() => {
              setAdminView(item.key)
              onNavigate?.()
            }}
          >
            <Icon className={cn("h-4.5 w-4.5", active ? "text-primary" : "text-muted-foreground")} />
            {item.label}
          </Button>
        )
      })}
    </nav>
  )
}
