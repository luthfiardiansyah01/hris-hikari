# Task 9 - subagent-konfirmasi

## Task
Build Konfirmasi sesi menunggu + Input potongan view (`src/components/views/konfirmasi-view.tsx`).

## Work Log
1. Read worklog.md, constants, api-client, schedule, sesi/confirm/potongan API routes, shared/ui, program-view (reference), prisma schema for Sesi/Potongan/Absensi/PeriodeGaji.
2. Created `src/components/views/konfirmasi-view.tsx` exporting `KonfirmasiView`.
3. Implemented two-tab layout (Tabs):
   - **Tab 1 – Sesi Menunggu Konfirmasi**:
     - useQuery `["sesi","menunggu-konfirmasi"]` GET `/api/sesi?status=MENUNGGU_KONFIRMASI`.
     - Card list with `max-h-96 overflow-y-auto` wrapper.
     - Each card: header (program dot, nama, formatTanggal, Clock icon + jam range, tutor, siswa), StatusSesiBadge.
     - Two-column check-in / check-out grid showing time, terlambat badge (amber) or tepat-waktu (emerald), GPS indicator, and 80x80 rounded thumbnail when foto exists.
     - Computed `earlyMin = jamSelesai - checkOutAt` displayed as amber "Lebih awal X menit".
     - Honor preview = `formatRupiah(hitungHonorSesi(jamMulai, jamSelesai, tarifSnapshot))`.
     - Green "Setujui" button (CheckCircle2) -> POST confirm {action: approve}, toast.success, invalidate.
     - Red "Tolak (tanpa honor)" button (XCircle) -> AlertDialog confirm -> POST confirm {action: reject}, toast, invalidate.
     - EmptyState with CheckCircle2 icon when none.
   - **Tab 2 – Input Potongan**:
     - Form (left, lg:col-span-2): tipe Select (PER_KEJADIAN / PER_PERIODE); when PER_KEJADIAN shows two Selects (absensi last-30-days & sesi) with mutually-exclusive behavior (only one can be attached); when PER_PERIODE shows periode-gaji Select; nominal Input with formatRupiah preview; alasan Textarea; submit POST `/api/potongan`.
     - useQuery hooks: `["absensi","recent-30d"]`, `["sesi","all"]`, `["payroll","periode"]`, `["potongan"]`.
     - Right side table (lg:col-span-3) with `max-h-96 overflow-y-auto`: columns Karyawan/Tutor, Tipe (amber/violet badge), Alasan (truncated), Nominal (rose, formatted), Dibuat (formatTanggalSingkat), delete icon button (DELETE `/api/potongan/[id]`).
     - EmptyState when no potongan.
4. Used shared `PageHeader`, `LoadingState`, `EmptyState`, `StatusSesiBadge`; shadcn Card/Button/Input/Label/Textarea/Tabs/Select/AlertDialog/Table; lucide icons (CheckCircle2, AlertTriangle, XCircle, Plus, Trash2, Clock, Camera, MapPin, Banknote, ShieldCheck).
5. Inline helpers: `diffMinutes`, `formatPeriodeLabel`, `isoDaysAgo`.
6. Removed unused eslint-disable comments; ran `bun run lint` - my file produces 0 errors / 0 warnings (remaining lint errors are pre-existing in other agents' files).

## Stage Summary
- File created: `src/components/views/konfirmasi-view.tsx` exporting `KonfirmasiView`.
- Two sections, mobile-first responsive (form + table stacked on mobile, side-by-side on lg).
- Honor computed from scheduled duration (not actual) per business rule.
- All mutations invalidate relevant queries (`["sesi","menunggu-konfirmasi"]`, `["sesi"]`, `["potongan"]`).
- Export name matches dynamic import in `app-shell.tsx` (line 19).
