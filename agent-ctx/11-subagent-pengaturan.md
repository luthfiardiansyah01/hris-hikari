# Task 11 — subagent-pengaturan

## Summary
Built `/home/z/my-project/src/components/views/pengaturan-view.tsx` exporting `PengaturanView()`.

## Layout
- 3 Tabs: "Pengaturan Umum" (Settings icon), "Hari Libur" (CalendarDays icon), "Cuti" (Palmtree icon).
- PageHeader with Settings icon.

## Tab 1 — Pengaturan Umum
- `useQuery(["pengaturan"])` → `GET /api/pengaturan`.
- Split into `PengaturanUmumTab` (loader gate) + `PengaturanForm` (form state init from `initial` prop). This avoids the `react-hooks/set-state-in-effect` lint error.
- Fields: namaPerusahaan, kantorLat/kantorLng/kantorRadiusMeter (grouped with MapPin note), jamMasukFixed/jamPulangFixed (type=time), toleransiTerlambatMenit, checkInWindowMin, checkInWindowMax. Each field has the spec hints below it.
- Save button → `PUT /api/pengaturan` with full Pengaturan object.
- Preview card on the right (lg:col-span layout) with:
  - Staf (Fixed) — shows `jamMasuk–jamPulang` + computed on-time limit `addMinutesToTime(jamMasuk, toleransi) + ":59"` (e.g. `07:31:59` for 07:30 + 1min).
  - Tutor (Flexible) — explains window opens N minutes before and closes M minutes after sesi start.
  - GPS Alert showing radius + lat/lng.
- `toast.success` on save; `toast.error` on failure.

## Tab 2 — Hari Libur
- `useQuery(["hari-libur"])` → `GET /api/hari-libur`.
- Inline add form: tanggal (date), nama (Input), recurring (Switch labeled "Tahunan") → `POST /api/hari-libur`.
- Table (scrollable, sticky header) with columns: Tanggal (`formatTanggalSingkat`), Nama, Tipe (Tahunan/Sekali badge), Aksi (trash button).
- AlertDialog confirm → `DELETE /api/hari-libur/[id]`.
- Empty state with CalendarDays icon.

## Tab 3 — Cuti
- `useQuery(["cuti"])` → `GET /api/cuti` (includes karyawan).
- `useQuery(["karyawan","all"])` → `GET /api/karyawan` for the select dropdown.
- Table columns: Karyawan (nama + tipe label), Tanggal (mulai–selesai or single date if same day), Alasan (line-clamp-2), Status badge (PENDING=amber, APPROVED=emerald, REJECTED=rose), Aksi.
- Action buttons: when PENDING show ✓ (approve → PUT APPROVED) and ✗ (reject → PUT REJECTED); always show 🗑 (delete with AlertDialog confirm).
- "Ajukan Cuti" dialog (CutiDialog component): karyawanId (Select), tanggalMulai (date, with min constraint on selesai), tanggalSelesai (date), alasan (Textarea). Form state lifted to CutiTab and reset via `handleOpenChange`/`resetForm` (no `useEffect` needed → passes lint).

## Conventions followed
- `"use client"`.
- `apiFetch` for all calls.
- TanStack Query + `invalidateQueries` after each mutation.
- `toast` from sonner.
- Mobile-first responsive (grid cols collapse on small screens, table wrapped in `overflow-x-auto`, sticky footer is handled by app-shell).
- Lucide icons: Settings, MapPin, Clock, CalendarDays, Palmtree, Plane, Plus, Trash2, Check, X, Save, Building2, CalendarPlus.
- No modifications to other files.

## Lint status
File passes lint cleanly (no errors/warnings specific to `pengaturan-view.tsx`). Other agents' files (jadwal-view, absensi-view) have lint errors that are not in scope for this task.
