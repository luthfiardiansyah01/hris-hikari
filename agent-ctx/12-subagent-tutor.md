# Task 12 - subagent-tutor

## Task
Build Tutor portal view (jadwal saya + absen kamera + notifikasi) - mobile-first, Next.js 16 App Router, TypeScript, TanStack Query, Zustand, sonner.

## Files Read (context)
- `/home/z/my-project/worklog.md`
- `/home/z/my-project/src/lib/constants.ts` (STATUS_SESI, formatJam, formatTanggal, formatTanggalSingkat, formatRupiah, NAMA_HARI, NAMA_BULAN)
- `/home/z/my-project/src/lib/api-client.ts` (apiFetch, getActingKaryawanId from localStorage)
- `/home/z/my-project/src/lib/schedule.ts` (hitungHonorSesi, canCheckInSesi)
- `/home/z/my-project/src/store/app-store.ts` (TutorView, setTutorView, actingKaryawanId)
- `/home/z/my-project/src/app/api/sesi/route.ts` (GET filter tutorId/dari/sampai, returns Sesi[] with includes)
- `/home/z/my-project/src/app/api/sesi/[id]/check-in/route.ts` (FormData: foto, lat, lng → {sesi, isLate, terlambatMenit})
- `/home/z/my-project/src/app/api/sesi/[id]/check-out/route.ts` (FormData → {sesi, needsConfirmation, message})
- `/home/z/my-project/src/app/api/notifikasi/route.ts` (GET ?karyawanId, POST)
- `/home/z/my-project/src/app/api/notifikasi/[id]/read/route.ts` (POST → mark dibaca=true)
- `/home/z/my-project/src/components/shared/ui.tsx` (PageHeader, StatusSesiBadge, EmptyState, LoadingState)
- `/home/z/my-project/src/components/layout/app-shell.tsx` (TutorPortalView loaded via dynamic ssr:false)
- `/home/z/my-project/prisma/schema.prisma` (Sesi & Notifikasi fields)
- `/home/z/my-project/src/components/views/dashboard-view.tsx` (style reference)

## File Created
- `/home/z/my-project/src/components/views/tutor-portal-view.tsx` (~1100 lines)

## Key Features
1. **TutorPortalView (parent)** - holds `selectedSesiId` state (lifted), render-phase reset on tutor change (`prevTutor` pattern), sticky header with tutor name, bottom tab bar fixed at bottom (3 tabs: Jadwal Saya / Absen / Notifikasi) with unread badge + safe-area-inset-bottom padding, admin notice when `actingKaryawanId === "admin"`.

2. **JadwalSayaView** - GET `/api/sesi?tutorId=X&dari=today&sampai=today+14d`, groups sessions by date (`formatTanggal`), each card shows program color dot, time (formatJam), program name, siswa name, StatusSesiBadge, honor (`formatRupiah(hitungHonorSesi(...))`), check-in/out times + terlambatMenit, Check-in button (if TERJADWAL) or Check-out button (if BERJALAN) that sets selectedSesiId and switches to Absen tab.

3. **AbsenView** - reuses `["sesi-tutor", tutorId]` query to find selected sesi by id (so invalidation refreshes both Jadwal & Absen). Session detail card. **CameraCapture** component: `<video>` live preview with `getUserMedia({video:{facingMode:"user"}})`, "Buka Kamera"/"Tutup Kamera" buttons, "Tangkap Foto" draws video frame to hidden `<canvas>` → `canvas.toBlob` JPEG 0.85. GPS via `navigator.geolocation.getCurrentPosition` with status loading/ok/unavailable. Two action buttons: Kirim Absen Masuk (`uploadAbsen(/api/sesi/{id}/check-in, ...)`) or Kirim Absen Pulang (check-out). **File input fallback**: `<input type=file accept=image/* capture=user>` always available, auto-shown prominently when getUserMedia fails (permission denied, not found, etc.). Cleanup: `streamRef.current.getTracks().forEach(t => t.stop())` on unmount and when closing camera. URL.revokeObjectURL on photo change.

4. **NotifikasiView** - GET `/api/notifikasi?karyawanId=X`, list of cards with unread dot, judul, pesan, relative time, tipe label. Click → mark-as-read with optimistic update via `onMutate` (cancelQueries + setQueryData + rollback on error). "Tandai semua dibaca" button. Max-h-[70vh] overflow-y-auto with thin scrollbar.

5. **UnreadBadge** - separate `useQuery(["notifikasi", karyawanId])` with `refetchInterval: 30s` to show count badge on Notifikasi tab.

## Inline Helpers
- `uploadAbsen(url, fotoBlob, lat, lng)` - FormData POST with `x-acting-karyawan-id` header from localStorage (bypasses apiFetch which forces Content-Type json)
- `toISODate`, `dateKey`, `relativeTime` - small utilities
- `SectionTitle`, `SesiCard`, `NotifCard`, `CameraCapture`, `UnreadBadge`, `AdminNotice` - presentational sub-components

## Lint Status
- `bun run lint`: **0 errors in tutor-portal-view.tsx** (sisa error di `jadwal-view.tsx` & `program-view.tsx` bukan tanggung jawab task ini)
- Memecahkan aturan `react-hooks/set-state-in-effect` dengan render-phase reset pattern (React 19 recommended) untuk reset state saat prop berubah, dan memindahkan setState sinkron keluar dari effect body (GPS effect hanya setState di async callback)

## API Contract Compliance
- GET `/api/sesi?tutorId={id}&dari=YYYY-MM-DD&sampai=YYYY-MM-DD` → Sesi[] (includes tutor, program, siswa)
- GET `/api/notifikasi?karyawanId={id}` → Notifikasi[]
- POST `/api/sesi/[id]/check-in` (FormData: foto, lat, lng) → {sesi, isLate, terlambatMenit}
- POST `/api/sesi/[id]/check-out` (FormData) → {sesi, needsConfirmation, message}
- POST `/api/notifikasi/[id]/read`

## Query Invalidation
- Mutasi check-in/check-out: `qc.invalidateQueries({ queryKey: ["sesi-tutor", tutorId] })` → refresh Jadwal + Absen
- Mutasi read notif: optimistic update + `qc.invalidateQueries({ queryKey: ["notifikasi", karyawanId] })`
