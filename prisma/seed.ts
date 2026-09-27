/**
 * Seed data: 3 years of realistic HRIS history (Jan 2023 – Sep 2026)
 *
 * Coverage:
 *  - 1 admin user
 *  - 10 FIXED staff  (8 aktif, 2 resign mid-way)
 *  - 50 FLEXIBLE tutors (45 aktif, 5 nonaktif)
 *  - 8 programs
 *  - 100 students
 *  - ~3 years of daily Absensi for FIXED staff (weekdays only)
 *  - ~3 years of Sesi for FLEXIBLE tutors (Mon–Sat)
 *  - Payroll periods Jan 2023 – Aug 2026 (TERKUNCI), Sep 2026 DRAFT
 *  - RekapGaji + RekapAbsensi + RekapSesi for every locked period
 *  - Cuti requests, Potongan, HariLibur, Notifikasi
 */

import { db } from "../src/lib/db"

// ─── helpers ──────────────────────────────────────────────────────────────────

function dateOnly(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d))
}

function withTime(base: Date, h: number, min = 0) {
  const d = new Date(base)
  d.setUTCHours(h, min, 0, 0)
  return d
}

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setUTCDate(r.getUTCDate() + n)
  return r
}

function isWeekday(d: Date) {
  const day = d.getUTCDay()
  return day >= 1 && day <= 5
}

function* eachDay(from: Date, to: Date) {
  let cur = new Date(from)
  while (cur <= to) {
    yield new Date(cur)
    cur = addDays(cur, 1)
  }
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─── static data ──────────────────────────────────────────────────────────────

const SEED_FROM = dateOnly(2023, 1, 1)
const SEED_TO   = dateOnly(2026, 9, 25)

// 100 nama siswa
const NAMA_SISWA = [
  "Adi Nugroho","Agus Setiawan","Ahmad Fauzi","Aldy Pratama","Alif Ramadhan",
  "Alifah Salsabila","Amanda Putri","Amelia Rahayu","Andi Cahyono","Andika Wibowo",
  "Anisa Dewi","Annisa Fitri","Arief Budiman","Arifin Hakim","Arimbi Kusuma",
  "Arya Santoso","Aulia Rahmawati","Bagus Permana","Bayu Saputra","Bella Maharani",
  "Bintang Cahaya","Bunga Lestari","Cahya Nurani","Candra Wijaya","Cantika Sari",
  "Citra Kirana","Damar Wulandari","Dani Kusuma","Dea Amelia","Desi Ratnasari",
  "Dewa Putra","Dewi Anggraeni","Diana Putri","Dimas Anggara","Dinda Permata",
  "Dini Oktaviani","Dwi Lestari","Eka Prasasti","Elsa Maharani","Evan Aditya",
  "Fajar Nugroho","Fariz Hakim","Fatimah Azzahra","Fauzan Akbar","Feni Susanti",
  "Fikri Ramadhani","Fitri Handayani","Gading Pratama","Gita Permata","Hadi Santoso",
  "Hendra Saputra","Hesti Rahayu","Ibnu Malik","Indah Cahyani","Indra Gunawan",
  "Irfan Maulana","Joko Susilo","Kartika Dewi","Kevin Pratama","Kurnia Sari",
  "Lani Fitriani","Lestari Wulandari","Lutfi Rahman","Mahendra Putra","Maya Sari",
  "Mira Andriani","Muhammad Rizki","Nanda Putra","Naufal Firdaus","Nindi Saraswati",
  "Nisa Amalia","Novi Rahayu","Nurul Hidayah","Oky Firmansyah","Pandu Wicaksono",
  "Putri Andini","Rani Oktavia","Rangga Kusuma","Ratih Puspita","Reihan Saputra",
  "Rendy Pratama","Reza Firmansyah","Rina Oktaviani","Risma Dewi","Rizal Fauzi",
  "Rizki Aditya","Sari Melati","Selvi Andriani","Sinta Wulandari","Siti Fatimah",
  "Soni Irawan","Taufik Hidayat","Tiara Ayu","Tika Rahayu","Ulfa Maulida",
  "Ulfah Nuraini","Vina Amelia","Wahyu Nugroho","Wanda Pratiwi","Yanti Kusuma",
]

const WALI_PREFIX = ["Bapak","Ibu"]
const WALI_NAMA = [
  "Surya","Dewi","Hendra","Ratna","Joko","Sari","Wahyu","Lina","Doni","Wati",
  "Agus","Nani","Tono","Rina","Budi","Yuli","Fandi","Umi","Imam","Nurul",
  "Heri","Fitri","Anton","Rini","Bambang","Sri","Wahyudi","Endah","Slamet","Yunita",
]

// 10 nama staf FIXED
const NAMA_STAF = [
  { nama: "Rina Wati",      email: "rina@bimbel.id",     gajiPokok: 6500000, status: "AKTIF"    },
  { nama: "Dedi Santoso",   email: "dedi@bimbel.id",     gajiPokok: 5800000, status: "AKTIF"    },
  { nama: "Hani Susanti",   email: "hani@bimbel.id",     gajiPokok: 5500000, status: "NONAKTIF" }, // resign Jul 2024
  { nama: "Budi Hartono",   email: "budi.s@bimbel.id",   gajiPokok: 6000000, status: "AKTIF"    },
  { nama: "Sari Permata",   email: "sari@bimbel.id",     gajiPokok: 5700000, status: "AKTIF"    },
  { nama: "Wahyu Andika",   email: "wahyu@bimbel.id",    gajiPokok: 6200000, status: "AKTIF"    },
  { nama: "Novi Lestari",   email: "novi@bimbel.id",     gajiPokok: 5600000, status: "AKTIF"    },
  { nama: "Reza Maulana",   email: "reza.m@bimbel.id",   gajiPokok: 5900000, status: "AKTIF"    },
  { nama: "Tika Rahayu",    email: "tika.s@bimbel.id",   gajiPokok: 5400000, status: "NONAKTIF" }, // resign Mar 2025
  { nama: "Imam Fauzi",     email: "imam@bimbel.id",     gajiPokok: 6100000, status: "AKTIF"    },
]

// 50 tutor FLEXIBLE
const NAMA_TUTOR = [
  { nama: "Pak Budi",      email: "budi@bimbel.id",      status: "AKTIF"    },
  { nama: "Bu Sinta",      email: "sinta@bimbel.id",     status: "AKTIF"    },
  { nama: "Pak Eko",       email: "eko@bimbel.id",       status: "AKTIF"    },
  { nama: "Bu Maya",       email: "maya@bimbel.id",      status: "AKTIF"    },
  { nama: "Pak Rizal",     email: "rizal@bimbel.id",     status: "AKTIF"    },
  { nama: "Bu Tari",       email: "tari@bimbel.id",      status: "NONAKTIF" }, // nonaktif Jun 2025
  { nama: "Pak Fajar",     email: "fajar@bimbel.id",     status: "AKTIF"    },
  { nama: "Bu Nita",       email: "nita@bimbel.id",      status: "AKTIF"    },
  { nama: "Pak Hendra",    email: "hendra@bimbel.id",    status: "AKTIF"    },
  { nama: "Bu Dewi",       email: "dewi@bimbel.id",      status: "AKTIF"    },
  { nama: "Pak Agus",      email: "agus@bimbel.id",      status: "AKTIF"    },
  { nama: "Bu Rini",       email: "rini@bimbel.id",      status: "AKTIF"    },
  { nama: "Pak Dani",      email: "dani@bimbel.id",      status: "AKTIF"    },
  { nama: "Bu Fitri",      email: "fitri@bimbel.id",     status: "AKTIF"    },
  { nama: "Pak Arif",      email: "arif@bimbel.id",      status: "AKTIF"    },
  { nama: "Bu Indah",      email: "indah@bimbel.id",     status: "AKTIF"    },
  { nama: "Pak Rudi",      email: "rudi@bimbel.id",      status: "AKTIF"    },
  { nama: "Bu Ayu",        email: "ayu@bimbel.id",       status: "AKTIF"    },
  { nama: "Pak Wahyu",     email: "wahyu.t@bimbel.id",   status: "AKTIF"    },
  { nama: "Bu Lia",        email: "lia@bimbel.id",       status: "AKTIF"    },
  { nama: "Pak Iwan",      email: "iwan@bimbel.id",      status: "AKTIF"    },
  { nama: "Bu Susi",       email: "susi@bimbel.id",      status: "AKTIF"    },
  { nama: "Pak Joko",      email: "joko.t@bimbel.id",    status: "AKTIF"    },
  { nama: "Bu Wati",       email: "wati@bimbel.id",      status: "AKTIF"    },
  { nama: "Pak Fandi",     email: "fandi@bimbel.id",     status: "AKTIF"    },
  { nama: "Bu Eni",        email: "eni@bimbel.id",       status: "AKTIF"    },
  { nama: "Pak Dodi",      email: "dodi@bimbel.id",      status: "AKTIF"    },
  { nama: "Bu Lina",       email: "lina@bimbel.id",      status: "AKTIF"    },
  { nama: "Pak Bayu",      email: "bayu@bimbel.id",      status: "NONAKTIF" }, // nonaktif Agt 2024
  { nama: "Bu Putri",      email: "putri.t@bimbel.id",   status: "AKTIF"    },
  { nama: "Pak Dika",      email: "dika@bimbel.id",      status: "AKTIF"    },
  { nama: "Bu Sela",       email: "sela@bimbel.id",      status: "AKTIF"    },
  { nama: "Pak Reno",      email: "reno@bimbel.id",      status: "AKTIF"    },
  { nama: "Bu Tuti",       email: "tuti@bimbel.id",      status: "AKTIF"    },
  { nama: "Pak Yudi",      email: "yudi@bimbel.id",      status: "AKTIF"    },
  { nama: "Bu Nana",       email: "nana@bimbel.id",      status: "AKTIF"    },
  { nama: "Pak Andi",      email: "andi.t@bimbel.id",    status: "AKTIF"    },
  { nama: "Bu Rani",       email: "rani@bimbel.id",      status: "AKTIF"    },
  { nama: "Pak Fikri",     email: "fikri@bimbel.id",     status: "AKTIF"    },
  { nama: "Bu Sari",       email: "sari.t@bimbel.id",    status: "AKTIF"    },
  { nama: "Pak Kevin",     email: "kevin@bimbel.id",     status: "AKTIF"    },
  { nama: "Bu Mira",       email: "mira@bimbel.id",      status: "AKTIF"    },
  { nama: "Pak Evan",      email: "evan@bimbel.id",      status: "AKTIF"    },
  { nama: "Bu Tiara",      email: "tiara@bimbel.id",     status: "AKTIF"    },
  { nama: "Pak Reihan",    email: "reihan@bimbel.id",    status: "AKTIF"    },
  { nama: "Bu Vina",       email: "vina@bimbel.id",      status: "AKTIF"    },
  { nama: "Pak Naufal",    email: "naufal@bimbel.id",    status: "AKTIF"    },
  { nama: "Bu Alya",       email: "alya@bimbel.id",      status: "AKTIF"    },
  { nama: "Pak Rizki",     email: "rizki@bimbel.id",     status: "NONAKTIF" }, // nonaktif Feb 2025
  { nama: "Bu Wanda",      email: "wanda@bimbel.id",     status: "AKTIF"    },
]

// nonaktif cut-off dates per tutor email
const TUTOR_CUTOFF: Record<string, Date> = {
  "tari@bimbel.id":   dateOnly(2025, 6, 30),
  "bayu@bimbel.id":   dateOnly(2024, 8, 31),
  "rizki@bimbel.id":  dateOnly(2025, 2, 28),
}

// staf resign cut-off
const STAF_CUTOFF: Record<string, Date> = {
  "hani@bimbel.id":   dateOnly(2024, 7, 31),
  "tika.s@bimbel.id": dateOnly(2025, 3, 31),
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Seeding 3 years of HRIS data (100 siswa, 10 staf, 50 tutor) …")

  // ── 0. wipe ──────────────────────────────────────────────────────────────────
  console.log("   Clearing old data …")
  await db.rekapAbsensi.deleteMany()
  await db.rekapSesi.deleteMany()
  await db.rekapGaji.deleteMany()
  await db.periodeGaji.deleteMany()
  await db.potongan.deleteMany()
  await db.notifikasi.deleteMany()
  await db.absensi.deleteMany()
  await db.sesi.deleteMany()
  await db.cuti.deleteMany()
  await db.siswaProgram.deleteMany()
  await db.siswa.deleteMany()
  await db.hariLibur.deleteMany()
  await db.program.deleteMany()
  await db.user.deleteMany()
  await db.karyawan.deleteMany()
  await db.pengaturan.deleteMany()

  // ── 1. pengaturan ────────────────────────────────────────────────────────────
  await db.pengaturan.create({
    data: {
      id: "default",
      namaPerusahaan: "PT Hikari Bridge Indonesia",
      kantorLat: -6.200000,
      kantorLng: 106.816666,
      kantorRadiusMeter: 150,
      jamMasukFixed: "07:30",
      jamPulangFixed: "17:00",
      toleransiTerlambatMenit: 15,
      checkInWindowMin: 15,
      checkInWindowMax: 30,
    },
  })

  // ── 2. admin ─────────────────────────────────────────────────────────────────
  await db.user.create({
    data: { email: "admin@bimbel.id", password: "admin123", name: "Administrator", role: "ADMIN" },
  })

  // ── 3. programs ──────────────────────────────────────────────────────────────
  const programDefs = [
    { nama: "Matematika SD",      tarifPerJam: 50000, warna: "#10b981" },
    { nama: "Matematika SMP",     tarifPerJam: 75000, warna: "#0ea5e9" },
    { nama: "Matematika SMA",     tarifPerJam: 90000, warna: "#3b82f6" },
    { nama: "Bahasa Inggris SD",  tarifPerJam: 55000, warna: "#f59e0b" },
    { nama: "Bahasa Inggris SMP", tarifPerJam: 70000, warna: "#f97316" },
    { nama: "Fisika SMA",         tarifPerJam: 95000, warna: "#ef4444" },
    { nama: "Kimia SMA",          tarifPerJam: 95000, warna: "#8b5cf6" },
    { nama: "Biologi SMA",        tarifPerJam: 85000, warna: "#ec4899" },
  ]
  const programs = await Promise.all(
    programDefs.map((p) => db.program.create({ data: { ...p, status: "AKTIF" } }))
  )

  // ── 4. siswa (100 students) ───────────────────────────────────────────────────
  console.log("   Creating 100 siswa …")
  const siswaRecords = []
  for (let i = 0; i < 100; i++) {
    const wali = `${pick(WALI_PREFIX)} ${pick(WALI_NAMA)}`
    const s = await db.siswa.create({
      data: {
        nama: NAMA_SISWA[i],
        namaWali: wali,
        telepon: `08${rand(10,99)}${rand(1000000,9999999)}`,
      },
    })
    siswaRecords.push(s)
    // each student enrolled in 1-2 programs
    const p1 = programs[i % programs.length].id
    const p2 = programs[(i + rand(1,3)) % programs.length].id
    await db.siswaProgram.create({ data: { siswaId: s.id, programId: p1 } })
    if (p1 !== p2) {
      await db.siswaProgram.create({ data: { siswaId: s.id, programId: p2 } })
    }
  }

  // ── 5. staf FIXED (10) ───────────────────────────────────────────────────────
  console.log("   Creating 10 staf FIXED …")
  const fixedRecords = []
  for (const f of NAMA_STAF) {
    const k = await db.karyawan.create({ data: { ...f, tipe: "FIXED" } })
    await db.user.create({ data: { email: f.email, password: "demo123", name: f.nama, role: "KARYAWAN", karyawanId: k.id } })
    fixedRecords.push({ ...k, email: f.email })
  }

  // ── 6. tutor FLEXIBLE (50) ───────────────────────────────────────────────────
  console.log("   Creating 50 tutor FLEXIBLE …")
  const tutorRecords = []
  for (const t of NAMA_TUTOR) {
    const k = await db.karyawan.create({ data: { ...t, tipe: "FLEXIBLE", gajiPokok: 0 } })
    await db.user.create({ data: { email: t.email, password: "demo123", name: t.nama, role: "KARYAWAN", karyawanId: k.id } })
    tutorRecords.push({ ...k, email: t.email })
  }

  // ── 7. hari libur ────────────────────────────────────────────────────────────
  console.log("   Creating hari libur …")
  const liburDefs = [
    { m:1,  d:1,  nama:"Tahun Baru Masehi",             recurring:true  },
    { m:5,  d:1,  nama:"Hari Buruh Internasional",       recurring:true  },
    { m:8,  d:17, nama:"Hari Kemerdekaan RI",            recurring:true  },
    { m:12, d:25, nama:"Hari Raya Natal",                recurring:true  },
    { m:4,  d:10, nama:"Hari Raya Idul Fitri 2023",      recurring:false, y:2023 },
    { m:4,  d:11, nama:"Cuti Bersama Idul Fitri 2023",   recurring:false, y:2023 },
    { m:3,  d:29, nama:"Hari Raya Idul Fitri 2024",      recurring:false, y:2024 },
    { m:3,  d:30, nama:"Cuti Bersama Idul Fitri 2024",   recurring:false, y:2024 },
    { m:3,  d:18, nama:"Hari Raya Idul Fitri 2025",      recurring:false, y:2025 },
    { m:3,  d:19, nama:"Cuti Bersama Idul Fitri 2025",   recurring:false, y:2025 },
    { m:3,  d:7,  nama:"Hari Raya Idul Fitri 2026",      recurring:false, y:2026 },
    { m:3,  d:8,  nama:"Cuti Bersama Idul Fitri 2026",   recurring:false, y:2026 },
    { m:6,  d:17, nama:"Hari Raya Idul Adha 2023",       recurring:false, y:2023 },
    { m:6,  d:5,  nama:"Hari Raya Idul Adha 2024",       recurring:false, y:2024 },
    { m:5,  d:27, nama:"Hari Raya Idul Adha 2025",       recurring:false, y:2025 },
    { m:5,  d:16, nama:"Hari Raya Idul Adha 2026",       recurring:false, y:2026 },
  ]
  const holidaySet = new Set<string>()
  for (const l of liburDefs) {
    const years = l.recurring ? [2023,2024,2025,2026] : [l.y!]
    for (const yr of years) {
      const t = dateOnly(yr, l.m, l.d)
      const key = t.toISOString()
      if (!holidaySet.has(key)) {
        holidaySet.add(key)
        await db.hariLibur.create({ data: { tanggal: t, nama: l.nama, recurring: l.recurring } })
      }
    }
  }
  const isHoliday = (d: Date) => holidaySet.has(d.toISOString())

  // ── 8. absensi FIXED staff ────────────────────────────────────────────────────
  console.log("   Generating Absensi for 10 staf …")
  const allAbsensi: object[] = []
  for (const k of fixedRecords) {
    const until = STAF_CUTOFF[k.email] ?? SEED_TO
    for (const day of eachDay(SEED_FROM, until)) {
      if (!isWeekday(day)) continue
      if (isHoliday(day)) {
        allAbsensi.push({ karyawanId:k.id, tanggal:day, jamMasuk:null, jamPulang:null, status:"LIBUR", terlambatMenit:null, pulangCepatMenit:null, gpsMasukLat:null, gpsMasukLng:null, gpsPulangLat:null, gpsPulangLng:null })
        continue
      }
      const roll = Math.random()
      if (roll < 0.05) {
        allAbsensi.push({ karyawanId:k.id, tanggal:day, jamMasuk:null, jamPulang:null, status:"TIDAK_HADIR", terlambatMenit:null, pulangCepatMenit:null, gpsMasukLat:null, gpsMasukLng:null, gpsPulangLat:null, gpsPulangLng:null })
      } else {
        const terlambat = roll < 0.15 ? rand(16, 60) : null
        const masukMin  = terlambat ?? rand(-5, 10)
        const jamMasuk  = withTime(day, 7, 30 + masukMin)
        const pulangCepat = Math.random() < 0.05 ? rand(10, 60) : null
        const jamPulang = withTime(day, 17, pulangCepat ? -pulangCepat : rand(0, 20))
        allAbsensi.push({
          karyawanId:k.id, tanggal:day, jamMasuk, jamPulang,
          status: terlambat ? "TERLAMBAT" : "HADIR",
          terlambatMenit: terlambat ?? null,
          pulangCepatMenit: pulangCepat ?? null,
          gpsMasukLat: -6.2 + (Math.random()-0.5)*0.001,
          gpsMasukLng: 106.816666 + (Math.random()-0.5)*0.001,
          gpsPulangLat: -6.2 + (Math.random()-0.5)*0.001,
          gpsPulangLng: 106.816666 + (Math.random()-0.5)*0.001,
        })
      }
    }
  }
  for (let i = 0; i < allAbsensi.length; i += 500) {
    await db.absensi.createMany({ data: allAbsensi.slice(i, i + 500) as any })
  }
  console.log(`   → ${allAbsensi.length} absensi records`)

  // ── 9. sesi FLEXIBLE tutors ───────────────────────────────────────────────────
  console.log("   Generating Sesi for 50 tutor …")
  // Each tutor gets 2-3 fixed weekly slots derived from their index
  const HOURS_POOL  = [9, 10, 11, 13, 14, 15, 16, 17, 18, 19]
  const DOW_POOL    = [1, 2, 3, 4, 5, 6] // Mon–Sat
  const DURASI_POOL = [60, 90, 120]

  // pre-build slot schedule per tutor
  const tutorSchedule: Array<Array<{ dow:number; hour:number; durasi:number; progIdx:number; siswaIdx:number }>> = []
  for (let ti = 0; ti < tutorRecords.length; ti++) {
    const slotCount = rand(2, 4)
    const slots: typeof tutorSchedule[0] = []
    const usedDowHour = new Set<string>()
    for (let s = 0; s < slotCount; s++) {
      let dow: number, hour: number, key: string
      let attempts = 0
      do {
        dow  = DOW_POOL[(ti * 3 + s * 7 + attempts) % DOW_POOL.length]
        hour = HOURS_POOL[(ti * 5 + s * 11 + attempts) % HOURS_POOL.length]
        key  = `${dow}:${hour}`
        attempts++
      } while (usedDowHour.has(key) && attempts < 20)
      usedDowHour.add(key)
      const durasi = DURASI_POOL[(ti + s) % DURASI_POOL.length]
      // Clamp: sesi tidak boleh melewati jam 21:00
      const maxDurasi = Math.max(60, (21 - hour) * 60)
      slots.push({
        dow,
        hour,
        durasi: Math.min(durasi, maxDurasi),
        progIdx: (ti + s * 3) % programs.length,
        siswaIdx: (ti * 7 + s * 13) % siswaRecords.length,
      })
    }
    tutorSchedule.push(slots)
  }

  const allSesi: object[] = []
  for (let ti = 0; ti < tutorRecords.length; ti++) {
    const tutor = tutorRecords[ti]
    const until = TUTOR_CUTOFF[tutor.email] ?? addDays(SEED_TO, 14)
    const slots  = tutorSchedule[ti]

    for (const day of eachDay(SEED_FROM, until)) {
      if (isHoliday(day)) continue
      const dow = day.getUTCDay()

      for (const slot of slots) {
        if (slot.dow !== dow) continue

        const roll   = Math.random()
        const prog   = programs[slot.progIdx]
        const siswa  = siswaRecords[slot.siswaIdx]
        const jamMulai   = withTime(day, slot.hour)
        const jamSelesai = withTime(day, slot.hour, slot.durasi)
        const isFuture   = day > SEED_TO

        let status = "SELESAI"
        let checkInAt: Date | null    = null
        let checkOutAt: Date | null   = null
        let terlambat: number | null  = null
        let confirmed = true

        if (roll < 0.07) {
          status = "DIBATALKAN"
        } else if (isFuture) {
          status = "TERJADWAL"
        } else if (day.toISOString().slice(0,10) === SEED_TO.toISOString().slice(0,10)) {
          status = "TERJADWAL"
        } else if (roll < 0.12 && day < addDays(SEED_TO, -7)) {
          // menunggu konfirmasi (early checkout, not yet resolved)
          status    = "MENUNGGU_KONFIRMASI"
          confirmed = false
          const lateMin = rand(0, 10)
          checkInAt  = withTime(day, slot.hour, lateMin)
          checkOutAt = withTime(day, slot.hour, rand(20, slot.durasi - 10))
          terlambat  = lateMin > 5 ? lateMin : null
        } else {
          const lateMin = Math.random() < 0.1 ? rand(6, 30) : rand(-5, 5)
          checkInAt  = withTime(day, slot.hour, lateMin)
          checkOutAt = withTime(day, slot.hour, slot.durasi + rand(-2, 5))
          terlambat  = lateMin > 5 ? lateMin : null
          confirmed  = true
        }

        allSesi.push({
          tanggal: day, jamMulai, jamSelesai,
          tutorId: tutor.id, programId: prog.id, siswaId: siswa.id,
          tarifSnapshot: prog.tarifPerJam, status,
          checkInAt, checkOutAt, terlambatMenit: terlambat, confirmed,
          checkInLat:  checkInAt  ? -6.2+(Math.random()-0.5)*0.001 : null,
          checkInLng:  checkInAt  ? 106.816666+(Math.random()-0.5)*0.001 : null,
          checkOutLat: checkOutAt ? -6.2+(Math.random()-0.5)*0.001 : null,
          checkOutLng: checkOutAt ? 106.816666+(Math.random()-0.5)*0.001 : null,
        })
      }
    }
  }

  for (let i = 0; i < allSesi.length; i += 500) {
    await db.sesi.createMany({ data: allSesi.slice(i, i + 500) as any })
  }
  console.log(`   → ${allSesi.length} sesi records`)

  // ── 10. cuti ──────────────────────────────────────────────────────────────────
  console.log("   Generating Cuti …")
  const alasanPool = [
    "Sakit","Keperluan keluarga","Liburan","Acara pernikahan saudara",
    "Urusan pribadi mendadak","Prosesi pernikahan","Cuti tahunan","Menjaga orang tua sakit",
  ]
  // generate ~3 cuti per staf per year
  for (const k of fixedRecords) {
    const until = STAF_CUTOFF[k.email] ?? SEED_TO
    for (let yr = 2023; yr <= 2026; yr++) {
      const yEnd = Math.min(until.getUTCFullYear() * 12 + until.getUTCMonth(), yr * 12 + 11)
      if (yr * 12 > yEnd) continue
      const count = rand(2, 4)
      for (let c = 0; c < count; c++) {
        const m    = rand(1, 12)
        const d    = rand(1, 25)
        const from = dateOnly(yr, m, d)
        if (from > until || from > SEED_TO) continue
        const dur  = rand(1, 3)
        const to   = addDays(from, dur)
        const statusRoll = Math.random()
        const status = from > addDays(SEED_TO, -7) ? "PENDING"
          : statusRoll < 0.75 ? "APPROVED" : "REJECTED"
        await db.cuti.create({
          data: { karyawanId: k.id, tanggalMulai: from, tanggalSelesai: to, alasan: pick(alasanPool), status },
        })
      }
    }
  }

  // ── 11. payroll periods + rekap ───────────────────────────────────────────────
  console.log("   Generating payroll periods + rekap …")

  const allAbsensiDB = await db.absensi.findMany({ select: { id:true, karyawanId:true, tanggal:true, status:true } })
  const absensiByKey: Record<string, typeof allAbsensiDB> = {}
  for (const a of allAbsensiDB) {
    const key = `${a.karyawanId}|${a.tanggal.getUTCFullYear()}|${a.tanggal.getUTCMonth()+1}`
    if (!absensiByKey[key]) absensiByKey[key] = []
    absensiByKey[key].push(a)
  }

  const allSesiDB = await db.sesi.findMany({
    select: { id:true, tutorId:true, tanggal:true, status:true, checkInAt:true, checkOutAt:true, jamMulai:true, jamSelesai:true, tarifSnapshot:true },
  })
  const sesiByKey: Record<string, typeof allSesiDB> = {}
  for (const s of allSesiDB) {
    const key = `${s.tutorId}|${s.tanggal.getUTCFullYear()}|${s.tanggal.getUTCMonth()+1}`
    if (!sesiByKey[key]) sesiByKey[key] = []
    sesiByKey[key].push(s)
  }

  let yr = 2023, mo = 1
  let periodCount = 0
  while (yr < 2026 || (yr === 2026 && mo <= 9)) {
    const isDraft = yr === 2026 && mo === 9
    const periode = await db.periodeGaji.create({
      data: { bulan: mo, tahun: yr, status: isDraft ? "DRAFT" : "TERKUNCI" },
    })

    if (!isDraft) {
      const allK = [...fixedRecords, ...tutorRecords]
      const rekapBatch: object[] = []
      const potBatch:   object[] = []
      const absLinkBatch: object[] = []
      const sesiLinkBatch: object[] = []

      for (const k of allK) {
        const kEmail = (k as any).email as string
        if (STAF_CUTOFF[kEmail] && (yr > STAF_CUTOFF[kEmail].getUTCFullYear() || (yr === STAF_CUTOFF[kEmail].getUTCFullYear() && mo > STAF_CUTOFF[kEmail].getUTCMonth()+1))) continue
        if (TUTOR_CUTOFF[kEmail] && (yr > TUTOR_CUTOFF[kEmail].getUTCFullYear() || (yr === TUTOR_CUTOFF[kEmail].getUTCFullYear() && mo > TUTOR_CUTOFF[kEmail].getUTCMonth()+1))) continue

        const isFixed   = k.tipe === "FIXED"
        const absList   = absensiByKey[`${k.id}|${yr}|${mo}`] ?? []
        const sesiList  = sesiByKey[`${k.id}|${yr}|${mo}`]    ?? []

        const jumlahHadir     = absList.filter((a) => a.status === "HADIR" || a.status === "TERLAMBAT").length
        const jumlahTerlambat = absList.filter((a) => a.status === "TERLAMBAT").length
        const jumlahTidakHadir= absList.filter((a) => a.status === "TIDAK_HADIR").length
        const selesaiSesi     = sesiList.filter((s) => s.status === "SELESAI")
        const cancelSesi      = sesiList.filter((s) => s.status === "DIBATALKAN")

        let totalHonor = 0
        for (const s of selesaiSesi) {
          const start = s.checkInAt  ?? s.jamMulai
          const end   = s.checkOutAt ?? s.jamSelesai
          const durH  = (end.getTime() - start.getTime()) / 3600000
          totalHonor += Math.round(durH * s.tarifSnapshot)
        }

        let totalPotongan = 0
        if (isFixed && jumlahTidakHadir > 0) totalPotongan += jumlahTidakHadir * rand(50000, 100000)
        if (Math.random() < 0.1) totalPotongan += rand(50000, 200000)

        const gajiPokok = isFixed ? k.gajiPokok : 0
        const totalGaji = Math.max(0, (isFixed ? gajiPokok : totalHonor) - totalPotongan)

        // insert rekap individually (need ID for links)
        const rekap = await db.rekapGaji.create({
          data: {
            periodeGajiId: periode.id, karyawanId: k.id, tipe: k.tipe,
            gajiPokok, totalHonor, totalPotongan, totalGaji,
            jumlahHadir, jumlahTerlambat, jumlahTidakHadir,
            jumlahSesi: selesaiSesi.length, jumlahSesiDibatalkan: cancelSesi.length,
          },
        })

        if (totalPotongan > 0) {
          await db.potongan.create({
            data: { nominal: totalPotongan, alasan: isFixed ? "Potongan ketidakhadiran" : "Potongan administrasi", tipe: "PER_PERIODE", periodeGajiId: periode.id },
          })
        }

        if (absList.length > 0) {
          await db.rekapAbsensi.createMany({ data: absList.map((a) => ({ rekapGajiId: rekap.id, absensiId: a.id })) })
        }
        if (selesaiSesi.length > 0) {
          await db.rekapSesi.createMany({ data: selesaiSesi.map((s) => ({ rekapGajiId: rekap.id, sesiId: s.id })) })
        }
      }
      periodCount++
      if (periodCount % 6 === 0) process.stdout.write(`   … periode ${mo}/${yr}\n`)
    }

    mo++
    if (mo > 12) { mo = 1; yr++ }
  }

  // ── 12. notifikasi ────────────────────────────────────────────────────────────
  console.log("   Generating Notifikasi …")
  const notifPool = [
    { tipe:"JADWAL_BARU",     judul:"Jadwal sesi baru",      pesan:"Anda memiliki jadwal sesi baru. Silakan cek kalender." },
    { tipe:"SESI_DIBATALKAN", judul:"Sesi dibatalkan",        pesan:"Sesi yang terjadwal telah dibatalkan oleh admin." },
    { tipe:"SESI_RESCHEDULE", judul:"Jadwal sesi diubah",     pesan:"Jadwal sesi Anda telah diubah. Cek detail terbaru." },
    { tipe:"GAJI_TERKUNCI",   judul:"Rekap gaji tersedia",    pesan:"Rekap gaji bulan ini sudah dikunci. Silakan periksa." },
    { tipe:"REMINDER_CEKIN",  judul:"Pengingat check-in",     pesan:"Sesi Anda akan dimulai 30 menit lagi. Jangan lupa check-in." },
  ]
  for (const t of tutorRecords) {
    const count = rand(2, 6)
    for (let i = 0; i < count; i++) {
      const n = pick(notifPool)
      await db.notifikasi.create({
        data: { karyawanId: t.id, tipe: n.tipe, judul: n.judul, pesan: n.pesan, dibaca: Math.random() > 0.4 },
      })
    }
  }
  for (const k of fixedRecords) {
    await db.notifikasi.create({
      data: { karyawanId: k.id, tipe: "GAJI_TERKUNCI", judul: "Rekap gaji Agustus 2026 tersedia", pesan: "Rekap gaji Agustus 2026 sudah dikunci oleh admin.", dibaca: false },
    })
  }

  console.log("\n✅  Seeding selesai!")
  console.log("   Admin  : admin@bimbel.id / admin123")
  console.log("   Tutor  : budi@bimbel.id  / demo123")
  console.log("   Staf   : rina@bimbel.id  / demo123")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
