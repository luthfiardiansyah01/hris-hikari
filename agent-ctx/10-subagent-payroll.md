# Task 10 - Payroll View (subagent-payroll)

## File Created
- `/home/z/my-project/src/components/views/payroll-view.tsx`

## Key Features
- PageHeader "Payroll" (Wallet icon) + "Buat Periode" action button
- Info card alur tutup buku: 1. Konfirmasi sesi menunggu → 2. Input potongan → 3. Hitung rekap → 4. Tinjau → 5. Kunci periode
- Two-panel layout (1/3 list + 2/3 detail), responsive
- PeriodListPanel: clickable card per periode (label bulan-tahun via NAMA_BULAN, StatusPeriodeBadge, jumlah rekap, lock icon)
- PeriodDetailPanel: header + 3 StatCards (total payroll, total potongan, total karyawan) + RekapTable
- RekapTable columns: Karyawan (+ TipeKaryawanBadge + sub-info hadir/terlambat/tidak hadir OR sesi/dibatalkan), Komponen (gajiPokok OR totalHonor+jumlahSesi), Potongan, Total Gaji (bold emerald)
- AlertDialog confirmations for Kunci/Buka/Hapus with specific copy
- CreatePeriodeDialog: Select bulan (1-12 NAMA_BULAN) + Input tahun (default current year)
- Mutations invalidate ["periode"] and ["periode-detail", id]; sonner toast feedback
- Locked-state disables Hitung Ulang & Hapus; shows amber alert banner

## Patterns Used
- useQuery/useMutation (TanStack Query)
- apiFetch wrapper with acting-user header
- Derived selectedId (no setState-in-effect) — handles auto-select first period AND post-delete fallback
- Sort rekap FIXED-first then FLEXIBLE, alphabetical within group
- Inline helpers: labelBulan, isLocked

## Lint Status
- 0 errors in payroll-view.tsx (verified via npx eslint)
- Pre-existing errors in other view files are out of scope

## API Endpoints Used
- GET /api/payroll/periode -> PeriodeGaji[]
- POST /api/payroll/periode { bulan, tahun }
- GET /api/payroll/periode/[id] -> PeriodeGaji with full rekap details
- POST /api/payroll/periode/[id]/hitung
- POST /api/payroll/periode/[id]/kunci
- POST /api/payroll/periode/[id]/buka
- DELETE /api/payroll/periode/[id]
