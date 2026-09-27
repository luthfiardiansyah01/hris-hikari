"use client"

import { useEffect } from "react"
import { useAppStore } from "@/store/app-store"
import { getSession, saveSession } from "@/lib/api-client"
import { Header } from "@/components/layout/header"
import { SidebarNav } from "@/components/layout/sidebar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Menu, GraduationCap } from "lucide-react"
import dynamic from "next/dynamic"
import { useState } from "react"

const DashboardView     = dynamic(() => import("@/components/views/dashboard-view").then((m) => m.DashboardView), { ssr: false })
const KaryawanView      = dynamic(() => import("@/components/views/karyawan-view").then((m) => m.KaryawanView), { ssr: false })
const ProgramView       = dynamic(() => import("@/components/views/program-view").then((m) => m.ProgramView), { ssr: false })
const SiswaView         = dynamic(() => import("@/components/views/siswa-view").then((m) => m.SiswaView), { ssr: false })
const JadwalView        = dynamic(() => import("@/components/views/jadwal-view").then((m) => m.JadwalView), { ssr: false })
const AbsensiView       = dynamic(() => import("@/components/views/absensi-view").then((m) => m.AbsensiView), { ssr: false })
const KonfirmasiView    = dynamic(() => import("@/components/views/konfirmasi-view").then((m) => m.KonfirmasiView), { ssr: false })
const PayrollView       = dynamic(() => import("@/components/views/payroll-view").then((m) => m.PayrollView), { ssr: false })
const PengaturanView    = dynamic(() => import("@/components/views/pengaturan-view").then((m) => m.PengaturanView), { ssr: false })
const TutorPortalView   = dynamic(() => import("@/components/views/tutor-portal-view").then((m) => m.TutorPortalView), { ssr: false })
const KaryawanPortalView= dynamic(() => import("@/components/views/karyawan-portal-view").then((m) => m.KaryawanPortalView), { ssr: false })
const LoginView         = dynamic(() => import("@/components/views/login-view").then((m) => m.LoginView), { ssr: false })

function AdminContent() {
  const { adminView } = useAppStore()
  switch (adminView) {
    case "dashboard":   return <DashboardView />
    case "karyawan":    return <KaryawanView />
    case "program":     return <ProgramView />
    case "siswa":       return <SiswaView />
    case "jadwal":      return <JadwalView />
    case "absensi":     return <AbsensiView />
    case "konfirmasi":  return <KonfirmasiView />
    case "payroll":     return <PayrollView />
    case "pengaturan":  return <PengaturanView />
    default:            return <DashboardView />
  }
}

function AppFooter() {
  return (
    <footer className="mt-auto border-t bg-background/95">
      <div className="flex flex-col items-center justify-between gap-2 px-4 py-3 text-xs text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2">
          <img src="/hikari-logo.png" alt="Hikari Bridge" className="h-4 w-auto object-contain" />
          <span>Sistem Absensi & Payroll PT Hikari Bridge Indonesia</span>
        </div>
        <div className="flex items-center gap-3">
          <span>v1.0.0 · MVP</span>
          <span className="hidden sm:inline">© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  )
}

export function AppShell() {
  const { portal, session, setSession } = useAppStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  // On mount, restore session from localStorage if store is empty
  useEffect(() => {
    if (!session) {
      const stored = getSession()
      if (stored) {
        saveSession(stored)
        setSession(stored)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Not logged in → show login
  if (!session) return <LoginView />

  // Tutor (FLEXIBLE) portal — full screen, manages its own layout
  if (portal === "TUTOR") {
    return <TutorPortalView />
  }

  // Karyawan (FIXED) portal
  if (portal === "KARYAWAN") {
    return <KaryawanPortalView />
  }

  // Admin portal
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 border-r bg-background lg:block">
          <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
            <SidebarNav />
          </div>
        </aside>

        {/* Mobile sidebar */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="fixed bottom-4 right-4 z-40 h-12 w-12 rounded-full shadow-lg lg:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="px-4 py-3 text-sm font-medium">Menu Admin</SheetTitle>
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6 lg:px-8">
            <AdminContent />
          </div>
        </main>
      </div>
      <AppFooter />
    </div>
  )
}
