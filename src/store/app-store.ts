"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { HrisSession } from "@/lib/api-client"

export type Portal = "ADMIN" | "TUTOR" | "KARYAWAN"

export type AdminView =
  | "dashboard"
  | "karyawan"
  | "program"
  | "siswa"
  | "jadwal"
  | "absensi"
  | "konfirmasi"
  | "payroll"
  | "pengaturan"

export type TutorView = "jadwal-saya" | "absen" | "notifikasi"

export type KaryawanView = "kehadiran" | "cuti" | "slip-gaji" | "notifikasi"

type AppState = {
  portal: Portal
  adminView: AdminView
  tutorView: TutorView
  karyawanView: KaryawanView
  actingKaryawanId: string
  actingKaryawanNama: string
  actingTipe: string | null
  session: HrisSession | null
  setPortal: (p: Portal) => void
  setAdminView: (v: AdminView) => void
  setTutorView: (v: TutorView) => void
  setKaryawanView: (v: KaryawanView) => void
  setActing: (id: string, nama: string, tipe?: string | null) => void
  setSession: (s: HrisSession | null) => void
  logout: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      portal: "ADMIN",
      adminView: "dashboard",
      tutorView: "jadwal-saya",
      karyawanView: "kehadiran",
      actingKaryawanId: "admin",
      actingKaryawanNama: "Administrator",
      actingTipe: null,
      session: null,
      setPortal: (p) => set({ portal: p }),
      setAdminView: (v) => set({ adminView: v }),
      setTutorView: (v) => set({ tutorView: v }),
      setKaryawanView: (v) => set({ karyawanView: v }),
      setActing: (id, nama, tipe) =>
        set({ actingKaryawanId: id, actingKaryawanNama: nama, actingTipe: tipe ?? null }),
      setSession: (s) => {
        if (!s) {
          set({
            session: null,
            actingKaryawanId: "admin",
            actingKaryawanNama: "Administrator",
            actingTipe: null,
            portal: "ADMIN",
          })
          return
        }
        const portal: Portal =
          s.role === "ADMIN" ? "ADMIN"
          : s.tipe === "FLEXIBLE" ? "TUTOR"
          : "KARYAWAN"
        set({
          session: s,
          actingKaryawanId: s.role === "ADMIN" ? "admin" : (s.karyawanId ?? "admin"),
          actingKaryawanNama: s.nama,
          actingTipe: s.tipe,
          portal,
        })
      },
      logout: () =>
        set({
          session: null,
          actingKaryawanId: "admin",
          actingKaryawanNama: "Administrator",
          actingTipe: null,
          portal: "ADMIN",
        }),
    }),
    { name: "absensi-payroll-store" },
  ),
)
