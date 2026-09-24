# Work Record — Task ID: 7 / Agent: subagent-jadwal

Task: Build Penjadwalan sesi view (daily/weekly calendar + conflict detection + reschedule/cancel).

## Plan
- File: `/home/z/my-project/src/components/views/jadwal-view.tsx`
- Export: `JadwalView`
- Inline sub-components: JadwalView, DailyView, SesiRow, WeeklyView, SesiFormDialog, CancelDialog, RescheduleDialog
- Inline helpers: startOfDay, shiftDays, getWeekRange, weekDays, toIsoDateTime, toDateKey, timeFromDate
- Use apiFetch + TanStack Query + sonner toast
- Mobile-first responsive (weekly view horizontal-scrolls on mobile)

## Implementation Notes
- Read API contracts from /api/sesi/route.ts (GET supports `tanggal` or `dari`/`sampai`; POST returns 400 with "Bentrok ... Tutor tersedia: ..." message), /api/sesi/[id]/cancel/route.ts (POST body `{ assignReplacementTo?: string }`, returns `{ cancelled, replacement }`), and /api/sesi/[id]/reschedule/route.ts (POST empty body -> `{ suggestedSlots, alternativeTutors }`; POST with `{ newJamMulai, newJamSelesai, newTutorId? }` -> `{ rescheduled }` or `{ conflict, alternativeTutors }`).
- Conflict errors surface via `apiFetch` (throws Error with API message) → mutation `onError` shows `toast.error(e.message)`. For manual reschedule attempts that hit a non-`rescheduled` response with `alternativeTutors`, we additionally show tutor names in the toast.
- Weekly query uses `dari` + `sampai` (Monday–Sunday) and groups sessions by date key for column rendering. Clicking any day column switches to daily view of that date.
- Date math kept local to client (no date-fns dependency) — `new Date(\`${dateKey}T${time}:00\`).toISOString()` builds full ISO datetimes as required.
- Honor preview uses `hitungHonorSesi(mulai, selesai, tarifPerJam)` from `@/lib/schedule`.
- CancelDialog uses AlertDialog with a checkbox to reveal a Select of other AKTIF FLEXIBLE tutors; posts `{ assignReplacementTo: id | null }`.
- RescheduleDialog fetches suggestions on open via POST with empty body, renders clickable suggestion slots (one click applies) + alternative tutor chips (one click reassigns at same time) + manual override form (date picker + time + optional new tutor).
- Status badges, colored left-bar per program.warna, dropdown action menu per row, sticky accessible markup.

## Status
- COMPLETED. `bun run lint` and `bunx tsc --noEmit` clean for jadwal-view.tsx (remaining project errors live in tutor-portal-view.tsx and prisma/seed.ts, owned by other tasks).
