import { db } from "../src/lib/db"
import { STATUS_SESI, TIPE_KARYAWAN, STATUS_KARYAWAN } from "../src/lib/constants"

async function main() {
  console.log("Seeding database...")

  // --- Admin user ---
  await db.user.upsert({
    where: { email: "admin@bimbel.id" },
    update: {},
    create: {
      email: "admin@bimbel.id",
      password: "admin123",
      name: "Administrator",
      role: "ADMIN",
    },
  })

  // --- Pengaturan ---
  await db.pengaturan.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      kantorLat: -6.200000,
      kantorLng: 106.816666,
      kantorRadiusMeter: 150,
      jamMasukFixed: "07:30",
      jamPulangFixed: "17:00",
      toleransiTerlambatMenit: 1,
      checkInWindowMin: 15,
      checkInWindowMax: 30,
      namaPerusahaan: "Bimbel Cerdas",
    },
  })

  // --- Program ---
  const programs = [
    { nama: "Matematika SD", tarifPerJam: 50000, warna: "#10b981", deskripsi: "Bimbingan Matematika tingkat SD" },
    { nama: "Matematika SMP", tarifPerJam: 75000, warna: "#0ea5e9", deskripsi: "Bimbingan Matematika tingkat SMP" },
    { nama: "Bahasa Inggris", tarifPerJam: 65000, warna: "#f59e0b", deskripsi: "Bimbingan Bahasa Inggris" },
    { nama: "Fisika SMA", tarifPerJam: 90000, warna: "#ef4444", deskripsi: "Bimbingan Fisika tingkat SMA" },
    { nama: "Kimia SMA", tarifPerJam: 90000, warna: "#8b5cf6", deskripsi: "Bimbingan Kimia tingkat SMA" },
  ]
  const programRecords = []
  for (const p of programs) {
    const existing = await db.program.findFirst({ where: { nama: p.nama } })
    const rec = existing
      ? await db.program.update({ where: { id: existing.id }, data: { ...p, status: STATUS_KARYAWAN.AKTIF } })
      : await db.program.create({ data: { ...p, status: STATUS_KARYAWAN.AKTIF } })
    programRecords.push(rec)
  }

  // --- Siswa ---
  const siswaList = [
    { nama: "Andi Pratama", namaWali: "Bapak Surya", telepon: "081234567890" },
    { nama: "Bunga Lestari", namaWali: "Ibu Dewi", telepon: "081298765432" },
    { nama: "Citra Kirana", namaWali: "Bapak Hendra", telepon: "081311112222" },
    { nama: "Dimas Anggara", namaWali: "Ibu Ratna", telepon: "081344445555" },
    { nama: "Elsa Maharani", namaWali: "Bapak Joko", telepon: "081377778888" },
  ]
  const siswaRecords = []
  for (const s of siswaList) {
    const rec = await db.siswa.create({ data: s })
    siswaRecords.push(rec)
    // link to programs
    if (s.nama.startsWith("Andi")) {
      await db.siswaProgram.create({ data: { siswaId: rec.id, programId: programRecords[0].id } })
    } else if (s.nama.startsWith("Bunga")) {
      await db.siswaProgram.create({ data: { siswaId: rec.id, programId: programRecords[1].id } })
    } else if (s.nama.startsWith("Citra")) {
      await db.siswaProgram.create({ data: { siswaId: rec.id, programId: programRecords[2].id } })
    } else if (s.nama.startsWith("Dimas")) {
      await db.siswaProgram.create({ data: { siswaId: rec.id, programId: programRecords[3].id } })
    } else {
      await db.siswaProgram.create({ data: { siswaId: rec.id, programId: programRecords[4].id } })
    }
  }

  // --- Karyawan ---
  // Fixed-time staff
  const staf = [
    { nama: "Rina Wati", email: "rina@bimbel.id", telepon: "082111112222", tipe: TIPE_KARYAWAN.FIXED, gajiPokok: 6500000 },
    { nama: "Dedi Santoso", email: "dedi@bimbel.id", telepon: "082133334444", tipe: TIPE_KARYAWAN.FIXED, gajiPokok: 5800000 },
  ]
  for (const s of staf) {
    const existing = await db.karyawan.findFirst({ where: { email: s.email } })
    const k = existing
      ? await db.karyawan.update({ where: { id: existing.id }, data: { ...s, status: STATUS_KARYAWAN.AKTIF } })
      : await db.karyawan.create({ data: { ...s, status: STATUS_KARYAWAN.AKTIF } })
    const uexisting = await db.user.findFirst({ where: { email: s.email } })
    if (!uexisting) {
      await db.user.create({ data: { email: s.email, password: "tutor123", name: s.nama, role: "KARYAWAN", karyawanId: k.id } })
    }
  }

  // Flexible-time tutors
  const tutors = [
    { nama: "Pak Budi", email: "budi@bimbel.id", telepon: "081200001111", tipe: TIPE_KARYAWAN.FLEXIBLE },
    { nama: "Bu Sinta", email: "sinta@bimbel.id", telepon: "081200002222", tipe: TIPE_KARYAWAN.FLEXIBLE },
    { nama: "Pak Eko", email: "eko@bimbel.id", telepon: "081200003333", tipe: TIPE_KARYAWAN.FLEXIBLE },
    { nama: "Bu Maya", email: "maya@bimbel.id", telepon: "081200004444", tipe: TIPE_KARYAWAN.FLEXIBLE },
  ]
  const tutorRecords = []
  for (const t of tutors) {
    const existing = await db.karyawan.findFirst({ where: { email: t.email } })
    const k = existing
      ? await db.karyawan.update({ where: { id: existing.id }, data: { ...t, gajiPokok: 0, status: STATUS_KARYAWAN.AKTIF } })
      : await db.karyawan.create({ data: { ...t, gajiPokok: 0, status: STATUS_KARYAWAN.AKTIF } })
    tutorRecords.push(k)
    const uexisting = await db.user.findFirst({ where: { email: t.email } })
    if (!uexisting) {
      await db.user.create({ data: { email: t.email, password: "tutor123", name: t.nama, role: "KARYAWAN", karyawanId: k.id } })
    }
  }

  // --- Hari libur (sample) ---
  const year = new Date().getFullYear()
  const liburList = [
    { tanggal: new Date(year, 7, 17), nama: "Hari Kemerdekaan RI", recurring: true },
    { tanggal: new Date(year, 0, 1), nama: "Tahun Baru", recurring: true },
    { tanggal: new Date(year, 4, 1), nama: "Hari Buruh Internasional", recurring: true },
  ]
  for (const l of liburList) {
    const exist = await db.hariLibur.findUnique({ where: { tanggal: l.tanggal } })
    if (!exist) await db.hariLibur.create({ data: l })
  }

  // --- Sesi hari ini & beberapa hari ke depan ---
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const makeSesi = (dayOffset: number, jamMulaiH: number, durasiMenit: number, tutorIdx: number, progIdx: number, siswaIdx: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() + dayOffset)
    d.setHours(0, 0, 0, 0)
    const mulai = new Date(d)
    mulai.setHours(jamMulaiH, 0, 0, 0)
    const selesai = new Date(mulai)
    selesai.setMinutes(selesai.getMinutes() + durasiMenit)
    return {
      tanggal: d,
      jamMulai: mulai,
      jamSelesai: selesai,
      tutorId: tutorRecords[tutorIdx].id,
      programId: programRecords[progIdx].id,
      siswaId: siswaRecords[siswaIdx].id,
      tarifSnapshot: programRecords[progIdx].tarifPerJam,
      status: STATUS_SESI.TERJADWAL,
    }
  }

  const sesiSeed = [
    makeSesi(0, 9, 90, 0, 0, 0),    // hari ini 09:00 Matematika SD - Pak Budi - Andi
    makeSesi(0, 13, 120, 1, 2, 2),  // hari ini 13:00 Bahasa Inggris - Bu Sinta - Citra
    makeSesi(0, 16, 90, 2, 3, 3),   // hari ini 16:00 Fisika SMA - Pak Eko - Dimas
    makeSesi(1, 10, 90, 0, 1, 1),   // besok
    makeSesi(1, 14, 120, 3, 4, 4),  // besok
    makeSesi(2, 9, 90, 1, 0, 0),
    makeSesi(2, 11, 90, 2, 3, 3),
    makeSesi(3, 15, 120, 0, 2, 2),
    makeSesi(-2, 9, 90, 0, 0, 0),   // 2 hari lalu (sudah selesai - simulated)
  ]
  for (const s of sesiSeed) {
    await db.sesi.create({ data: s })
  }

  // Simulate a completed past session (with check-in/out)
  const past = await db.sesi.findFirst({
    where: { tutorId: tutorRecords[0].id },
    orderBy: { jamMulai: "asc" },
  })
  if (past) {
    const cin = new Date(past.jamMulai)
    cin.setMinutes(cin.getMinutes() - 5)
    const cout = new Date(past.jamSelesai)
    await db.sesi.update({
      where: { id: past.id },
      data: {
        checkInAt: cin,
        checkOutAt: cout,
        checkInFoto: null,
        checkOutFoto: null,
        terlambatMenit: null,
        status: STATUS_SESI.SELESAI,
        confirmed: true,
      },
    })
  }

  // --- Simulate a session waiting for confirmation ---
  const wait = makeSesi(-1, 14, 90, 1, 2, 2)
  const waitSesi = await db.sesi.create({ data: wait })
  await db.sesi.update({
    where: { id: waitSesi.id },
    data: {
      checkInAt: new Date(wait.jamMulai.getTime() + 2 * 60000),
      checkOutAt: new Date(wait.jamMulai.getTime() + 30 * 60000), // checkout early
      status: STATUS_SESI.MENUNGGU_KONFIRMASI,
      confirmed: false,
      terlambatMenit: 2,
    },
  })

  // --- Notifikasi contoh ---
  for (const t of tutorRecords) {
    await db.notifikasi.create({
      data: {
        karyawanId: t.id,
        tipe: "JADWAL_BARU",
        judul: "Jadwal sesi baru",
        pesan: "Anda memiliki jadwal sesi baru. Silakan cek kalender Anda.",
      },
    })
  }

  console.log("Seed selesai.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
