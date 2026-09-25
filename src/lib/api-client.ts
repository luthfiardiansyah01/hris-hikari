// Client-side helpers for session and API calls.
import { USER_ROLE } from "@/lib/constants"

const SESSION_KEY = "hris-session"
const STORAGE_KEY = "acting-karyawan-id"

export type HrisSession = {
  id: string
  email: string
  nama: string
  role: "ADMIN" | "KARYAWAN"
  karyawanId: string | null
  tipe: "FIXED" | "FLEXIBLE" | null
}

export function getSession(): HrisSession | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as HrisSession) : null
  } catch {
    return null
  }
}

export function saveSession(s: HrisSession) {
  if (typeof window === "undefined") return
  localStorage.setItem(SESSION_KEY, JSON.stringify(s))
  // keep legacy key in sync
  localStorage.setItem(STORAGE_KEY, s.role === "ADMIN" ? "admin" : (s.karyawanId ?? "admin"))
  window.dispatchEvent(new Event("acting-user-change"))
}

export function clearSession() {
  if (typeof window === "undefined") return
  localStorage.removeItem(SESSION_KEY)
  localStorage.setItem(STORAGE_KEY, "admin")
  window.dispatchEvent(new Event("acting-user-change"))
}

export function getActingKaryawanId(): string {
  if (typeof window === "undefined") return "admin"
  const s = getSession()
  if (!s) return "admin"
  return s.role === "ADMIN" ? "admin" : (s.karyawanId ?? "admin")
}

export function setActingKaryawanId(id: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, id)
    window.dispatchEvent(new Event("acting-user-change"))
  }
}

// Wraps fetch to attach the acting-user header.
export async function apiFetch<T = unknown>(
  input: string,
  init: RequestInit = {},
): Promise<T> {
  const id = getActingKaryawanId()
  const headers = new Headers(init.headers)
  headers.set("x-acting-karyawan-id", id)
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  const res = await fetch(input, { ...init, headers })
  if (!res.ok) {
    let msg = `Request gagal (${res.status})`
    try {
      const data = await res.json()
      msg = data.error || msg
    } catch {
      // ignore
    }
    throw new Error(msg)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export function getRoleLabel(role: string): string {
  if (role === USER_ROLE.ADMIN) return "Administrator"
  return "Karyawan"
}
