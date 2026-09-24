# Worklog - Aplikasi Absensi & Payroll Bimbel

---
Task ID: 1
Agent: main (Z.ai Code)
Task: Susun & terapkan skema Prisma untuk absensi & payroll

Work Log:
- Mendefinisikan 12 model Prisma: User, Karyawan, Program, Siswa, SiswaProgram, Sesi, Absensi, Potongan, Cuti, HariLibur, Pengaturan, PeriodeGaji, RekapGaji, RekapAbsensi, RekapSesi, Notifikasi
- Menggunakan tipe String untuk enum (kompatibel SQLite & PostgreSQL)
- Menjalankan `bun run db:push` sukses

Stage Summary:
- Skema final di `prisma/schema.prisma`
- Tarif sesi di-snapshot (`tarifSnapshot`) saat sesi dibuat
- Sesi menyimpan field absensi (checkIn/out, foto, GPS, terlambatMenit, confirmed)
- Absensi fixed-time punya unique constraint [karyawanId, tanggal]

---
Task ID: 2
Agent: main (Z.ai Code)
Task: Bangun lib dasar (constants, validators, session, schedule logic, payroll logic, seed)

Work Log:
- `src/lib/constants.ts`: enum string + formatter Rupiah/tanggal/jam Indonesia
- `src/lib/validators.ts`: schema Zod untuk semua entity
- `src/lib/session.ts`: ActingUser dari header `x-acting-karyawan-id` (demo auth)
- `src/lib/schedule.ts`: haversine GPS, evaluasi terlambat (fixed & sesi), deteksi bentrok tutor, jendela check-in, hitung honor (durasi jadwal x tarif snapshot)
- `src/lib/payroll.ts`: buildRekapForPeriod + persistRekap (rekap gaji bulanan)
- `src/lib/api-client.ts`: apiFetch wrapper + getActingKaryawanId (localStorage)
- `src/lib/responses.ts`: helper JSON response
- `prisma/seed.ts`: data demo (5 program, 5 siswa, 2 staf fixed, 4 tutor flexible, sesi hari ini & mendatang, 1 sesi selesai, 1 sesi menunggu konfirmasi, hari libur, notifikasi)

Stage Summary:
- Aturan bisnis terpusat di lib, bukan di API/UI
- Toleransi terlambat 1 menit di kedua tipe karyawan
- Honor dihitung dari durasi JADWAL (bukan aktual) x tarif snapshot

---
Task ID: 3
Agent: main (Z.ai Code)
Task: Bangun semua API routes

Work Log:
- /api/session (GET) - info acting user + daftar identitas switchable
- /api/karyawan (GET/POST) + /[id] (GET/PUT/DELETE) - auto-create User login
- /api/program (GET/POST) + /[id] (GET/PUT/DELETE)
- /api/siswa (GET/POST) + /[id] (GET/PUT/DELETE) - dengan relasi siswaProgram
- /api/sesi (GET/POST) - POST deteksi bentrok & snapshot tarif & notifikasi tutor
- /api/sesi/[id] (GET/PUT/DELETE)
- /api/sesi/[id]/cancel (POST) - pembatalan + penugasan/opsi tutor pengganti
- /api/sesi/[id]/reschedule (POST) - saran slot + reassign tutor
- /api/sesi/[id]/check-in (POST) - upload foto (FormData), GPS, evaluasi terlambat
- /api/sesi/[id]/check-out (POST) - upload foto, auto MENUNGGU_KONFIRMASI jika pulang cepat
- /api/sesi/[id]/confirm (POST) - admin approve/reject sesi menunggu
- /api/absensi (GET) + /check-in (POST) + /check-out (POST) - GPS + radius kantor + deteksi libur/cuti
- /api/cuti (GET/POST) + /[id] (PUT/DELETE)
- /api/hari-libur (GET/POST) + /[id] (DELETE)
- /api/pengaturan (GET/PUT) - single-row config default
- /api/potongan (GET/POST) + /[id] (DELETE)
- /api/notifikasi (GET/POST) + /[id]/read (POST)
- /api/payroll/periode (GET/POST) + /[id] (GET/DELETE) + /[id]/hitung + /[id]/kunci + /[id]/buka
- /api/dashboard (GET) - ringkasan hari ini

Stage Summary:
- Semua endpoint RESTful, menggunakan NextRequest/NextResponse
- Foto disimpan ke `public/uploads/absensi/`, path disimpan di DB
- Periode gaji: DRAFT -> hitung rekap -> kunci (TERKUNCI) -> bisa dibuka ulang eksplisit

---
Task ID: 5
Agent: subagent-karyawan
Task: Build Karyawan management CRUD view

Work Log:
- Membaca worklog.md, constants.ts (TIPE_KARYAWAN, formatRupiah, formatTanggalSingkat), api-client.ts (apiFetch), validators.ts (karyawanSchema), shared/ui.tsx (PageHeader, badges, LoadingState, EmptyState), program-view.tsx sebagai REFERENCE PATTERN (dialog/mutation/toast & useEditEffect hook)
- Verifikasi API contract di src/app/api/karyawan/route.ts (GET support ?tipe= & ?status=, POST auto-create User login)
- Verifikasi komponen shadcn/ui yang tersedia (select, dialog, alert-dialog, switch, dll.)
- Membuat src/components/views/karyawan-view.tsx dengan ekspor `KaryawanView()`
- Implementasi: PageHeader (Users icon, deskripsi, tombol "Tambah Karyawan"), filter chip tipe (Semua/Fixed/Flexible) + Select status (Semua/Aktif/Nonaktif), card grid responsive (1/2/3 kolom), KaryawanCard (avatar inisial, badges tipe & status, info kontak email/telepon/alamat, gajiPokok untuk FIXED atau "Honor per sesi" untuk FLEXIBLE, tombol Edit & Delete), Dialog form (nama, email, telepon, Select tipe, Input gajiPokok dengan hint kontekstual & disabled saat FLEXIBLE, Switch status, Textarea alamat), AlertDialog konfirmasi hapus
- Mengikuti pola useEditEffect dari program-view.tsx untuk sync form saat editing target berubah (reset ke EMPTY_FORM saat "new", populate saat edit)
- Menggunakan apiFetch + TanStack Query useMutation dengan invalidate ["karyawan"], toast.success/error dari sonner
- Menjalankan `bun run lint` — file karyawan-view.tsx bersih tanpa error/warning (sisa error di header.tsx & providers.tsx adalah pre-existing, bukan dari file ini)
- Memverifikasi dev.log: kompilasi sukses setelah file dibuat

Stage Summary:
- File dibuat: src/components/views/karyawan-view.tsx
- Fitur: CRUD karyawan lengkap, filter ganda (tipe + status), card grid mobile-first responsive, dialog form dengan field kontekstual (gajiPokok hanya relevan untuk FIXED), avatar inisial otomatis, badge tipe (sky/violet) & status (emerald/muted), hint dinamis pada input gaji ("Gaji bulanan tetap" vs "Tidak berlaku untuk tutor"), konfirmasi AlertDialog sebelum hapus, toast feedback, useEditEffect pattern untuk reset/populate form
- API dipanggil via apiFetch dengan query params tipe & status; invalidate ["karyawan"] setelah mutasi

---
Task ID: 9
Agent: subagent-konfirmasi
Task: Build Konfirmasi sesi menunggu + Input potongan view

Work Log:
- Membaca context (worklog, constants, api-client, schedule, sesi/confirm/potongan API, shared/ui, program-view, prisma schema Sesi/Potongan/Absensi/PeriodeGaji)
- Membuat `src/components/views/konfirmasi-view.tsx` export `KonfirmasiView`
- Layout Tabs: "Sesi Menunggu Konfirmasi" & "Input Potongan"
- Section 1: GET /api/sesi?status=MENUNGGU_KONFIRMASI; card list max-h-96 overflow-y-auto; tiap card menampilkan formatTanggal, jamMulai-selesai, dot program, tutor, siswa, StatusSesiBadge, info check-in (jam + terlambatMenit amber + GPS), info check-out (jam + early-min amber + GPS), thumbnail foto 80x80 bila ada, honor = formatRupiah(hitungHonorSesi(jamMulai, jamSelesai, tarifSnapshot)); tombol "Setujui" (emerald, CheckCircle2) -> POST /api/sesi/[id]/confirm {action:approve}; tombol "Tolak (tanpa honor)" (rose, XCircle) -> AlertDialog confirm -> POST {action:reject}; toast sonner + invalidate; EmptyState bila kosong
- Section 2: form kiri (lg:col-span-2) Select tipe (PER_KEJADIAN / PER_PERIODE); PER_KEJADIAN -> dua Select (absensi 30 hari terakhir & sesi) mutually exclusive; PER_PERIODE -> Select periode gaji; nominal + preview formatRupiah; alasan Textarea; submit POST /api/potongan; tabel kanan (lg:col-span-3) max-h-96 overflow-y-auto: kolom karyawan/tutor, tipe badge, alasan (truncate), nominal rose, createdAt, tombol hapus DELETE /api/potongan/[id]; EmptyState bila kosong
- Memakai PageHeader/LoadingState/EmptyState/StatusSesiBadge dari shared/ui, shadcn Card/Button/Input/Label/Textarea/Tabs/Select/AlertDialog/Table, lucide icons (CheckCircle2, AlertTriangle, XCircle, Plus, Trash2, Clock, Camera, MapPin, Banknote, ShieldCheck)
- Inline helpers: diffMinutes, formatPeriodeLabel, isoDaysAgo
- Lint file ini 0 error/warning; export name cocok dengan dynamic import di app-shell.tsx line 19

Stage Summary:
- File: `src/components/views/konfirmasi-view.tsx` (export `KonfirmasiView`)
- Honor dihitung dari durasi JADWAL x tarifSnapshot (sesuai aturan bisnis)
- Mutasi invalidate: ["sesi","menunggu-konfirmasi"], ["sesi"], ["potongan"]
- Mobile-first responsive: form & tabel stack di mobile, side-by-side di lg

---
Task ID: 6
Agent: subagent-siswa
Task: Build Siswa management CRUD view with program relations

Work Log:
- Membaca referensi: worklog.md, constants.ts, api-client.ts, validators.ts (siswaSchema dengan programIds: string[]), shared/ui.tsx, program-view.tsx (pola dialog/mutation/useEditEffect), schema.prisma, dan API routes /api/siswa + /api/program untuk memastikan kontrak data.
- Membuat `src/components/views/siswa-view.tsx` dengan `export function SiswaView()` (client component).
- Mengikuti pola program-view: useQuery ["siswa"], useMutation POST/PUT/DELETE, invalidate ["siswa"], toast sonner, AlertDialog untuk hapus, Dialog untuk add/edit.
- PageHeader: title "Siswa", icon GraduationCap, description "Daftar siswa bimbingan", action "Tambah Siswa".
- Search input (icon Search) untuk filter nama (case-insensitive, client-side).
- Card grid responsive (1/2/3 col): menampilkan nama (truncate), namaWali (icon User2), telepon (icon Phone), dan badge program berwarna (background rgba warna program 12%, border rgba 30%, dot warna penuh). Empty state ketika tidak ada program.
- Tombol Edit (outline, full width) + Delete (outline, rose) di bawah card.
- EmptyState dinamis: pesan berbeda saat hasil pencarian kosong vs saat belum ada data sama sekali.
- Dialog form fields: nama (required, min 2), namaWali, telepon (inputMode tel), email (type email), alamat (Textarea), catatan (Textarea), programIds.
- programIds: multi-select berupa daftar checkbox (1 per program dari useQuery ["programs"], enabled saat dialog terbuka). Setiap baris menampilkan Checkbox + dot warna program.warna + nama program + label "nonaktif" bila status NONAKTIF. Selected row highlight bg-muted. Counter "X program dipilih" di bawah.
- Helper inline `hexToRgba()` untuk konversi hex -> rgba (handles #abc shorthand & invalid fallback slate).
- Helper inline `useEditEffect(editing, setForm, open)` mirroring pola program-view.tsx: populate form (termasuk programIds dari siswaProgram.program.id) saat editing ter-set, reset ke default saat null. Ditambahkan dependency `open` agar form selalu fresh setiap kali dialog dibuka.
- Mutasi mengirim payload: { nama, namaWali, telepon, email, alamat, catatan, programIds } sesuai siswaSchema. String kosong di-trim dan di-null-kan agar konsisten dengan handler API.
- AlertDialog konfirmasi hapus dengan tombol rose. Tidak ada file lain yang dimodifikasi.
- `bun run lint`: 0 error/warning pada siswa-view.tsx (sisanya di file lain di luar tanggung jawab task ini).

Stage Summary:
- File dibuat: `src/components/views/siswa-view.tsx`
- Fitur: CRUD siswa lengkap, relasi many-to-many ke Program via multi-select checkbox berwarna, search filter, badge program berwarna di card, validasi minimum (nama >= 2 chars), toast feedback, AlertDialog konfirmasi hapus, mobile-first responsive (grid 1/2/3, dialog max-h scroll).
- Konsisten dengan pola program-view.tsx (Dialog + useEditEffect + invalidate ["siswa"]).

---
Task ID: 12
Agent: subagent-tutor
Task: Build Tutor portal view (jadwal saya + absen kamera + notifikasi)

Work Log:
- Membaca context: constants, api-client, schedule.ts, app-store, API routes (sesi, check-in/out, notifikasi), shared/ui, schema Prisma
- Membuat `src/components/views/tutor-portal-view.tsx` dengan struktur:
  - `TutorPortalView` (parent) - state lifting `selectedSesiId`, render-phase reset saat tutor ganti, sticky header dengan nama tutor, bottom tab bar fixed (3 tab: Jadwal Saya / Absen / Notifikasi) dengan unread badge + safe-area-inset-bottom
  - `JadwalSayaView` - GET /api/sesi?tutorId&dari=today&sampai=today+14d, group by tanggal (formatTanggal), card dengan dot warna program, jam, siswa, honor (formatRupiah(hitungHonorSesi)), status badge, info check-in/out + terlambatMenit, tombol Check-in/Check-out yang navigasi ke tab Absen
  - `AbsenView` - GET sesi tutor & find by id (share query key ["sesi-tutor", tutorId] supaya invalidate refresh kedua view), detail card sesi, `CameraCapture` component (getUserMedia facingMode:user + canvas capture to JPEG blob), tombol Buka/Tutup Kamera + Tangkap Foto, GPS via getCurrentPosition dengan status loading/ok/unavailable, tombol Kirim Absen Masuk/Pulang via helper `uploadAbsen` (FormData), file input fallback (`<input type=file accept=image/* capture=user>`) otomatis muncul saat kamera gagal/ditolak, cleanup stream di unmount, toast success/warning
  - `NotifikasiView` - GET /api/notifikasi?karyawanId, list card dengan dot unread, relative time + tipe, click mark-as-read via optimistic update, tombol "Tandai semua dibaca", empty state
  - `UnreadBadge` - polling tiap 30s untuk badge angka di tab bar
- Mengatasi lint rule `react-hooks/set-state-in-effect` dengan render-phase reset pattern (prevTutor/prevSesiId) untuk reset state saat prop berubah, dan memindahkan setState sinkron keluar dari effect body (GPS effect hanya setState di async callback)
- Mobile-first: max-w-3xl, touch target min 56px, bottom nav fixed, padding safe-area, scroll area untuk notifikasi (max-h-[70vh] overflow-y-auto)
- Lint: 0 error pada tutor-portal-view.tsx (sisa error di file lain bukan tanggung jawab task ini)

Stage Summary:
- File: `src/components/views/tutor-portal-view.tsx` (~1100 baris)
- Export: `TutorPortalView`
- Fitur: 3 sub-view mobile-first, camera getUserMedia + file fallback, GPS, optimistic notif read, invalidation ["sesi-tutor", tutorId] setelah check-in/out
- Kontrak API dipatuhi: FormData upload via helper inline, query params sesuai route, response fields (isLate/needsConfirmation) ditangani dengan toast

---
Task ID: 11
Agent: subagent-pengaturan
Task: Build Pengaturan + Hari Libur + Cuti view

Work Log:
- Membaca worklog, constants, validators, API routes (pengaturan, hari-libur, cuti), shared/ui, program-view, schedule.ts untuk konfirmasi aturan bisnis
- Membuat `src/components/views/pengaturan-view.tsx` dengan 3 tab (Tabs dari shadcn/ui)
- Tab 1 Pengaturan Umum: split menjadi `PengaturanUmumTab` (gate loader) + `PengaturanForm` (init state dari prop `initial`) untuk menghindari `react-hooks/set-state-in-effect`. Field lengkap (namaPerusahaan, kantorLat/Lng/radius, jamMasuk/PulangFixed time, toleransiTerlambatMenit, checkInWindowMin/Max) + Save button -> PUT /api/pengaturan. Preview card di sisi kanan menampilkan ringkasan aturan Staf & Tutor + Alert GPS.
- Tab 2 Hari Libur: inline add form (tanggal date input + nama + Switch "Tahunan") -> POST. Tabel dengan sticky header + scroll (max-h-[28rem] overflow-y-auto). Kolom: Tanggal (formatTanggalSingkat), Nama, Tipe badge Tahunan/Sekali, Aksi hapus. AlertDialog konfirmasi -> DELETE.
- Tab 3 Cuti: tabel daftar cuti (include karyawan) dengan kolom Karyawan (nama+tipe), Tanggal mulai-selesai (auto-collapse jika same-day), Alasan (line-clamp-2), Status badge (PENDING=amber, APPROVED=emerald, REJECTED=rose), Aksi. Tombol approve/reject muncul hanya saat PENDING. Dialog CutiDialog (form state di-lift ke parent CutiTab, reset via handleOpenChange) untuk POST cuti baru.
- Helpers inline: `addMinutesToTime`, `toDateInput`, `CutiStatusBadge`. Tidak ada useEffect.
- Verifikasi `bun run lint`: file pengaturan-view.tsx tanpa error/warning (file lain di luar scope tetap bermasalah).

Stage Summary:
- File: `/home/z/my-project/src/components/views/pengaturan-view.tsx` (export `PengaturanView`)
- 3 tab terintegrasi: konfigurasi global, manajemen hari libur, approval cuti
- Mobile-first responsive: grid responsive, sticky header tabel, dialog mobile-friendly
- Work record ditulis di `/home/z/my-project/agent-ctx/11-subagent-pengaturan.md`

---
Task ID: 10
Agent: subagent-payroll
Task: Build Payroll bulanan view (periode + rekap + kunci/buka)

Work Log:
- Membaca worklog, constants, api-client, payroll lib, payroll API routes, shared UI, dan program-view sebagai referensi pola
- Membuat `src/components/views/payroll-view.tsx` dengan struktur: PageHeader + info card alur tutup buku, panel list periode (kiri), panel detail periode (kanan)
- PeriodListPanel: clickable card per periode, menampilkan "Bulan Tahun" (pakai NAMA_BULAN), StatusPeriodeBadge, jumlah rekap, indikator lock
- PeriodDetailPanel: header dengan nama periode + status + tombol aksi (Hitung Ulang, Kunci/Buka, Hapus), alert banner saat terkunci, 3 StatCard (total payroll, total potongan, total karyawan), dan RekapTable
- RekapTable: kolom Karyawan + TipeKaryawanBadge, Komponen (gajiPokok untuk FIXED, totalHonor + jumlahSesi untuk FLEXIBLE), Potongan, Total Gaji (bold emerald). Sub-info: jumlah hadir/terlambat/tidak hadir (FIXED) atau jumlah sesi/dibatalkan (FLEXIBLE). Sortir FIXED dulu lalu FLEXIBLE
- AlertDialog untuk konfirmasi Kunci/Buka/Hapus, dengan copy spesifik
- CreatePeriodeDialog: Select bulan (NAMA_BULAN), Input tahun (default current year), preview label periode
- Mutations invalidate query ["periode", "periode-detail", id]; toast untuk feedback
- Auto-select periode pertama tanpa useEffect — pakai derived value (explicitId ?? firstInList), dan filter explicitId yang sudah tidak ada di list (setelah hapus)
- Lint payroll-view.tsx: 0 error

Stage Summary:
- File: `src/components/views/payroll-view.tsx`
- Fitur utama: list periode gaji, detail rekap (FIXED & FLEXIBLE), hitung ulang, kunci/buka periode, hapus periode, buat periode baru
- Mengikuti konvensi: apiFetch, useQuery/useMutation, sonner toast, invalidasi query key ["periode"] & ["periode-detail", id], AlertDialog konfirmasi, status badge, formatRupiah, NAMA_BULAN
- Mobile-first responsive: grid 1 kolom di mobile, 3 kolom (1+2) di lg
- Tidak ada setState di dalam useEffect (lolos rule react-hooks/set-state-in-effect)

---
Task ID: 7
Agent: subagent-jadwal
Task: Build Penjadwalan sesi view (daily/weekly calendar + conflict + reschedule/cancel)

Work Log:
- Membaca kontrak API: /api/sesi (GET `tanggal` | `dari`/`sampai` + `tutorId` opsional; POST 400 saat bentrok dengan pesan "Tutor tersedia: ..."), /api/sesi/[id]/cancel (body `{ assignReplacementTo? }` -> `{ cancelled, replacement }`), /api/sesi/[id]/reschedule (body kosong -> `{ suggestedSlots, alternativeTutors }`; body `{ newJamMulai, newJamSelesai, newTutorId? }` -> `{ rescheduled }` atau `{ conflict, alternativeTutors }`).
- Menulis `src/components/views/jadwal-view.tsx` (ekspor `JadwalView`) dengan sub-komponen inline: Toolbar (nav tanggal + filter tutor + tabs), DailyView (agenda vertikal dengan colored bar program.warna), SesiRow (waktu, program, tutor, siswa, badge status, honor, dropdown Edit/Reschedule/Batalkan), WeeklyView (7 kolom Sen–Min, horizontal scroll di mobile, klik kolom -> switch harian), SesiFormDialog (Calendar Popover + time inputs + Select tutor/program/siswa + preview tarif & honor), CancelDialog (AlertDialog + checkbox "Tugaskan tutor pengganti"), RescheduleDialog (suggested slots + alt tutors + form manual override).
- Helper inline: startOfDay, shiftDays, getWeekRange (Senin–Minggu), weekDays, toIsoDateTime (`new Date(\`${dateKey}T${time}:00\).toISOString()`), toDateKey, timeFromDate.
- Penanganan bentrok: `apiFetch` throw Error dengan pesan API -> mutation `onError` -> `toast.error`. Pada reschedule manual yang menghasilkan `{ rescheduled: false, alternativeTutors }`, nama-nama tutor tersedia ditampilkan di toast.
- Mobile-first: weekly pakai `overflow-x-auto` + `min-w-[760px]`, daily tetap agenda vertikal; layout toolbar stack di mobile.
- Lint & tsc bersih untuk file ini (error tersisa di `tutor-portal-view.tsx` & `prisma/seed.ts` milik task lain).

Stage Summary:
- File: `src/components/views/jadwal-view.tsx` (~1417 baris, 14 fungsi inline)
- Fitur: kalender harian/mingguan + filter tutor + deteksi bentrok (toast dari API) + form tambah/edit dengan preview honor + batal dengan opsi tutor pengganti + reschedule (saran slot 7 hari, tutor alternatif, override manual).
- Invalidation: `["sesi"]` & `["dashboard"]` setelah mutasi.
- Komponen sudah terhubung di `app-shell.tsx` (dynamic import, ssr:false).

---
Task ID: 8
Agent: subagent-absensi
Task: Build Absensi fixed-time (GPS) view with daily recap

Work Log:
- Membaca worklog.md, lib/constants, lib/api-client, lib/schedule, API contract absensi/check-in/out, pengaturan, shared/ui, program-view, shadcn/ui components
- Membuat src/components/views/absensi-view.tsx dengan dua tab (Tabs shadcn): "Absen Sekarang" & "Rekap Harian"
- Tab 1 (Absen Sekarang): kartu tanggal hari ini + jam kerja + radius dari GET /api/pengaturan; Select karyawan fixed-time (GET /api/karyawan?tipe=FIXED&status=AKTIF) dengan default derived (selectedKaryawanId || karyawanList[0].id) tanpa useEffect; tombol "Deteksi Lokasi Saya" memakai navigator.geolocation.getCurrentPosition dengan fallback otomatis ke koordinat kantor jika denied/unsupported; preview jarak haversine + indikator dalam/luar radius (hijau/merah); input manual lat/lng untuk demo; tombol besar "Absen Masuk" (emerald, LogIn icon) & "Absen Pulang" (rose outline, LogOut icon) memanggil POST /api/absensi/check-in|check-out; tampilkan record hari ini (status, jamMasuk, jamPulang, terlambatMenit, pulangCepatMenit) untuk karyawan terpilih; kartu info lokasi kantor
- Tab 2 (Rekap Harian): date picker (Calendar shadcn dalam Popover) untuk pilih tanggal; StatCards summary (Hadir/Terlambat/Tidak Hadir/Cuti); Tabel (Table shadcn) semua karyawan FIXED di-merge dengan absensi tanggal tersebut (Map karyawanId->absensi); kolom nama, masuk, pulang, StatusAbsensiBadge, keterangan (terlambat/pulang cepat/tepat waktu/tanpa record); jika tidak ada record, tampilkan badge TIDAK_HADIR; scroll vertical max-h-[60vh]
- Penanganan error: toast sonner untuk success/error; Alert komponen untuk error lokasi dan validasi; toasts context-aware (warning untuk terlambat/pulang cepat, success untuk tepat waktu)
- Memperbaiki TypeScript errors: aliasing Calendar lucide menjadi CalendarIcon untuk menghindari collision dengan Calendar shadcn; mengganti tipe react-day-picker Date dengan Date | undefined; menambahkan closing paren untuk apiFetch
- Memperbaiki lint: refaktor selectedKaryawanId ke derived effectiveKaryawanId (menghilangkan useEffect setState); menghapus useEffect auto-fallback geolocation (cukup pakai tombol "Pakai Koordinat Kantor")
- Verifikasi: tsc --noEmit tanpa error di absensi-view; bun run lint tanpa error di absensi-view; dev.log menunjukkan kompilasi berhasil

Stage Summary:
- File: src/components/views/absensi-view.tsx (~980 baris)
- Export: AbsensiView (di-wire di app-shell.tsx line 18 sebagai dynamic import ssr:false)
- Fitur kunci:
  * GPS check-in/out dengan fallback otomatis ke koordinat kantor (demo-friendly di sandbox)
  * Manual lat/lng fallback input + tombol "Pakai Koordinat Kantor"
  * Client-side preview radius (haversine) sebelum submit ke API
  * Tab rekap harian dengan date picker + StatCards + Table merge karyawan↔absensi
  * StatusAbsensiBadge untuk HADIR/TERLAMBAT/TIDAK_HADIR/CUTI/LIBUR
  * Mobile-first responsive: grid 1-col mobile → 3-col desktop; sticky action buttons
- Konsisten dengan konvensi: apiFetch, useQuery/useMutation, toast sonner, shadcn/ui New York, lucide icons, "use client"

---
Task ID: 13
Agent: main (Z.ai Code)
Task: Integrasi, perbaikan lint, dan verifikasi end-to-end

Work Log:
- Memperbaiki error lint `react-hooks/set-state-in-effect` di providers, header, jadwal-view (konversi useEffect-based form sync ke lazy useState + key remount, dan reschedule suggestions fetch ke useQuery)
- Memperbaiki export `formatTanggalKey` (rename ke formatDateKey di dashboard route)
- Menambah `onDelete: Cascade` pada RekapAbsensi/RekapSesi relations + defensif delete children-first di persistRekap untuk mengatasi P2003 (foreign key) saat kunci periode
- Verifikasi Agent Browser end-to-end:
  * Dashboard render 200, stats + sesi hari ini + absensi staf + upcoming
  * Karyawan: 6 karyawan (2 fixed, 4 flexible), filter chips + CRUD
  * Program: 5 program dengan tarif, CRUD
  * Siswa: CRUD + relasi program
  * Jadwal: kalender harian/mingguan + tutor filter + Tambah Sesi
  * Absensi: tab Absen Sekarang (GPS) + Rekap Harian
  * Konfirmasi: approve sesi menunggu BERHASIL (sesi berubah jadi SELESAI)
  * Payroll: Buat Periode September 2026 -> Hitung Ulang (6 karyawan direkap, honor terhitung) -> Kunci Periode (status TERKUNCI, Hapus disabled, Buka Kunci muncul) - ALUR TUTUP BUKU LENGKAP
  * Pengaturan: 3 tab (Umum, Hari Libur, Cuti)
  * Tutor Portal: jadwal Pak Budi 14 hari, tab Absen (kamera), badge notifikasi
- `bun run lint` bersih (0 errors, 0 warnings)

Stage Summary:
- Semua 9 MVP terpenuhi & terverifikasi browser
- Aplikasi siap pakai, di-seed dengan data demo lengkap
- Stack final: Next.js 16 App Router + TypeScript + Tailwind 4 + shadcn/ui + Prisma/SQLite + TanStack Query + Zustand + sonner
