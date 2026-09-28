# HRIS Hikari — PT Hikari Bridge Indonesia

Sistem Human Resource Information System (HRIS) internal untuk PT Hikari Bridge Indonesia. Mengelola absensi, jadwal tutor, payroll, dan cuti secara terpadu dalam satu platform.

---

## Fitur Utama

### Portal Admin
- Dashboard ringkasan operasional
- Manajemen karyawan & tutor
- Konfirmasi sesi & jadwal tutor
- Payroll bulanan (DRAFT → TERKUNCI)
- Manajemen siswa & program
- Pengaturan sistem

### Portal Karyawan (Staf Tetap)
- Absensi harian (check-in/check-out)
- Pengajuan cuti & izin
- Riwayat kehadiran

### Portal Tutor (Staf Fleksibel)
- Jadwal sesi mengajar
- Check-in/check-out sesi
- Reschedule & laporan sesi

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Bahasa | TypeScript 5 |
| UI | shadcn/ui + Radix UI + Tailwind CSS v4 |
| Database | SQLite via Prisma ORM |
| Runtime | Bun |
| State | Zustand + TanStack Query |
| Auth | Session-based (localStorage `hris-session`) |

---

## Struktur Folder

```
├── prisma/
│   ├── schema.prisma       # Skema database
│   └── seed.ts             # Data dummy 3 tahun
├── public/
│   └── hikari-logo.png     # Logo PT Hikari Bridge Indonesia
├── src/
│   ├── app/
│   │   ├── api/            # Route handlers (REST API)
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── components/
│       ├── layout/         # AppShell, Header, Sidebar
│       ├── shared/         # Komponen UI bersama
│       ├── ui/             # shadcn/ui components
│       └── views/          # Halaman per fitur
```

---

## Cara Menjalankan

### A. Dengan Docker (Direkomendasikan — untuk tim internal)

> Prasyarat: [Docker Desktop](https://www.docker.com/products/docker-desktop/) sudah terinstall.

**1. Salin file environment:**
```bash
cp .env.example .env
```

**2. (Opsional) Ganti password database di `.env`:**
```
DB_PASSWORD=password_anda
APP_PORT=3000
```

**3. Jalankan semua service:**
```bash
docker compose up -d
```

Perintah ini otomatis akan:
- Menjalankan PostgreSQL
- Menjalankan migrasi skema & seed data dummy
- Menjalankan aplikasi HRIS

**4. Akses aplikasi:**
- Dari komputer server: `http://localhost` atau `http://hris.hikari.local`
- Dari komputer lain di jaringan yang sama: `http://hris.hikari.local` *(setelah setup hosts)*

**Perintah Docker lainnya:**
```bash
# Lihat log aplikasi
docker compose logs -f app

# Lihat log Nginx
docker compose logs -f nginx

# Stop semua service
docker compose down

# Reset database (hapus semua data)
docker compose down -v
docker compose up -d
```

---

### Setup Domain Internal `hris.hikari.local`

Agar seluruh tim bisa akses via nama domain (bukan IP), jalankan script berikut **di setiap komputer** yang perlu akses:

**Windows** *(jalankan PowerShell sebagai Administrator)*:
```powershell
.\scripts\setup-hosts.ps1
```

**Mac / Linux**:
```bash
sudo bash scripts/setup-hosts.sh
```

Script akan menanyakan IP server, lalu mendaftarkan `hris.hikari.local` secara otomatis. Setelah itu buka browser dan akses:

```
http://hris.hikari.local
```

---

### B. Development Lokal (Tanpa Docker)

> Prasyarat: [Bun](https://bun.sh) v1.x + PostgreSQL 15+

```bash
bun install
cp .env.example .env
# Edit .env → isi DATABASE_URL dengan koneksi PostgreSQL lokal
bun run db:generate
bun run db:push
bun run db:seed
bun run dev
```

Akses di: [http://localhost:3000](http://localhost:3000)

---

## Akun Default (Seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hikari.id | `admin123` |
| Karyawan | (lihat seed) | `karyawan123` |
| Tutor | (lihat seed) | `tutor123` |

> Ganti password setelah login pertama kali di Pengaturan.

---

## Perintah Database

```bash
bun run db:push       # Sinkron skema tanpa migrasi
bun run db:migrate    # Jalankan migrasi
bun run db:seed       # Reset & isi ulang data dummy
bun run db:reset      # Reset penuh database
```

---

## Status Pengembangan

### Tahap 1 — Selesai ✅
- Role-based auth (Admin / Karyawan / Tutor)
- Absensi staf tetap dengan validasi GPS
- Manajemen sesi & jadwal tutor
- Cuti & izin
- Payroll bulanan
- Notifikasi internal
- Data dummy 3 tahun (100 siswa, 10 staf, 50 tutor)

### Tahap 2 — Planned 🔄
- Profil karyawan lengkap & manajemen dokumen
- Slip gaji digital di portal karyawan
- Penilaian kinerja (KPI)
- Rekrutmen & onboarding
- Klaim & reimbursement
- Laporan & analitik manajemen

---

## Lisensi

Hak cipta © 2026 PT Hikari Bridge Indonesia. Seluruh hak dilindungi.
