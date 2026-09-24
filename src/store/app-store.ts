"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Portal = "ADMIN" | "TUTOR"

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

type AppState = {
  portal: Portal
  adminView: AdminView
  tutorView: TutorView
  actingKaryawanId: string
  actingKaryawanNama: string
  actingTipe: string | null
  setPortal: (p: Portal) => void
  setAdminView: (v: AdminView) => void
  setTutorView: (v: TutorView) => void
  setActing: (id: string, nama: string, tipe?: string | null) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      portal: "ADMIN",
      adminView: "dashboard",
      tutorView: "jadwal-saya",
      actingKaryawanId: "admin",
      actingKaryawanNama: "Administrator",
      actingTipe: null,
      setPortal: (p) => set({ portal: p }),
      setAdminView: (v) => set({ adminView: v }),
      setTutorView: (v) => set({ tutorView: v }),
      setActing: (id, nama, tipe) =>
        set({ actingKaryawanId: id, actingKaryawanNama: nama, actingTipe: tipe ?? null }),
    }),
    { name: "absensi-payroll-store" },
  ),
)
